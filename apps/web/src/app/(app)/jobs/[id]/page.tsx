"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card } from "@fss/ui";
import { api, unwrap } from "@/lib/api";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Poll so thumbnails (async Lambda) and the invoice (async worker) appear without a reload.
  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => unwrap(await api.GET("/api/v1/jobs/{id}", { params: { path: { id } } })),
    refetchInterval: 3000,
  });
  if (!job) return <p>Loading…</p>;

  return (
    <div>
      <h1>{job.title} <Badge tone={job.status === "completed" ? "ok" : "primary"}>{job.status}</Badge></h1>
      <Card title="Details">
        <div>Customer: {job.customer?.name}</div>
        <div>Address: {job.address ?? "–"}</div>
        <div>Notes: {job.notes ?? "–"}</div>
        {job.invoice && (
          <p>Invoice: <Link data-testid="invoice-link" href={`/invoices/${job.invoice.id}`}>{job.invoice.status}</Link></p>
        )}
      </Card>
      <Card title={`Photos (${job.photos?.length ?? 0})`} style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {job.photos?.map((p) => (
            p.thumbUrl
              ? <img key={p.id} data-testid="thumb" src={p.thumbUrl} alt="job photo thumbnail" width={160} style={{ borderRadius: 8 }} />
              : <div key={p.id} style={{ width: 160, height: 100, background: "#e2e8f0", borderRadius: 8, display: "grid", placeItems: "center", color: "#64748b" }}>thumbnail pending…</div>
          ))}
        </div>
      </Card>
    </div>
  );
}
