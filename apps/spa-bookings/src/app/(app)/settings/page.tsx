import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import type { Apartment } from "@/lib/types";
import { Card, SectionHeading } from "@/components/ui";
import { NotificationSettings } from "./notification-settings";
import { ProfileForm } from "./profile-form";
import { ApartmentManager } from "./apartment-manager";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { profile } = await requireSession();
  const isAdmin = profile.role === "admin";

  const supabase = await createClient();
  const { data: apartments } = isAdmin
    ? await supabase
        .from("apartments")
        .select("*")
        .order("is_active", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
        .returns<Apartment[]>()
    : { data: null };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-text">Settings</h1>

      <section aria-labelledby="notifications-heading">
        <SectionHeading>
          <span id="notifications-heading">Notifications</span>
        </SectionHeading>
        <NotificationSettings vapidPublicKey={publicEnv.vapidPublicKey} />
      </section>

      <section aria-labelledby="profile-heading">
        <SectionHeading>
          <span id="profile-heading">Your details</span>
        </SectionHeading>
        <ProfileForm profile={profile} />
      </section>

      {isAdmin && (
        <section aria-labelledby="apartments-heading">
          <SectionHeading>
            <span id="apartments-heading">Apartments</span>
          </SectionHeading>
          <ApartmentManager apartments={apartments ?? []} />
        </section>
      )}

      <section aria-labelledby="account-heading">
        <SectionHeading>
          <span id="account-heading">Account</span>
        </SectionHeading>
        <Card className="space-y-3 p-4">
          <p className="text-sm text-text-muted">
            Signed in as <span className="font-medium text-text">{profile.email}</span>
          </p>
          <SignOutButton />
        </Card>
      </section>
    </div>
  );
}
