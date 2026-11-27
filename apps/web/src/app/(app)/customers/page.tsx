"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, Input } from "@fss/ui";
import { api, unwrap } from "@/lib/api";

export default function CustomersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const { data } = useQuery({
    queryKey: ["customers", q],
    queryFn: async () => unwrap(await api.GET("/api/v1/customers", { params: { query: { q: q || undefined } } })),
  });
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/customers", { body: { name: form.name, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined } })),
    onSuccess: () => { setForm({ name: "", email: "", phone: "", address: "" }); qc.invalidateQueries({ queryKey: ["customers"] }); },
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <h1>Customers</h1>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <Card title="Customers" style={{ flex: 2 }}>
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul style={{ listStyle: "none", padding: 0 }}>
            {data?.map((c) => (
              <li key={c.id} style={{ padding: "8px 0", borderTop: "1px solid #e2e8f0" }}>
                <strong>{c.name}</strong> <span style={{ color: "#64748b" }}>{c.address}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="New customer" style={{ flex: 1 }}>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <Input label="Name" value={form.name} onChange={set("name")} />
            <Input label="Email" value={form.email} onChange={set("email")} />
            <Input label="Phone" value={form.phone} onChange={set("phone")} />
            <Input label="Address" value={form.address} onChange={set("address")} />
            <Button type="submit">Add customer</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
