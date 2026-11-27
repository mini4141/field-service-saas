"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input } from "@fss/ui";
import { api, saveSession } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await api.POST("/api/v1/auth/signup", { body: form });
    if (!data) return setError("Could not sign up (email may already be registered)");
    saveSession(data.accessToken, data.user);
    router.push("/dashboard");
  }

  return (
    <main style={{ maxWidth: 380, margin: "60px auto" }}>
      <Card title="Create your company">
        <form onSubmit={submit}>
          <Input label="Company name" value={form.companyName} onChange={set("companyName")} />
          <Input label="Your name" value={form.name} onChange={set("name")} />
          <Input label="Email" type="email" value={form.email} onChange={set("email")} />
          <Input label="Password (min 8)" type="password" value={form.password} onChange={set("password")} />
          {error && <p style={{ color: "#dc2626" }}>{error}</p>}
          <Button type="submit">Create account</Button>
        </form>
        <p style={{ fontSize: 13 }}>Already registered? <Link href="/login">Sign in</Link></p>
      </Card>
    </main>
  );
}
