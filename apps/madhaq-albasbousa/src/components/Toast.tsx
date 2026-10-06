import { Icon } from './Icon';

export function Toast({ message, onAction }: { message: string | null; onAction: () => void }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && (
        <div className="toast">
          <Icon name="check" size={18} />
          <span>{message}</span>
          <button type="button" className="toast-action" onClick={onAction}>
            إتمام الطلب
          </button>
        </div>
      )}
    </div>
  );
}
