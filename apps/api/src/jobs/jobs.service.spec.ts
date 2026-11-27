import { JobsService } from "./jobs.service";

describe("JobsService", () => {
  it("scheduling assigns the field user and marks the job scheduled", async () => {
    const update = jest.fn(async ({ data }) => ({ id: "j1", ...data }));
    const prisma: any = {
      db: {
        job: { findUnique: async () => ({ id: "j1" }), update },
        user: { findUnique: async () => ({ id: "u-ken", role: "field" }) },
      },
    };
    const service = new JobsService(prisma, {} as any, {} as any);

    const job = await service.schedule("j1", { scheduledAt: "2026-12-01T09:00:00.000Z", assigneeId: "u-ken" });

    expect(job).toMatchObject({ status: "scheduled", assigneeId: "u-ken" });
  });
});
