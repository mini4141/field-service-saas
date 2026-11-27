/* Demo data: Sakura Cleaning with an owner, office and two field users. Safe to re-run. */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const db = new PrismaClient();
export const DEMO_QUOTE_TOKEN = "sakura-demo-quote";

async function main() {
  if (await db.user.findUnique({ where: { email: "owner@sakura.test" } })) {
    console.log("seed: demo data already present, skipping");
    return;
  }
  const passwordHash = await bcrypt.hash("password123", 10);
  const company = await db.company.create({ data: { name: "Sakura Cleaning" } });
  const companyId = company.id;

  await db.user.createMany({
    data: [
      { companyId, name: "Hana Sato", email: "owner@sakura.test", role: "owner", passwordHash },
      { companyId, name: "Mika Ito", email: "office@sakura.test", role: "office", passwordHash },
      { companyId, name: "Ken Watanabe", email: "ken@sakura.test", role: "field", passwordHash },
      { companyId, name: "Rin Kobayashi", email: "rin@sakura.test", role: "field", passwordHash },
    ],
  });

  const yamada = await db.customer.create({
    data: { companyId, name: "Yamada Trading Co.", email: "accounts@yamada.test", phone: "03-1234-5678", address: "1-2-3 Shibuya, Tokyo" },
  });
  const tanaka = await db.customer.create({
    data: { companyId, name: "Tanaka Residence", email: "tanaka@example.test", phone: "090-0000-1111", address: "4-5-6 Namba, Osaka" },
  });

  // Demo quote: JPY 45,000 = 30,000 + 10% tax + 2 x 6,000 (untaxed). Already sent, waiting for the customer to accept.
  await db.quote.create({
    data: {
      companyId, customerId: yamada.id, title: "Office deep clean", status: "sent", sentAt: new Date(), token: DEMO_QUOTE_TOKEN, total: 45000,
      items: {
        create: [
          { companyId, description: "Deep cleaning (floors, kitchen)", qty: 1, unitPrice: 30000, taxPercent: 10 },
          { companyId, description: "Window cleaning", qty: 2, unitPrice: 6000, taxPercent: 0 },
        ],
      },
    },
  });

  // An already-accepted quote so the schedule calendar has something to drag.
  const accepted = await db.quote.create({
    data: {
      companyId, customerId: tanaka.id, title: "Move-out cleaning", status: "accepted", sentAt: new Date(), acceptedAt: new Date(), total: 22000,
      items: { create: [{ companyId, description: "Move-out cleaning", qty: 1, unitPrice: 22000, taxPercent: 0 }] },
    },
  });
  await db.job.create({
    data: { companyId, quoteId: accepted.id, customerId: tanaka.id, title: "Move-out cleaning", address: tanaka.address, status: "unscheduled" },
  });

  console.log("seed: created Sakura Cleaning (owner@sakura.test / office@sakura.test / ken@sakura.test, password123)");
}

main().finally(() => db.$disconnect());
