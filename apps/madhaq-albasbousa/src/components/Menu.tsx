import { useState } from 'react';
import { CATEGORIES } from '../config/menu';
import { productsIn } from '../lib/catalog';
import type { CategoryId } from '../lib/types';
import { ProductCard } from './ProductCard';

export function Menu({ onOpen }: { onOpen: (id: string) => void }) {
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const tabs: { id: CategoryId | 'all'; nameAr: string }[] = [{ id: 'all', nameAr: 'الكل' }, ...CATEGORIES];
  const products = productsIn(cat);

  return (
    <section id="menu" className="section menu" aria-labelledby="menu-title">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">المنيو</p>
          <h2 id="menu-title">اختار طاجينك</h2>
          <p className="section-lead">كل الأصناف تنباع كاملة — طاجين، صينية، بوكس أو قالب. اختار الحجم على قد لمّتك.</p>
        </div>

        <div className="tabs" role="tablist" aria-label="أقسام المنيو">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={cat === t.id}
              aria-controls="menu-grid"
              className={`tab${cat === t.id ? ' on' : ''}`}
              onClick={() => setCat(t.id)}
            >
              {t.nameAr}
            </button>
          ))}
        </div>

        <div id="menu-grid" role="tabpanel" className="grid" aria-live="polite">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  );
}
