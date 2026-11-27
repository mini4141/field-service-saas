import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export const theme = {
  primary: "#2563eb",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  bg: "#f8fafc",
  ok: "#16a34a",
  warn: "#d97706",
};

export const yen = (n: number) => `¥${n.toLocaleString("en-US")}`;

export function Button({ variant = "primary", style, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base: CSSProperties = {
    padding: "8px 14px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14,
    border: variant === "primary" ? "none" : `1px solid ${theme.line}`,
    background: variant === "primary" ? theme.primary : "#fff",
    color: variant === "primary" ? "#fff" : theme.ink,
  };
  return <button {...p} style={{ ...base, ...style }} />;
}

export function Card({ title, children, style }: { title?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ background: "#fff", border: `1px solid ${theme.line}`, borderRadius: 12, padding: 16, ...style }}>
      {title && <h3 style={{ margin: "0 0 12px", fontSize: 15, color: theme.muted, fontWeight: 600 }}>{title}</h3>}
      {children}
    </section>
  );
}

export function Tile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div data-testid={`tile-${label}`} style={{ background: "#fff", border: `1px solid ${theme.line}`, borderRadius: 12, padding: 16, minWidth: 180 }}>
      <div style={{ fontSize: 13, color: theme.muted }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, margin: "4px 0" }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: theme.muted }}>{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "ok" | "warn" | "primary" }) {
  const color = { muted: theme.muted, ok: theme.ok, warn: theme.warn, primary: theme.primary }[tone];
  return <span style={{ color, border: `1px solid ${color}`, borderRadius: 999, padding: "1px 8px", fontSize: 12 }}>{children}</span>;
}

const field: CSSProperties = { padding: "8px 10px", border: `1px solid ${theme.line}`, borderRadius: 8, fontSize: 14, width: "100%", boxSizing: "border-box" };

export function Input({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label style={{ display: "block", marginBottom: 10, fontSize: 13, color: theme.muted }}>
      {label}
      <input {...p} style={{ ...field, marginTop: 4 }} />
    </label>
  );
}

export function Select({ label, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label style={{ display: "block", marginBottom: 10, fontSize: 13, color: theme.muted }}>
      {label}
      <select {...p} style={{ ...field, marginTop: 4 }}>{children}</select>
    </label>
  );
}
