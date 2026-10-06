import { formatPrice } from '../lib/catalog';
import { Icon } from './Icon';

/** Sticky "view order" bar on phones — always one tap from checkout once something is in the cart. */
export function CartBar({ count, total, onOpen }: { count: number; total: number; onOpen: () => void }) {
  if (!count) return null;
  return (
    <div className="cart-bar">
      <button type="button" className="btn btn-primary btn-block btn-lg cart-bar-btn" onClick={onOpen}>
        <span className="cart-bar-count">{count}</span>
        <span className="cart-bar-label">
          <Icon name="bag" /> عرض الطلب
        </span>
        <strong>{formatPrice(total)}</strong>
      </button>
    </div>
  );
}
