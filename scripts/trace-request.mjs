// Drives one job completion with a fixed x-request-id, then prints every api/worker log line carrying that id.
// Usage: node scripts/trace-request.mjs <apiBase> <apiLog> <workerLog>   (log paths are local files)
import { readFileSync } from "node:fs";

const [api = "http://localhost:4000", apiLog, workerLog] = process.argv.slice(2);
const rid = `trace-${Date.now().toString(36)}`;
const tag = Date.now().toString(36);

async function call(method, path, token, body, headers = {}) {
  const res = await fetch(`${api}/api/v1${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
  return res.json();
}

const owner = await call("POST", "/auth/signup", null, { companyName: `Trace Co ${tag}`, name: "Owner", email: `trace-${tag}@e2e.test`, password: "password123" });
const inv = await call("POST", "/auth/invite", owner.accessToken, { name: "Ken", email: `ken-trace-${tag}@e2e.test`, role: "field" });
const ken = await call("POST", "/auth/accept-invite", null, { token: inv.inviteToken, password: "password123" });
const customer = await call("POST", "/customers", owner.accessToken, { name: "Trace Customer", email: "customer@example.test" });
const quote = await call("POST", "/quotes", owner.accessToken, { customerId: customer.id, title: "Trace job", items: [{ description: "Work", qty: 1, unitPrice: 45000, taxPercent: 0 }] });
await call("POST", `/quotes/${quote.id}/send`, owner.accessToken);
await call("POST", `/public/quotes/${quote.token}/accept`);
const [job] = await call("GET", "/jobs", owner.accessToken);
await call("PATCH", `/jobs/${job.id}/schedule`, owner.accessToken, { scheduledAt: new Date().toISOString(), assigneeId: inv.user.id });

// the request under trace: field user completes the job (web/mobile client would send this header)
await call("POST", `/jobs/${job.id}/complete`, ken.accessToken, { notes: "trace" }, { "x-request-id": rid });
await new Promise((r) => setTimeout(r, 6000)); // worker renders the PDF + sends the notification

const lines = [`# request id ${rid}: client -> api -> worker (invoice-pdf) -> worker (notifications)`];
for (const [name, file] of [["api", apiLog], ["worker", workerLog]]) {
  for (const l of readFileSync(file, "utf8").split("\n")) if (l.includes(rid)) lines.push(`[${name}] ${l}`);
}
console.log(lines.join("\n"));
if (lines.length < 4) process.exit(1);
