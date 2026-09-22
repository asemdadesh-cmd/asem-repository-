import type { Metadata } from "next";
import { requireSession, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DutyShiftWithProfile, Profile, StaffInvite } from "@/lib/types";
import { addDays, formatDayShort, isToday, londonDateKey } from "@/lib/time";
import { Badge, Card, EmptyState, SectionHeading } from "@/components/ui";
import { DutyRota } from "./duty-rota";
import { InviteForm } from "./invite-form";
import { StaffRow } from "./staff-row";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

const ROTA_DAYS = 7;

export default async function TeamPage() {
  const session = await requireSession();
  const isAdmin = session.profile.role === "admin";
  const supabase = await createClient();

  const today = londonDateKey();
  const days = Array.from({ length: ROTA_DAYS }, (_, i) => addDays(today, i));

  const [{ data: shifts }, { data: staff }, invitesResult] = await Promise.all([
    supabase
      .from("duty_shifts")
      .select("*, profile:profiles!duty_shifts_user_id_fkey(id, full_name, email, phone)")
      .gte("duty_date", today)
      .lte("duty_date", days[days.length - 1])
      .returns<DutyShiftWithProfile[]>(),
    supabase
      .from("profiles")
      .select("*")
      .order("is_active", { ascending: false })
      .order("full_name", { ascending: true })
      .returns<Profile[]>(),
    isAdmin
      ? supabase
          .from("staff_invites")
          .select("*")
          .is("claimed_at", null)
          .order("created_at", { ascending: false })
          .returns<StaffInvite[]>()
      : Promise.resolve({ data: null }),
  ]);

  const shiftByDate = new Map((shifts ?? []).map((s) => [s.duty_date, s]));
  const activeStaff = (staff ?? []).filter((p) => p.is_active);
  const pendingInvites = invitesResult.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-text">Team</h1>

      <section aria-labelledby="rota-heading">
        <SectionHeading>
          <span id="rota-heading">Spa duty — next 7 days</span>
        </SectionHeading>
        <p className="-mt-1 mb-3 text-xs text-text-subtle">
          Whoever is on duty gets the &ldquo;switch the spa on&rdquo; reminder an hour before
          each confirmed booking. With nobody on duty, the whole team is notified.
        </p>

        <Card className="divide-y divide-border">
          {days.map((date) => (
            <DutyRota
              key={date}
              date={date}
              label={isToday(date) ? "Today" : formatDayShort(date)}
              shift={shiftByDate.get(date) ?? null}
              staff={activeStaff}
              currentUserId={session.userId}
              isAdmin={isAdmin}
            />
          ))}
        </Card>
      </section>

      <section aria-labelledby="staff-heading">
        <SectionHeading
          trailing={
            <span className="text-xs text-text-subtle">
              {activeStaff.length} active
            </span>
          }
        >
          <span id="staff-heading">Staff</span>
        </SectionHeading>

        {!staff?.length ? (
          <EmptyState title="No staff yet" description="Invite your team to get started." />
        ) : (
          <Card className="divide-y divide-border">
            {staff.map((person) => (
              <StaffRow
                key={person.id}
                person={person}
                isAdmin={isAdmin}
                isSelf={person.id === session.userId}
              />
            ))}
          </Card>
        )}
      </section>

      {isAdmin && (
        <section aria-labelledby="invite-heading">
          <SectionHeading>
            <span id="invite-heading">Invite someone</span>
          </SectionHeading>
          <InviteForm />

          {pendingInvites.length > 0 && (
            <Card className="mt-3 divide-y divide-border">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.email}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {invite.full_name || invite.email}
                    </p>
                    {invite.full_name && (
                      <p className="truncate text-xs text-text-subtle">{invite.email}</p>
                    )}
                  </div>
                  <Badge tone="warn">Invited</Badge>
                </div>
              ))}
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
