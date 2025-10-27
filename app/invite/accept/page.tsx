// app/invite/accept/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [message, setMessage] = useState("Validating invite...");

  useEffect(() => {
    if (!token) return;

    fetch(`/api/invite/accept?token=${token}`, { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.success) setMessage("Invite accepted! Redirecting...");
        else setMessage(data.error || "Invite invalid or expired.");
      })
      .catch(() => setMessage("Error processing invite."));
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-semibold">{message}</h2>
    </div>
  );
}
