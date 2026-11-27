"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, Select } from "@fss/ui";
import { api, unwrap } from "@/lib/api";

const HOURS = [8, 9, 10, 11, 13, 14, 15, 16];
const DAY_MS = 86_400_000;

const startOfWeek = (d: Date) => {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday
  return s;
};

/** Week calendar: drag an unscheduled job onto a day/hour cell to schedule it for the selected field user. */
export default function SchedulePage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [assigneeId, setAssigneeId] = useState("");
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS));

  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: async () => unwrap(await api.GET("/api/v1/jobs", { params: { query: {} } })) });
  const { data: staff } = useQuery({ queryKey: ["users", "field"], queryFn: async () => unwrap(await api.GET("/api/v1/users", { params: { query: { role: "field" } } })) });
  const who = assigneeId || staff?.[0]?.id || "";

  const schedule = useMutation({
    mutationFn: async (v: { id: string; at: Date }) =>
      unwrap(await api.PATCH("/api/v1/jobs/{id}/schedule", { params: { path: { id: v.id } }, body: { scheduledAt: v.at.toISOString(), assigneeId: who } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const unscheduled = jobs?.filter((j) => j.status === "unscheduled") ?? [];
  const inCell = (day: Date, hour: number) =>
    jobs?.filter((j) => {
      if (!j.scheduledAt) return false;
      const d = new Date(j.scheduledAt);
      return d.toDateString() === day.toDateString() && d.getHours() === hour;
    }) ?? [];

  const drop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const at = new Date(day);
    at.setHours(hour, 0, 0, 0);
    if (id && who) schedule.mutate({ id, at });
  };

  return (
    <div>
      <h1>Schedule</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <Select label="Assign to" value={who} onChange={(e) => setAssigneeId(e.target.value)}>
          {staff?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Button variant="ghost" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * DAY_MS))}>← Prev</Button>
        <Button variant="ghost" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * DAY_MS))}>Next →</Button>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <Card title="Unscheduled" style={{ width: 220 }}>
          {unscheduled.map((j) => (
            <div key={j.id} draggable data-testid={`job-${j.title}`} onDragStart={(e) => e.dataTransfer.setData("text/plain", j.id)}
              style={{ padding: 8, margin: "6px 0", border: "1px dashed #94a3b8", borderRadius: 8, cursor: "grab", background: "#fff" }}>
              {j.title}
            </div>
          ))}
          {unscheduled.length === 0 && <p style={{ color: "#64748b" }}>Nothing to schedule</p>}
        </Card>
        <table style={{ borderCollapse: "collapse", flex: 1, background: "#fff" }} data-testid="calendar">
          <thead>
            <tr><th />{days.map((d) => <th key={d.toISOString()} style={{ border: "1px solid #e2e8f0", padding: 6 }}>{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</th>)}</tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h}>
                <td style={{ padding: 6, color: "#64748b" }}>{h}:00</td>
                {days.map((d) => (
                  <td key={d.toISOString()} data-testid={`cell-${d.getDay()}-${h}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e, d, h)}
                    style={{ border: "1px solid #e2e8f0", height: 44, minWidth: 90, verticalAlign: "top" }}>
                    {inCell(d, h).map((j) => <div key={j.id} style={{ background: "#dbeafe", borderRadius: 6, padding: "2px 6px", fontSize: 12 }}>{j.title}</div>)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
