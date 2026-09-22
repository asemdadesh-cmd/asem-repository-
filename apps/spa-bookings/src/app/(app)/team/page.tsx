import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMyName } from "@/lib/identity";
import type { DutyShift, StaffMember } from "@/lib/types";
import { addDays, formatDayShort, isToday, londonDateKey } from "@/lib/time";
import { Card, SectionHeading } from "@/components/ui";
import { DutyRota } from "./duty-rota";
import { StaffList } from "./staff-list";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

const ROTA_DAYS = 7;

export default async function TeamPage() {
  const supabase = await createClient();
  const myName = await getMyName();

  const today = londonDateKey();
  const days = Array.from({ length: ROTA_DAYS }, (_, i) => addDays(today, i));

  const [{ data: shifts }, { data: staff }] = await Promise.all([
    supabase
      .from("duty_shifts")
      .select("id, duty_date, staff_name, created_at")
      .gte("duty_date", today)
      .lte("duty_date", days[days.length - 1])
      .returns<DutyShift[]>(),
    supabase
      .from("staff_members")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name")
      .returns<StaffMember[]>(),
  ]);

  const shiftByDate = new Map((shifts ?? []).map((s) => [s.duty_date, s]));
  const activeNames = (staff ?? []).filter((p) => p.is_active).map((p) => p.name);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-text">Team</h1>

      <section aria-labelledby="rota-heading">
        <SectionHeading>
          <span id="rota-heading">Spa duty — next 7 days</span>
        </SectionHeading>
        <p className="-mt-1 mb-3 text-xs text-text-subtle">
          Whoever is on duty gets the &ldquo;switch the spa on&rdquo; reminder an hour
          before each booking. If nobody is picked, every phone gets it.
        </p>
        <Card className="divide-y divide-border">
          {days.map((date) => (
            <DutyRota
              key={date}
              date={date}
              label={isToday(date) ? "Today" : formatDayShort(date)}
              current={shiftByDate.get(date)?.staff_name ?? null}
              names={activeNames}
              myName={myName}
            />
          ))}
        </Card>
      </section>

      <section aria-labelledby="staff-heading">
        <SectionHeading>
          <span id="staff-heading">Staff</span>
        </SectionHeading>
        <StaffList staff={staff ?? []} />
      </section>
    </div>
  );
}
