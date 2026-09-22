import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { londonDateKey } from "@/lib/time";
import type { Apartment } from "@/lib/types";
import { Alert, Button } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/icons";
import { NewBookingForm } from "./new-booking-form";

export const metadata: Metadata = { title: "New booking" };
export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const initialDate = date && DATE_PATTERN.test(date) ? date : londonDateKey();

  const supabase = await createClient();
  const { data: apartments } = await supabase
    .from("apartments")
    .select("id, name, sort_order, is_active, created_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<Apartment[]>();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href={`/calendar?date=${initialDate}`}
          className="tap -ml-2 flex items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          aria-label="Back to the calendar"
        >
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-text">New spa booking</h1>
      </div>

      {!apartments?.length ? (
        <div className="space-y-4">
          <Alert tone="warn">
            No apartments have been set up yet, so a booking can&rsquo;t be assigned to one.
          </Alert>
          <Link href="/settings">
            <Button block>Add apartments in Settings</Button>
          </Link>
        </div>
      ) : (
        <NewBookingForm apartments={apartments} initialDate={initialDate} />
      )}
    </div>
  );
}
