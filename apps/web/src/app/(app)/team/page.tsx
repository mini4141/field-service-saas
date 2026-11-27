"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge, Button, Card, Input, Select } from "@fss/ui";
import { api, unwrap } from "@/lib/api";

export default function TeamPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", role: "field" as "office" | "field" });
  const [inviteLink, setInviteLink] = useState("");
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: async () => unwrap(await api.GET("/api/v1/users", { params: { query: {} } })) });
  const invite = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/auth/invite", { body: form })),
    onSuccess: (r) => {
      setInviteLink(`${window.location.origin}/accept-invite?token=${r.inviteToken}`);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return (
    <div>
      <h1>Team</h1>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <Card title="Members" style={{ flex: 2 }}>
          {users?.map((u) => (
            <div key={u.id} style={{ padding: "8px 0", borderTop: "1px solid #e2e8f0" }}>
              {u.name} <Badge>{u.role}</Badge> {u.inviteToken && <Badge tone="warn">invited</Badge>}
            </div>
          ))}
        </Card>
        <Card title="Invite" style={{ flex: 1 }}>
          <form onSubmit={(e) => { e.preventDefault(); invite.mutate(); }}>
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "office" | "field" })}>
              <option value="field">field</option>
              <option value="office">office</option>
            </Select>
            <Button type="submit">Create invite</Button>
          </form>
          {inviteLink && <p data-testid="invite-link" style={{ wordBreak: "break-all" }}>Invite link: <a href={inviteLink}>{inviteLink}</a></p>}
        </Card>
      </div>
    </div>
  );
}
