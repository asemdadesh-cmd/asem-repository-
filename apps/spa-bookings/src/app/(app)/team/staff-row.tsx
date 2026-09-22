"use client";

import type { Profile } from "@/lib/types";
import { displayName } from "@/lib/auth-display";
import { Badge, cx } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { setStaffActive, setStaffRole } from "@/app/actions/admin";

export function StaffRow({
  person,
  isAdmin,
  isSelf,
}: {
  person: Profile;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  return (
    <div className={cx("px-4 py-3", !person.is_active && "opacity-60")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">
            {displayName(person)}
            {isSelf && <span className="font-normal text-text-subtle"> · you</span>}
          </p>
          <p className="truncate text-xs text-text-subtle">{person.email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!person.is_active && <Badge tone="danger">No access</Badge>}
          <Badge tone={person.role === "admin" ? "accent" : "neutral"}>
            {person.role === "admin" ? "Admin" : "Staff"}
          </Badge>
        </div>
      </div>

      {isAdmin && !isSelf && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <ActionForm
            action={setStaffRole}
            fields={{
              user_id: person.id,
              role: person.role === "admin" ? "staff" : "admin",
            }}
            label={person.role === "admin" ? "Make staff" : "Make admin"}
            pendingLabel="Updating…"
            size="sm"
            variant="secondary"
          />
          <ActionForm
            action={setStaffActive}
            fields={{ user_id: person.id, is_active: String(person.is_active) }}
            label={person.is_active ? "Remove access" : "Restore access"}
            confirmLabel={person.is_active ? "Tap again to remove" : undefined}
            pendingLabel="Updating…"
            size="sm"
            variant={person.is_active ? "ghost" : "secondary"}
          />
        </div>
      )}
    </div>
  );
}
