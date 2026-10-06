import { formatPrice, startingPrice, wholeUnitLabel } from '../lib/catalog';
import type { Product } from '../lib/types';
import { Img } from './Img';

export function ProductCard({ product, onOpen }: { product: Product; onOpen: (id: string) => void }) {
  const sizes = product.variants.map((v) => v.nameAr).join(' · ');
  return (
    <article className="card">
      <div className="card-media">
        <Img
          photo={product.image}
          ratio={4 / 3}
          widths={[400, 640, 900]}
          sizes="(min-width: 1100px) 340px, (min-width: 700px) 45vw, 92vw"
        />
        <span className="unit-chip">{wholeUnitLabel(product)}</span>
        {product.badge && <span className="badge">{product.badge}</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">{product.nameAr}</h3>
        <p className="card-sizes">{sizes}</p>
        <div className="card-foot">
          <p className="card-price">
            <span>ابتداءً من</span>
            <strong>{formatPrice(startingPrice(product))}</strong>
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm stretched"
            onClick={() => onOpen(product.id)}
            aria-label={`اختر حجم ${product.nameAr}`}
          >
            اختر الحجم
          </button>
        </div>
      </div>
    </article>
  );
}
