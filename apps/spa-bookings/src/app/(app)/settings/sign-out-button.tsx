"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function SignOutButton() {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant="secondary" block onClick={() => setArmed(true)}>
        Sign out
      </Button>
    );
  }

  return (
    <form action="/auth/signout" method="post" className="flex gap-2">
      <Button type="submit" variant="danger" className="flex-1">
        Yes, sign out
      </Button>
      <Button variant="secondary" onClick={() => setArmed(false)}>
        Stay
      </Button>
    </form>
  );
}
