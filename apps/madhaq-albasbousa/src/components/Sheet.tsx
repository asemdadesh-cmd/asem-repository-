import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Native <dialog>: focus trap, Esc and inert background for free. Bottom sheet on phones, centered panel on desktop. */
export function Sheet({ open, onClose, label, children, footer, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>('.sheet-body')?.scrollTo(0, 0);
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    document.documentElement.classList.toggle('no-scroll', open);
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`sheet${wide ? ' sheet-wide' : ''}`}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-panel">
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label="إغلاق">
          <Icon name="close" />
        </button>
        <div className="sheet-body">{open && children}</div>
        {open && footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </dialog>
  );
}
