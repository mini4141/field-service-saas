"use client";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, Input, Select } from "@fss/ui";
import { api, unwrap } from "@/lib/api";
import { QuoteEditor, type EditorItem } from "@/components/QuoteEditor";

export default function NewQuotePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const { data: customers } = useQuery({ queryKey: ["customers", ""], queryFn: async () => unwrap(await api.GET("/api/v1/customers", { params: { query: {} } })) });

  async function save(items: EditorItem[]) {
    const { data } = await api.POST("/api/v1/quotes", { body: { customerId: customerId || customers?.[0]?.id || "", title, items } });
    if (data) router.push(`/quotes/${data.id}`);
  }

  return (
    <div>
      <h1>New quote</h1>
      <Card>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select label="Customer" value={customerId || customers?.[0]?.id || ""} onChange={(e) => setCustomerId(e.target.value)}>
          {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <QuoteEditor onSubmit={save} />
      </Card>
    </div>
  );
}
