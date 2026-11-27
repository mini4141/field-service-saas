"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge, Button, Card, yen } from "@fss/ui";
import { api, unwrap } from "@/lib/api";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [pdfUrl, setPdfUrl] = useState("");
  const { data: inv } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => unwrap(await api.GET("/api/v1/invoices/{id}", { params: { path: { id } } })),
    refetchInterval: (q) => (q.state.data?.status === "ready" ? false : 2000),
  });
  if (!inv) return <p>Loading…</p>;

  async function download() {
    const r = unwrap(await api.GET("/api/v1/invoices/{id}/download", { params: { path: { id } } }));
    setPdfUrl(r.url);
  }

  return (
    <div>
      <h1>Invoice {inv.id.slice(0, 8).toUpperCase()} <Badge tone={inv.status === "ready" ? "ok" : "warn"}>{inv.status}</Badge></h1>
      <Card>
        <p style={{ fontSize: 24, fontWeight: 700 }}>{yen(inv.total)}</p>
        {inv.status === "ready" ? <Button onClick={download}>Download PDF</Button> : <p>PDF is being generated…</p>}
        {pdfUrl && (
          <div>
            <p><a data-testid="pdf-link" href={pdfUrl} target="_blank" rel="noreferrer">Open PDF</a></p>
            <iframe title="invoice pdf" src={pdfUrl} style={{ width: "100%", height: 520, border: "1px solid #e2e8f0" }} />
          </div>
        )}
      </Card>
    </div>
  );
}
