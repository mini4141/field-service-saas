"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card, Input } from "@fss/ui";
import { api, saveSession } from "@/lib/api";

function AcceptInvite() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await api.POST("/api/v1/auth/accept-invite", { body: { token, password } });
    if (!data) return setError("Invalid or used invite");
    saveSession(data.accessToken, data.user);
    router.push(data.user.role === "field" ? "/jobs" : "/quotes");
  }

  return (
    <main style={{ maxWidth: 380, margin: "80px auto" }}>
      <Card title="Accept your invite">
        <form onSubmit={submit}>
          <Input label="Choose a password (min 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p style={{ color: "#dc2626" }}>{error}</p>}
          <Button type="submit">Join</Button>
        </form>
      </Card>
    </main>
  );
}

export default function Page() {
  return <Suspense><AcceptInvite /></Suspense>;
}
