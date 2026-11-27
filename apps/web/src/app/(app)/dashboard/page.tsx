"use client";
import { useQuery } from "@tanstack/react-query";
import { Tile, yen } from "@fss/ui";
import { api, unwrap } from "@/lib/api";

export default function DashboardPage() {
  const { data: k } = useQuery({
    queryKey: ["kpis"],
    queryFn: async () => unwrap(await api.GET("/api/v1/dashboard/kpis")),
    refetchInterval: 5000,
  });
  return (
    <div>
      <h1>Dashboard</h1>
      {!k ? <p>Loading…</p> : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Tile label="Quotes sent" value={k.quotesSent} />
          <Tile label="Quotes accepted" value={k.quotesAccepted} hint={`${k.conversionPercent}% conversion`} />
          <Tile label="Jobs completed (week)" value={k.jobsCompletedThisWeek} />
          <Tile label="Revenue invoiced" value={yen(k.revenueInvoiced)} />
          <Tile label="Avg completion → invoice" value={k.avgSecondsCompletionToInvoice === null ? "–" : `${k.avgSecondsCompletionToInvoice}s`} hint={k.cached ? "served from Redis cache" : "computed in SQL"} />
        </div>
      )}
    </div>
  );
}
