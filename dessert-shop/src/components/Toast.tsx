"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckIcon } from "./icons";

/** Shows a short confirmation, then strips the ?saved=… param so refresh/back don't repeat it. */
export function Toast({ message }: { message: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      next.delete("saved");
      next.delete("deleted");
      router.replace(next.size ? `${path}?${next}` : path, { scroll: false });
    }, 4000);
    return () => clearTimeout(t);
  }, [router, path, params]);
  return (
    <div className="toast" role="status">
      <CheckIcon size={18} />
      {message}
    </div>
  );
}
