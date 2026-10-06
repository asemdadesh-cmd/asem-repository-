import { useState } from 'react';
import { defaultVariant, formatPrice, getVariant, variantImage, wholeUnitLabel, unitLabel } from '../lib/catalog';
import { MAX_QTY } from '../lib/cart';
import type { Product } from '../lib/types';
import { Icon } from './Icon';
import { Img } from './Img';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';

interface Props {
  product: Product | undefined;
  onClose: () => void;
  onAdd: (productId: string, variantId: string, qty: number) => void;
}

export function ProductSheet({ product, onClose, onAdd }: Props) {
  return (
    <Sheet open={!!product} onClose={onClose} label={product ? product.nameAr : 'تفاصيل الصنف'}>
      {product && <ProductDetail key={product.id} product={product} onAdd={onAdd} />}
    </Sheet>
  );
}

function ProductDetail({ product, onAdd }: { product: Product; onAdd: Props['onAdd'] }) {
  const [variantId, setVariantId] = useState(defaultVariant(product).id);
  const [qty, setQty] = useState(1);
  const variant = getVariant(product, variantId) ?? defaultVariant(product);
  const unit = unitLabel(product);

  return (
    <form
      className="product"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(product.id, variant.id, qty);
      }}
    >
      <div className="product-media">
        <Img photo={variantImage(product, variant)} ratio={16 / 10} widths={[500, 800, 1100]} sizes="(min-width: 760px) 640px, 100vw" priority />
      </div>
      <div className="product-info">
        <p className="eyebrow">{wholeUnitLabel(product)}</p>
        <h2 className="product-title">{product.nameAr}</h2>
        <p className="product-desc">{product.description}</p>

        <fieldset className="sizes">
          <legend>اختر الحجم</legend>
          {product.variants.map((v) => (
            <label key={v.id} className="size-option">
              <input
                type="radio"
                name="size"
                value={v.id}
                checked={v.id === variant.id}
                onChange={() => setVariantId(v.id)}
              />
              <span className="size-text">
                <span className="size-name">
                  {unit} {v.nameAr}
                </span>
                <span className="size-serves">
                  <Icon name="users" size={15} /> {v.serves}
                </span>
                {v.dimensions && <span className="size-dims">{v.dimensions}</span>}
              </span>
              <span className="size-price">{formatPrice(v.price)}</span>
            </label>
          ))}
        </fieldset>

        <div className="qty-row">
          <div>
            <p className="qty-label" id="qty-label">
              كم {unit}؟
            </p>
            <p className="qty-hint">
              {qty} {unit} × {formatPrice(variant.price)}
            </p>
          </div>
          <Stepper value={qty} min={1} max={MAX_QTY} onChange={setQty} labelledBy="qty-label" itemName={unit} />
        </div>
      </div>

      <div className="product-cta">
        <button type="submit" className="btn btn-primary btn-block btn-lg">
          <Icon name="bag" />
          أضف للسلة — {formatPrice(variant.price * qty)}
        </button>
      </div>
    </form>
  );
}
