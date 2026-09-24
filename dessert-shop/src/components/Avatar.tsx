function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0];
}

export function Avatar({ name, id, size }: { name: string; id: number; size?: "lg" }) {
  return (
    <span className={`avatar${size ? ` ${size}` : ""}`} data-tone={id % 6} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
