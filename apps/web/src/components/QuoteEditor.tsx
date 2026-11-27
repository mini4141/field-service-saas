"use client";
import { useState } from "react";
import { Button, Input, yen } from "@fss/ui";
import { quoteTotal } from "@fss/shared/dist/quote-total";

export interface EditorItem { description: string; qty: number; unitPrice: number; taxPercent: number }

/** Line-item editor; the total shown here is a preview, the API recomputes it server-side. */
export function QuoteEditor({ initial, onSubmit }: { initial?: EditorItem[]; onSubmit?: (items: EditorItem[]) => void }) {
  const [items, setItems] = useState<EditorItem[]>(initial ?? [{ description: "", qty: 1, unitPrice: 0, taxPercent: 10 }]);
  const update = (i: number, patch: Partial<EditorItem>) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1.5fr 1fr", gap: 8 }}>
          <Input label="Description" value={it.description} onChange={(e) => update(i, { description: e.target.value })} />
          <Input label="Qty" type="number" min={1} value={it.qty} onChange={(e) => update(i, { qty: num(e.target.value) })} />
          <Input label="Unit price (¥)" type="number" min={0} value={it.unitPrice} onChange={(e) => update(i, { unitPrice: num(e.target.value) })} />
          <Input label="Tax %" type="number" min={0} value={it.taxPercent} onChange={(e) => update(i, { taxPercent: num(e.target.value) })} />
        </div>
      ))}
      <Button variant="ghost" type="button" onClick={() => setItems([...items, { description: "", qty: 1, unitPrice: 0, taxPercent: 10 }])}>
        + Add line
      </Button>
      <p style={{ fontSize: 20, fontWeight: 700 }} data-testid="quote-total">Total: {yen(quoteTotal(items))}</p>
      {onSubmit && <Button type="button" onClick={() => onSubmit(items)}>Save quote</Button>}
    </div>
  );
}
