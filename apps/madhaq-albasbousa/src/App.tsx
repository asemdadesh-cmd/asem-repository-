import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CartBar } from './components/CartBar';
import { CartSheet } from './components/CartSheet';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { Menu } from './components/Menu';
import { Occasions } from './components/Occasions';
import { ProductSheet } from './components/ProductSheet';
import { Toast } from './components/Toast';
import { store } from './config/store';
import { getProduct, getVariant, unitLabel } from './lib/catalog';
import { cartCount, cartLines, cartReducer, cartTotal } from './lib/cart';
import { emptyDetails } from './lib/order';
import { KEYS, load, save } from './lib/storage';
import type { CartItem, CustomerDetails } from './lib/types';

type View = { kind: 'product'; id: string } | { kind: 'cart' } | null;

const viewUrl = (v: View) =>
  v?.kind === 'product' ? `#/p/${v.id}` : v?.kind === 'cart' ? '#/cart' : location.pathname + location.search;

/** Only the reusable contact fields are remembered between orders. */
const REMEMBER = ['name', 'phone', 'fulfilment', 'area', 'address'] as const;

export function App() {
  const [items, dispatch] = useReducer(cartReducer, [] as CartItem[]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>(null);
  const [details, setDetails] = useState<CustomerDetails>(emptyDetails);
  const [toast, setToast] = useState<string | null>(null);
  // True when the open sheet added its own history entry, so closing it can just go "back".
  const pushed = useRef(false);
  const viewRef = useRef<View>(null);
  viewRef.current = view;

  // Client-only start-up: restore cart + contact details, honour product deep links, wire the back button.
  useEffect(() => {
    dispatch({ type: 'load', items: load<CartItem[]>(KEYS.cart) ?? [] });
    const saved = load<Partial<CustomerDetails>>(KEYS.details);
    if (saved && typeof saved === 'object') {
      const restored = { ...emptyDetails };
      for (const k of REMEMBER) if (typeof saved[k] === 'string') (restored[k] as string) = saved[k] as string;
      if (restored.fulfilment !== 'pickup') restored.fulfilment = 'delivery';
      setDetails(restored);
    }
    setReady(true);

    const deep = location.hash.match(/^#\/p\/([\w-]+)$/);
    if (deep && getProduct(deep[1])) {
      const v: View = { kind: 'product', id: deep[1] };
      history.replaceState({ view: v }, '', viewUrl(v));
      setView(v);
    } else if (location.hash === '#/cart') {
      history.replaceState(null, '', location.pathname + location.search);
    }

    const onPop = (e: PopStateEvent) => {
      const v = (e.state as { view?: View } | null)?.view ?? null;
      if (!v) pushed.current = false;
      setView(v);
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (ready) save(KEYS.cart, items);
  }, [items, ready]);

  useEffect(() => {
    if (!ready) return;
    save(KEYS.details, Object.fromEntries(REMEMBER.map((k) => [k, details[k]])));
  }, [details, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const open = useCallback((v: Exclude<View, null>) => {
    setToast(null);
    if (viewRef.current) history.replaceState({ view: v }, '', viewUrl(v));
    else {
      history.pushState({ view: v }, '', viewUrl(v));
      pushed.current = true;
    }
    setView(v);
  }, []);

  const close = useCallback(() => {
    if (pushed.current) history.back();
    else {
      history.replaceState(null, '', viewUrl(null));
      setView(null);
    }
  }, []);

  const lines = useMemo(() => cartLines(items), [items]);
  const total = cartTotal(lines);
  const count = cartCount(items);
  const openCart = () => open({ kind: 'cart' });
  const openProduct = (id: string) => open({ kind: 'product', id });

  const product = view?.kind === 'product' ? getProduct(view.id) : undefined;

  return (
    <>
      <a href="#menu" className="skip-link">
        تخطّى إلى المنيو
      </a>
      {store.demoMode && <p className="demo-bar">نسخة تجريبية — الأسعار والصور للعرض فقط</p>}
      <Header count={count} onCart={openCart} />
      <main id="top">
        <Hero />
        <Menu onOpen={openProduct} />
        <Occasions onPick={openProduct} />
        <HowItWorks />
      </main>
      <Footer />

      <CartBar count={count} total={total} onOpen={openCart} />
      <Toast message={toast} onAction={openCart} />

      <ProductSheet
        product={product}
        onClose={close}
        onAdd={(productId, variantId, qty) => {
          dispatch({ type: 'add', productId, variantId, qty });
          const p = getProduct(productId);
          const v = p && getVariant(p, variantId);
          close();
          if (p && v) setToast(`انضاف للسلة: ${qty}× ${unitLabel(p)} ${p.nameAr} (${v.nameAr})`);
        }}
      />
      <CartSheet
        open={view?.kind === 'cart'}
        onClose={close}
        lines={lines}
        total={total}
        details={details}
        onDetails={setDetails}
        onQty={(productId, variantId, qty) => dispatch({ type: 'set', productId, variantId, qty })}
        onRemove={(productId, variantId) => dispatch({ type: 'remove', productId, variantId })}
        onSent={() => dispatch({ type: 'clear' })}
        onBrowse={() => {
          close();
          setTimeout(() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }), 60);
        }}
      />
    </>
  );
}
