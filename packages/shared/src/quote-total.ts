export interface LineItem { qty: number; unitPrice: number; taxPercent: number }

/** Total in whole yen: sum of qty * unitPrice plus per-line tax, rounded per line. */
export function quoteTotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + Math.round(i.qty * i.unitPrice * (1 + i.taxPercent / 100)), 0);
}
