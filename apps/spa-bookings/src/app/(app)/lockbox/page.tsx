import type { Metadata } from "next";
import { requireSession, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LockboxCodeWithAuthor } from "@/lib/types";
import { formatDayShort, formatTime, londonDateKey, relativeToNow } from "@/lib/time";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { CurrentCode } from "./current-code";
import { ChangeCodeForm } from "./change-code-form";
import { HistoryIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Lockbox" };
export const dynamic = "force-dynamic";

export default async function LockboxPage() {
  const { profile } = await requireSession();
  const supabase = await createClient();
  const isAdmin = profile.role === "admin";

  const { data: current } = await supabase
    .rpc("current_lockbox_code")
    .maybeSingle<{ code: string; changed_at: string }>();

  // Full history is admin-only at the database level, not just hidden in the UI.
  const { data: history } = isAdmin
    ? await supabase
        .from("lockbox_codes")
        .select("*, changed_by_profile:profiles!lockbox_codes_changed_by_fkey(id, full_name, email)")
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<LockboxCodeWithAuthor[]>()
    : { data: null };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-text">Lockbox</h1>

      {current?.code ? (
        <CurrentCode code={current.code} changedAt={current.changed_at} />
      ) : (
        <EmptyState
          title="No code set yet"
          description={
            isAdmin
              ? "Set the current lockbox code below so the team can see it."
              : "An admin needs to set the lockbox code."
          }
        />
      )}

      {isAdmin && (
        <section aria-labelledby="change-heading">
          <SectionHeading>
            <span id="change-heading">Rotate the code</span>
          </SectionHeading>
          <ChangeCodeForm />
        </section>
      )}

      {isAdmin && (
        <section aria-labelledby="history-heading">
          <SectionHeading>
            <span id="history-heading">Change history</span>
          </SectionHeading>

          {!history?.length ? (
            <EmptyState
              title="Nothing recorded yet"
              description="Every change to the code is logged here with who made it and when."
            />
          ) : (
            <Card className="divide-y divide-border">
              {history.map((entry, index) => (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-text-subtle"
                  >
                    <HistoryIcon width={16} height={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-mono font-semibold tracking-[0.15em] text-text">
                        {entry.code}
                      </span>
                      {index === 0 && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Set by {displayName(entry.changed_by_profile)} ·{" "}
                      {formatDayShort(londonDateKey(entry.created_at))} {formatTime(entry.created_at)}{" "}
                      ({relativeToNow(entry.created_at)})
                    </p>
                    {entry.note && (
                      <p className="mt-1 text-xs italic text-text-subtle">{entry.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>
      )}

      {!isAdmin && (
        <p className="text-xs text-text-subtle">
          Only admins can change the code or see its history.
        </p>
      )}
    </div>
  );
}
