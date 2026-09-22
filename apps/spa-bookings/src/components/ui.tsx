import type { ComponentPropsWithoutRef, ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Utilities                                                                   */
/* -------------------------------------------------------------------------- */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium " +
  "transition-[background-color,border-color,opacity,transform] duration-150 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 " +
  "select-none text-center";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-sm",
  secondary:
    "bg-surface text-text border border-border-input hover:border-border-strong hover:bg-surface-muted",
  ghost: "text-text-muted hover:text-text hover:bg-surface-muted",
  danger:
    "bg-danger-soft text-danger-soft-fg border border-transparent hover:bg-danger hover:text-white",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-10 px-3 text-sm",
  md: "h-12 px-4 text-[0.9375rem]",
  lg: "h-14 px-5 text-base",
};

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        buttonBase,
        buttonVariants[variant],
        buttonSizes[size],
        block && "w-full",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */
export function Card({
  className,
  children,
  as: As = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "li" | "section" | "article";
}) {
  return (
    <As
      className={cx(
        "rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */
type BadgeTone = "neutral" | "accent" | "warn" | "danger" | "ready";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-text-muted",
  accent: "bg-accent-soft text-accent-soft-fg",
  warn: "bg-warn-soft text-warn-soft-fg",
  danger: "bg-danger-soft text-danger-soft-fg",
  ready: "bg-ready-soft text-ready-soft-fg",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Form primitives                                                             */
/* -------------------------------------------------------------------------- */
const fieldControl =
  "w-full rounded-xl border border-border-input bg-bg-elevated px-3.5 py-3 " +
  "text-text placeholder:text-text-subtle transition-colors " +
  "hover:border-border-strong focus:border-accent";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={cx(fieldControl, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentPropsWithoutRef<"select">) {
  // Native appearance is kept deliberately: the platform dropdown arrow is the
  // affordance, and iOS renders its own picker wheel for it.
  return <select className={cx(fieldControl, "pr-2", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return <textarea className={cx(fieldControl, "min-h-24 resize-y", className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                    */
/* -------------------------------------------------------------------------- */
export function Alert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "accent" | "warn";
  children: ReactNode;
}) {
  const tones = {
    danger: "bg-danger-soft text-danger-soft-fg",
    accent: "bg-accent-soft text-accent-soft-fg",
    warn: "bg-warn-soft text-warn-soft-fg",
  } as const;
  return (
    <div role="alert" className={cx("rounded-xl px-4 py-3 text-sm font-medium", tones[tone])}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border px-6 py-12 text-center">
      <p className="text-base font-semibold text-text">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-text-muted">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function SectionHeading({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle">
        {children}
      </h2>
      {trailing}
    </div>
  );
}
