"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { CheckIcon, SpinnerIcon } from "@/components/icons";

type Status = "idle" | "sending" | "sent" | "error";

const FRIENDLY_ERRORS: Record<string, string> = {
  "Signups not allowed for otp":
    "That email hasn't been invited yet. Ask an admin to add you.",
  "Email rate limit exceeded":
    "Too many sign-in emails just went out. Wait a minute and try again.",
};

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(initialError ? "error" : "idle");
  const [message, setMessage] = useState(initialError ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setStatus("sending");
    setMessage("");

    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      if (next) redirectTo.searchParams.set("next", next);

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          // Accounts are created by an admin invite, never by signing in.
          shouldCreateUser: false,
          emailRedirectTo: redirectTo.toString(),
        },
      });

      if (error) {
        setStatus("error");
        setMessage(FRIENDLY_ERRORS[error.message] ?? error.message);
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  if (status === "sent") {
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg">
          <CheckIcon width={24} height={24} />
        </div>
        <h2 className="mt-4 text-base font-semibold text-text">Check your email</h2>
        <p className="mt-2 text-sm text-text-muted">
          We sent a sign-in link to <span className="font-medium text-text">{email}</span>.
          Open it on this phone to stay signed in here.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-5"
          onClick={() => {
            setStatus("idle");
            setMessage("");
          }}
        >
          Use a different email
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          label="Work email"
          htmlFor="email"
          hint="We'll send a one-tap sign-in link. No password needed."
        >
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={status === "error" ? "login-error" : "email-hint"}
            aria-invalid={status === "error"}
          />
        </Field>

        {status === "error" && message && (
          <div id="login-error">
            <Alert>{message}</Alert>
          </div>
        )}

        <Button type="submit" size="lg" block disabled={status === "sending"}>
          {status === "sending" ? (
            <>
              <SpinnerIcon width={18} height={18} />
              Sending link…
            </>
          ) : (
            "Email me a sign-in link"
          )}
        </Button>
      </form>
    </Card>
  );
}
