import { AlertIcon, CheckIcon } from "./icons";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="error" role="alert">
      {message}
    </p>
  );
}

export function FormAlert({ error, ok }: { error?: string; ok?: string }) {
  if (error)
    return (
      <div className="banner danger" role="alert">
        <AlertIcon size={18} />
        <span>{error}</span>
      </div>
    );
  if (ok)
    return (
      <div className="banner ok" role="status">
        <CheckIcon size={18} />
        <span>{ok}</span>
      </div>
    );
  return null;
}
