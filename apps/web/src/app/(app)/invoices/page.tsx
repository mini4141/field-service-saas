"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card, yen } from "@fss/ui";
import { api, unwrap } from "@/lib/api";

export default function InvoicesPage() {
  const { data } = useQuery({ queryKey: ["invoices"], queryFn: async () => unwrap(await api.GET("/api/v1/invoices")), refetchInterval: 5000 });
  return (
    <div>
      <h1>Invoices</h1>
      <Card>
        {data?.map((i) => (
          <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #e2e8f0" }}>
            <Link href={`/invoices/${i.id}`}>Invoice {i.id.slice(0, 8).toUpperCase()}</Link>
            <span>{yen(i.total)} <Badge tone={i.status === "ready" ? "ok" : "warn"}>{i.status}</Badge></span>
          </div>
        ))}
        {data?.length === 0 && <p>No invoices yet.</p>}
      </Card>
    </div>
  );
}
