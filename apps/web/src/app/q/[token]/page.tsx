import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { createApiClient } from "@fss/api-client";
import { yen } from "@fss/ui";

export const dynamic = "force-dynamic";

const client = () => createApiClient({ baseUrl: process.env.API_INTERNAL_URL ?? "http://localhost:4000" });

/** Server action: the customer accepts the quote, which creates the job. */
async function accept(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  await client().POST("/api/v1/public/quotes/{token}/accept", { params: { path: { token } } });
  revalidatePath(`/q/${token}`);
}

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: q } = await client().GET("/api/v1/public/quotes/{token}", { params: { path: { token } } });
  if (!q) notFound();

  return (
    <main style={{ maxWidth: 560, margin: "60px auto", background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0" }}>
      <p style={{ color: "#64748b", margin: 0 }}>{q.companyName}</p>
      <h1 style={{ marginTop: 4 }}>{q.title}</h1>
      <p>Prepared for {q.customerName}</p>
      <ul>
        {q.items.map((i) => (
          <li key={i.id}>{i.description} × {i.qty} @ {yen(i.unitPrice)} (tax {i.taxPercent}%)</li>
        ))}
      </ul>
      <p style={{ fontSize: 24, fontWeight: 700 }}>Total: {yen(q.total)}</p>
      {q.status === "accepted" ? (
        <p data-testid="accepted" style={{ color: "#16a34a", fontWeight: 700 }}>✓ Quote accepted. We will schedule your job shortly.</p>
      ) : (
        <form action={accept}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" style={{ padding: "10px 18px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
            Accept quote
          </button>
        </form>
      )}
    </main>
  );
}
