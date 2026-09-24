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
      <p className="alert alert-error" role="alert">
        {error}
      </p>
    );
  if (ok)
    return (
      <p className="alert alert-ok" role="status">
        {ok}
      </p>
    );
  return null;
}
