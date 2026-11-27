"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card } from "@fss/ui";
import { api, unwrap } from "@/lib/api";

export default function JobsPage() {
  const { data } = useQuery({ queryKey: ["jobs"], queryFn: async () => unwrap(await api.GET("/api/v1/jobs", { params: { query: {} } })) });
  return (
    <div>
      <h1>Jobs</h1>
      <Card>
        {data?.map((j) => (
          <div key={j.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #e2e8f0" }}>
            <Link href={`/jobs/${j.id}`}>{j.title}</Link>
            <span>{j.customer?.name} · {j.scheduledAt ? new Date(j.scheduledAt).toLocaleString() : "unscheduled"} <Badge tone={j.status === "completed" ? "ok" : "primary"}>{j.status}</Badge></span>
          </div>
        ))}
        {data?.length === 0 && <p>No jobs yet.</p>}
      </Card>
    </div>
  );
}
