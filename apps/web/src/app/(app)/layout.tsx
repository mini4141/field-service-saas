"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { clearSession, getUser, type SessionUser } from "@/lib/api";

const NAV: Record<SessionUser["role"], { href: string; label: string }[]> = {
  owner: [
    { href: "/dashboard", label: "Dashboard" }, { href: "/customers", label: "Customers" }, { href: "/quotes", label: "Quotes" },
    { href: "/schedule", label: "Schedule" }, { href: "/jobs", label: "Jobs" }, { href: "/invoices", label: "Invoices" }, { href: "/team", label: "Team" },
  ],
  office: [
    { href: "/customers", label: "Customers" }, { href: "/quotes", label: "Quotes" }, { href: "/schedule", label: "Schedule" },
    { href: "/jobs", label: "Jobs" }, { href: "/invoices", label: "Invoices" },
  ],
  field: [{ href: "/jobs", label: "My jobs" }],
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) router.replace("/login");
    else setUser(u);
  }, [router]);

  if (!user) return null;
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav aria-label="Main" style={{ width: 200, background: "#0f172a", color: "#fff", padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Field Service</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }} data-testid="whoami">{user.name} · {user.role}</div>
        {NAV[user.role].map((n) => (
          <Link key={n.href} href={n.href} style={{ display: "block", padding: "8px 0", color: path.startsWith(n.href) ? "#93c5fd" : "#fff", textDecoration: "none" }}>
            {n.label}
          </Link>
        ))}
        <button onClick={() => { clearSession(); router.push("/login"); }} style={{ marginTop: 24, background: "none", color: "#cbd5e1", border: "none", cursor: "pointer", padding: 0 }}>
          Sign out
        </button>
      </nav>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
