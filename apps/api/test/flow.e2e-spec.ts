import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { Test } from "@nestjs/testing";
import { Queue } from "bullmq";
import { createHmac } from "node:crypto";
import request from "supertest";
import { QUEUES } from "@fss/shared";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/configure";

const uniq = () => Math.random().toString(36).slice(2, 8);

describe("API flow (signup -> quote -> accept -> job -> complete -> invoice queued)", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication({ rawBody: true });
    configureApp(app);
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  const signup = async (tag: string) => {
    const res = await http.post("/api/v1/auth/signup").send({
      companyName: `Co ${tag}`, name: "Owner", email: `owner-${tag}@test.dev`, password: "password123",
    }).expect(201);
    return res.body.accessToken as string;
  };

  it("runs the whole happy path and enqueues the invoice PDF job", async () => {
    const tag = uniq();
    const owner = await signup(tag);
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

    const invite = await http.post("/api/v1/auth/invite").set(auth(owner))
      .send({ name: "Ken", email: `ken-${tag}@test.dev`, role: "field" }).expect(201);
    const kenToken = (await http.post("/api/v1/auth/accept-invite")
      .send({ token: invite.body.inviteToken, password: "password123" }).expect(200)).body.accessToken;
    const kenId = invite.body.user.id;

    const customer = (await http.post("/api/v1/customers").set(auth(owner))
      .send({ name: "Yamada", address: "1-2-3 Shibuya, Tokyo" }).expect(201)).body;

    const quote = (await http.post("/api/v1/quotes").set(auth(owner)).send({
      customerId: customer.id, title: "Office cleaning",
      items: [
        { description: "Deep cleaning", qty: 1, unitPrice: 30000, taxPercent: 10 },
        { description: "Windows", qty: 2, unitPrice: 6000, taxPercent: 0 },
      ],
    }).expect(201)).body;
    expect(quote.total).toBe(45000);

    await http.post(`/api/v1/quotes/${quote.id}/send`).set(auth(owner)).expect(200);
    await http.post(`/api/v1/public/quotes/${quote.token}/accept`).expect(200);

    const jobs = (await http.get("/api/v1/jobs").set(auth(owner)).expect(200)).body;
    expect(jobs).toHaveLength(1);
    const jobId = jobs[0].id;
    expect(jobs[0].status).toBe("unscheduled");

    await http.patch(`/api/v1/jobs/${jobId}/schedule`).set(auth(owner))
      .send({ scheduledAt: new Date().toISOString(), assigneeId: kenId }).expect(200);

    const mine = (await http.get("/api/v1/jobs").set(auth(kenToken)).expect(200)).body;
    expect(mine.map((j: any) => j.id)).toContain(jobId);

    await http.post(`/api/v1/jobs/${jobId}/checkin`).set(auth(kenToken)).expect(200);
    const done = (await http.post(`/api/v1/jobs/${jobId}/complete`).set(auth(kenToken)).send({ notes: "All good" }).expect(200)).body;
    expect(done.invoice.total).toBe(45000);

    const queue = app.get<Queue>(getQueueToken(QUEUES.invoicePdf));
    const queued = await queue.getJobs(["waiting", "active", "delayed", "completed"]);
    expect(queued.some((j) => j.data.invoiceId === done.invoice.id)).toBe(true);

    await http.get("/api/v1/dashboard/kpis").set(auth(kenToken)).expect(403);
    const kpis = (await http.get("/api/v1/dashboard/kpis").set(auth(owner)).expect(200)).body;
    expect(kpis).toMatchObject({ quotesSent: 1, quotesAccepted: 1, revenueInvoiced: 45000 });
  });

  it("returns 404 for another tenant's records", async () => {
    const a = await signup(uniq());
    const b = await signup(uniq());
    const customer = (await http.post("/api/v1/customers").set({ Authorization: `Bearer ${a}` })
      .send({ name: "Private" }).expect(201)).body;

    await http.get(`/api/v1/customers/${customer.id}`).set({ Authorization: `Bearer ${b}` }).expect(404);
    await http.get(`/api/v1/customers/${customer.id}`).set({ Authorization: `Bearer ${a}` }).expect(200);
  });

  it("accepts the signed thumbnail webhook and exposes the thumbnail on the job", async () => {
    const owner = await signup(uniq());
    const auth = { Authorization: `Bearer ${owner}` };
    const customer = (await http.post("/api/v1/customers").set(auth).send({ name: "Thumb Co" }).expect(201)).body;
    const quote = (await http.post("/api/v1/quotes").set(auth).send({
      customerId: customer.id, title: "Photos", items: [{ description: "Work", qty: 1, unitPrice: 1000, taxPercent: 0 }],
    }).expect(201)).body;
    await http.post(`/api/v1/quotes/${quote.id}/send`).set(auth).expect(200);
    await http.post(`/api/v1/public/quotes/${quote.token}/accept`).expect(200);
    const jobId = (await http.get("/api/v1/jobs").set(auth).expect(200)).body[0].id;

    const { key } = (await http.post("/api/v1/uploads/presign").set(auth)
      .send({ jobId, filename: "a.png", contentType: "image/png" }).expect(200)).body;

    const body = JSON.stringify({ key, thumbKey: key.replace("photos/", "thumbs/") + ".jpg" });
    const sig = createHmac("sha256", process.env.INTERNAL_HMAC_SECRET ?? "dev-only-hmac").update(body).digest("hex");
    await http.post("/api/v1/internal/photos/thumbnail-ready").set({ "content-type": "application/json", "x-signature": sig }).send(body).expect(200);
    await http.post("/api/v1/internal/photos/thumbnail-ready").set({ "content-type": "application/json", "x-signature": "bad" }).send(body).expect(401);

    const job = (await http.get(`/api/v1/jobs/${jobId}`).set(auth).expect(200)).body;
    expect(job.photos[0].thumbUrl).toContain("thumbs/");
  });
});
