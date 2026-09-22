import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMyName } from "@/lib/identity";
import { publicEnv } from "@/lib/env";
import type { Apartment } from "@/lib/types";
import { SectionHeading } from "@/components/ui";
import { NamePicker } from "@/components/name-picker";
import { NotificationSettings } from "./notification-settings";
import { ApartmentManager } from "./apartment-manager";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const myName = await getMyName();

  const [{ data: apartments }, { data: staff }] = await Promise.all([
    supabase
      .from("apartments")
      .select("*")
      .order("is_active", { ascending: false })
      .order("sort_order")
      .order("name")
      .returns<Apartment[]>(),
    supabase
      .from("staff_members")
      .select("name")
      .eq("is_active", true)
      .order("name")
      .returns<{ name: string }[]>(),
  ]);

  const names = (staff ?? []).map((s) => s.name);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-text">Settings</h1>

      <section aria-labelledby="me-heading">
        <SectionHeading>
          <span id="me-heading">Who is using this phone</span>
        </SectionHeading>
        {names.length ? (
          <NamePicker names={names} current={myName} compact />
        ) : (
          <p className="text-sm text-text-muted">Add names on the Team screen first.</p>
        )}
        <p className="mt-2 px-1 text-xs text-text-subtle">
          Used so the app can show who made a booking or changed the lock code.
        </p>
      </section>

      <section aria-labelledby="notifications-heading">
        <SectionHeading>
          <span id="notifications-heading">Notifications</span>
        </SectionHeading>
        <NotificationSettings vapidPublicKey={publicEnv.vapidPublicKey} />
      </section>

      <section aria-labelledby="apartments-heading">
        <SectionHeading>
          <span id="apartments-heading">Apartments</span>
        </SectionHeading>
        <ApartmentManager apartments={apartments ?? []} />
      </section>
    </div>
  );
}
