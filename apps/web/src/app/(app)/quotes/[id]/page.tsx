"use client";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, yen } from "@fss/ui";
import { api, unwrap } from "@/lib/api";

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: q } = useQuery({
    queryKey: ["quote", id],
    queryFn: async () => unwrap(await api.GET("/api/v1/quotes/{id}", { params: { path: { id } } })),
  });
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/quotes/{id}/send", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote", id] }),
  });
  if (!q) return <p>Loading…</p>;
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/q/${q.token}`;

  return (
    <div>
      <h1>{q.title} <Badge tone="primary">{q.status}</Badge></h1>
      <Card title={`Customer: ${q.customer?.name ?? ""}`}>
        {q.items?.map((i) => (
          <div key={i.id}>{i.description} × {i.qty} @ {yen(i.unitPrice)} (tax {i.taxPercent}%)</div>
        ))}
        <p style={{ fontSize: 20, fontWeight: 700 }}>Total: {yen(q.total)}</p>
        {q.status === "draft" && <Button onClick={() => send.mutate()}>Send to customer</Button>}
        {q.status !== "draft" && (
          <p>Public link: <a data-testid="public-link" href={link}>{link}</a></p>
        )}
      </Card>
    </div>
  );
}
