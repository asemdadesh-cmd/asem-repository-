"use client";

import { createContext, forwardRef, startTransition, useContext } from "react";

const PendingContext = createContext(false);
export const useActionPending = () => useContext(PendingContext);

/**
 * A <form> that dispatches a useActionState action WITHOUT React 19's automatic form reset,
 * so a validation error never wipes what the owner typed. Pass `pending` from useActionState.
 */
export const ActionForm = forwardRef<
  HTMLFormElement,
  Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
    action: (fd: FormData) => void;
    pending: boolean;
    confirm?: string;
  }
>(function ActionForm({ action, pending, confirm, children, ...props }, ref) {
  return (
    <form
      {...props}
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
    </form>
  );
});
