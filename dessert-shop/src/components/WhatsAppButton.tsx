"use client";

import { markReminded } from "@/app/actions";
import { WhatsAppIcon } from "./icons";

/** Opens WhatsApp with a pre-written reminder and records that the customer was reminded. */
export function WhatsAppButton({
  customerId,
  href,
  disabled,
  variant = "button",
}: {
  customerId: number;
  href: string;
  disabled?: boolean;
  variant?: "button" | "icon";
}) {
  return (
    <a
      href={disabled ? undefined : href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={disabled}
      className={variant === "icon" ? "icon-action" : "btn btn-wa btn-sm"}
      onClick={() => {
        // Fire-and-forget; must not block the navigation to WhatsApp.
        void markReminded(customerId).catch(() => {});
      }}
    >
      <WhatsAppIcon size={variant === "icon" ? 20 : 18} />
      {variant === "icon" ? "تذكير واتساب" : "تذكير"}
    </a>
  );
}
