"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Card, yen } from "@fss/ui";
import { api, unwrap } from "@/lib/api";

export default function QuotesPage() {
  const { data } = useQuery({ queryKey: ["quotes"], queryFn: async () => unwrap(await api.GET("/api/v1/quotes")) });
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Quotes</h1>
        <Link href="/quotes/new"><Button>New quote</Button></Link>
      </div>
      <Card>
        {data?.map((q) => (
          <div key={q.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #e2e8f0" }}>
            <Link href={`/quotes/${q.id}`}>{q.title}</Link>
            <span>{q.customer?.name} · {yen(q.total)} <Badge tone={q.status === "accepted" ? "ok" : "primary"}>{q.status}</Badge></span>
          </div>
        ))}
        {data?.length === 0 && <p>No quotes yet.</p>}
      </Card>
    </div>
  );
}
