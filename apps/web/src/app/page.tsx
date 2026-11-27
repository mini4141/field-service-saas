"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getUser } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const u = getUser();
    router.replace(!u ? "/login" : u.role === "owner" ? "/dashboard" : u.role === "office" ? "/quotes" : "/jobs");
  }, [router]);
  return null;
}
