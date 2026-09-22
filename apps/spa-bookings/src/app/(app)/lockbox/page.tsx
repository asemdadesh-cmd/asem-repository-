import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { LockboxCode } from "@/lib/types";
import { formatDayShort, formatTime, londonDateKey, relativeToNow } from "@/lib/time";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { CurrentCode } from "./current-code";
import { ChangeCodeForm } from "./change-code-form";
import { HistoryIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Lockbox" };
export const dynamic = "force-dynamic";

export default async function LockboxPage() {
  const supabase = await createClient();

  const [{ data: current }, { data: history }] = await Promise.all([
    supabase.rpc("current_lockbox_code").maybeSingle<{ code: string; changed_at: string }>(),
    supabase
      .from("lockbox_codes")
      .select("id, code, note, changed_by_name, created_at")
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<LockboxCode[]>(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-text">Lockbox</h1>

      {current?.code ? (
        <CurrentCode code={current.code} changedAt={current.changed_at} />
      ) : (
        <EmptyState
          title="No code saved yet"
          description="Tap the button below to put in the code that's on the lockbox now."
        />
      )}

      <ChangeCodeForm />
      <p className="px-1 text-center text-sm text-text-muted">
        Changed the code on the lockbox? Put the new one in here so everyone can see it.
      </p>

      {history && history.length > 0 && (
        <section aria-labelledby="history-heading" className="pt-2">
          <SectionHeading>
            <span id="history-heading">Who changed it</span>
          </SectionHeading>
          <Card className="divide-y divide-border">
            {history.map((entry, index) => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3.5">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-text-subtle">
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
                    {entry.changed_by_name ?? "Someone"} ·{" "}
                    {formatDayShort(londonDateKey(entry.created_at))}{" "}
                    {formatTime(entry.created_at)} ({relativeToNow(entry.created_at)})
                  </p>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
