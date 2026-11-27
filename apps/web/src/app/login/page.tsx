"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input } from "@fss/ui";
import { api, saveSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await api.POST("/api/v1/auth/login", { body: { email, password } });
    if (!data) return setError("Invalid credentials");
    saveSession(data.accessToken, data.user);
    router.push(data.user.role === "owner" ? "/dashboard" : data.user.role === "office" ? "/quotes" : "/jobs");
  }

  return (
    <main style={{ maxWidth: 380, margin: "80px auto" }}>
      <Card title="Sign in">
        <form onSubmit={submit}>
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p style={{ color: "#dc2626" }}>{error}</p>}
          <Button type="submit">Sign in</Button>
        </form>
        <p style={{ fontSize: 13 }}>New company? <Link href="/signup">Sign up</Link></p>
      </Card>
    </main>
  );
}
