import emblem from '../assets/emblem.png';
import wordmark from '../assets/wordmark.png';
import { store } from '../config/store';
import { Icon } from './Icon';

export function Header({ count, onCart }: { count: number; onCart: () => void }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="#top" className="brand" aria-label={`${store.nameAr} — الرئيسية`}>
          <img src={emblem} alt="" width={44} height={45} className="brand-emblem" />
          <img src={wordmark} alt={store.nameAr} width={150} height={24} className="brand-wordmark" />
        </a>
        <nav className="main-nav" aria-label="القائمة الرئيسية">
          <a href="#menu">المنيو</a>
          <a href="#occasions">المناسبات</a>
          <a href="#how">كيف تطلب</a>
        </nav>
        <button type="button" className="cart-btn" onClick={onCart} aria-label={`السلة، ${count} صنف`}>
          <Icon name="bag" size={22} />
          <span className="cart-btn-text">السلة</span>
          {count > 0 && (
            <span className="cart-count" aria-hidden="true">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
