import { useEffect, useId, useRef, useState } from 'react';
import { store } from '../config/store';
import { formatPrice } from '../lib/catalog';
import { MAX_QTY, type CartLine } from '../lib/cart';
import { buildOrderMessage, isoDate, LIMITS, orderNumber, validateDetails, whatsappUrl, WHEN_OPTIONS, type DetailErrors } from '../lib/order';
import type { CustomerDetails } from '../lib/types';
import { Icon } from './Icon';
import { Img } from './Img';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';

type Step = 'cart' | 'details' | 'sent';

interface Props {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  total: number;
  details: CustomerDetails;
  onDetails: (d: CustomerDetails) => void;
  onQty: (productId: string, variantId: string, qty: number) => void;
  onRemove: (productId: string, variantId: string) => void;
  onSent: () => void;
  onBrowse: () => void;
}

export function CartSheet(props: Props) {
  const { open, onClose, lines } = props;
  const [step, setStep] = useState<Step>('cart');
  const [sent, setSent] = useState<{ orderNo: string; url: string } | null>(null);

  // Closing the sheet always resets the flow, so the next open starts at the cart.
  useEffect(() => {
    if (!open) {
      setStep('cart');
      setSent(null);
    }
  }, [open]);

  const label = step === 'cart' ? 'سلة الطلب' : step === 'details' ? 'بيانات الطلب' : 'تم تجهيز الطلب';

  return (
    <Sheet open={open} onClose={onClose} label={label}>
      {step === 'sent' && sent ? (
        <Sent orderNo={sent.orderNo} url={sent.url} onDone={onClose} />
      ) : lines.length === 0 ? (
        <Empty onBrowse={props.onBrowse} />
      ) : step === 'cart' ? (
        <CartStep {...props} onNext={() => setStep('details')} />
      ) : (
        <DetailsStep
          {...props}
          onBack={() => setStep('cart')}
          onSend={(orderNo, url) => {
            setSent({ orderNo, url });
            setStep('sent');
            props.onSent();
          }}
        />
      )}
    </Sheet>
  );
}

function Empty({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="tray" size={34} />
      </span>
      <h2>السلة فاضية</h2>
      <p>اختار طاجين، صينية، بوكس أو قالب كيك — ونجهّزه لك كامل.</p>
      <button type="button" className="btn btn-primary" onClick={onBrowse}>
        تصفّح المنيو
      </button>
    </div>
  );
}

function Steps({ current }: { current: 1 | 2 }) {
  return (
    <ol className="steps" aria-label="خطوات الطلب">
      <li aria-current={current === 1 ? 'step' : undefined} className={current >= 1 ? 'on' : ''}>
        السلة
      </li>
      <li aria-current={current === 2 ? 'step' : undefined} className={current >= 2 ? 'on' : ''}>
        بياناتك
      </li>
      <li>واتساب</li>
    </ol>
  );
}

function CartStep({ lines, total, onQty, onRemove, onNext }: Props & { onNext: () => void }) {
  return (
    <div className="flow">
      <Steps current={1} />
      <h2 className="flow-title">طلبك</h2>
      <ul className="lines">
        {lines.map((l) => (
          <li key={l.key} className="line">
            <div className="line-media">
              <Img photo={l.product.image} ratio={1} widths={[160, 240]} sizes="80px" />
            </div>
            <div className="line-info">
              <p className="line-name">{l.product.nameAr}</p>
              <p className="line-meta">
                الحجم: {l.variant.nameAr} · {l.unit} كامل
              </p>
              <p className="line-calc">
                {formatPrice(l.variant.price)} × {l.qty} {l.unit}
              </p>
              <div className="line-actions">
                <Stepper
                  small
                  value={l.qty}
                  min={1}
                  max={MAX_QTY}
                  itemName={`${l.unit} ${l.product.nameAr}`}
                  onChange={(n) => onQty(l.product.id, l.variant.id, n)}
                />
                <button
                  type="button"
                  className="link-btn danger"
                  onClick={() => onRemove(l.product.id, l.variant.id)}
                  aria-label={`احذف ${l.product.nameAr} (${l.variant.nameAr}) من السلة`}
                >
                  <Icon name="trash" size={16} /> حذف
                </button>
              </div>
            </div>
            <p className="line-total">{formatPrice(l.total)}</p>
          </li>
        ))}
      </ul>

      <div className="summary">
        <div className="summary-row total">
          <span>الإجمالي</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <p className="summary-note">{store.deliveryFeeNote}</p>
      </div>

      <div className="flow-cta">
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={onNext}>
          متابعة الطلب
          <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}

function DetailsStep({
  lines,
  total,
  details,
  onDetails,
  onBack,
  onSend,
}: Props & { onBack: () => void; onSend: (orderNo: string, url: string) => void }) {
  const [errors, setErrors] = useState<DetailErrors>({});
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const set = <K extends keyof CustomerDetails>(k: K, v: CustomerDetails[K]) => {
    const next = { ...details, [k]: v };
    onDetails(next);
    if (tried) setErrors(validateDetails(next));
  };
  const delivery = details.fulfilment === 'delivery';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    const errs = validateDetails(details);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const orderNo = orderNumber();
    const url = whatsappUrl(buildOrderMessage(orderNo, details, lines, total));
    // New tab keeps the shop open behind WhatsApp; if a popup blocker says no, go there directly.
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    else window.location.href = url;
    onSend(orderNo, url);
  };

  const field = (k: keyof CustomerDetails) => ({
    id: id(k),
    name: k,
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? id(`${k}-err`) : undefined,
  });
  const err = (k: keyof CustomerDetails) =>
    errors[k] ? (
      <p className="field-error" id={id(`${k}-err`)}>
        {errors[k]}
      </p>
    ) : null;

  return (
    <form className="flow" onSubmit={submit} noValidate ref={formRef}>
      <Steps current={2} />
      <div className="flow-head">
        <button type="button" className="link-btn" onClick={onBack}>
          <Icon name="arrow" size={16} /> رجوع للسلة
        </button>
      </div>
      <h2 className="flow-title">وين نوصّل طلبك؟</h2>

      <fieldset className="toggle" aria-label="طريقة الاستلام">
        <label className={delivery ? 'on' : ''}>
          <input type="radio" name="fulfilment" checked={delivery} onChange={() => set('fulfilment', 'delivery')} />
          <Icon name="truck" /> توصيل
        </label>
        <label className={!delivery ? 'on' : ''}>
          <input type="radio" name="fulfilment" checked={!delivery} onChange={() => set('fulfilment', 'pickup')} />
          <Icon name="store" /> استلام من المحل
        </label>
      </fieldset>

      <div className="grid-2">
        <div className="field">
          <label htmlFor={id('name')}>الاسم</label>
          <input {...field('name')} type="text" autoComplete="name" maxLength={LIMITS.name} value={details.name} onChange={(e) => set('name', e.target.value)} />
          {err('name')}
        </div>
        <div className="field">
          <label htmlFor={id('phone')}>رقم الهاتف</label>
          <input
            {...field('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="09XXXXXXXX"
            maxLength={20}
            value={details.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          {err('phone')}
        </div>
      </div>

      {delivery ? (
        <>
          <div className="field">
            <label htmlFor={id('area')}>المنطقة ({store.city})</label>
            <input
              {...field('area')}
              type="text"
              list={id('areas')}
              autoComplete="address-level2"
              maxLength={LIMITS.area}
              placeholder="مثلاً: حي الأندلس"
              value={details.area}
              onChange={(e) => set('area', e.target.value)}
            />
            <datalist id={id('areas')}>
              {store.areas.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            {err('area')}
          </div>
          <div className="field">
            <label htmlFor={id('address')}>العنوان أو أقرب نقطة دالة</label>
            <textarea
              {...field('address')}
              rows={2}
              autoComplete="street-address"
              maxLength={LIMITS.address}
              placeholder="الشارع، قرب جامع / مدرسة / محل…"
              value={details.address}
              onChange={(e) => set('address', e.target.value)}
            />
            {err('address')}
          </div>
        </>
      ) : (
        <p className="info-note">
          <Icon name="store" size={18} /> {store.pickupNote}
        </p>
      )}

      <fieldset className="field">
        <legend>موعد التسليم</legend>
        <div className="chips" role="radiogroup">
          {WHEN_OPTIONS.map((w) => (
            <label key={w.id} className={`chip${details.when === w.id ? ' on' : ''}`}>
              <input type="radio" name="when" value={w.id} checked={details.when === w.id} onChange={() => set('when', w.id)} />
              {w.label}
            </label>
          ))}
        </div>
        {details.when === 'date' && (
          <div className="field date-field">
            <label htmlFor={id('date')}>التاريخ</label>
            <input {...field('date')} type="date" min={isoDate(new Date())} value={details.date} onChange={(e) => set('date', e.target.value)} />
            {err('date')}
          </div>
        )}
        <p className="field-hint">
          <Icon name="clock" size={15} /> {store.leadTimeNote}
        </p>
      </fieldset>

      <div className="field">
        <label htmlFor={id('notes')}>
          ملاحظات <span className="optional">(اختياري)</span>
        </label>
        <textarea
          {...field('notes')}
          rows={2}
          maxLength={LIMITS.notes}
          placeholder="مثلاً: بدون فستق على البسبوسة، أو اكتبوا اسم على الكيكة"
          value={details.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      <div className="summary compact">
        {lines.map((l) => (
          <div className="summary-row" key={l.key}>
            <span>
              {l.qty}× {l.product.nameAr} <small>({l.variant.nameAr})</small>
            </span>
            <span>{formatPrice(l.total)}</span>
          </div>
        ))}
        <div className="summary-row total">
          <span>الإجمالي</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <p className="summary-note">
          {delivery ? store.deliveryFeeNote + ' ' : ''}
          {store.paymentNote}
        </p>
      </div>

      <div className="flow-cta">
        {tried && Object.keys(errors).length > 0 && (
          <p className="form-error" role="alert">
            كمّل البيانات المطلوبة فوق
          </p>
        )}
        <button type="submit" className="btn btn-whatsapp btn-block btn-lg">
          <Icon name="whatsapp" size={22} />
          أرسل الطلب على واتساب
        </button>
        <p className="cta-note">يفتح واتساب ورسالة الطلب جاهزة — بس اضغط إرسال.</p>
      </div>
    </form>
  );
}

function Sent({ orderNo, url, onDone }: { orderNo: string; url: string; onDone: () => void }) {
  return (
    <div className="empty sent" role="status">
      <span className="empty-icon ok">
        <Icon name="check" size={34} />
      </span>
      <h2>طلبك جاهز في واتساب</h2>
      <p>
        رقم الطلب <strong dir="ltr">{orderNo}</strong>. اضغط <strong>إرسال</strong> في واتساب، ونأكد معاك الطلب والتوصيل في أقرب وقت.
      </p>
      <a className="btn btn-whatsapp" href={url} target="_blank" rel="noopener noreferrer">
        <Icon name="whatsapp" /> ما انفتح واتساب؟ افتحه من هنا
      </a>
      <button type="button" className="link-btn" onClick={onDone}>
        رجوع للمنيو
      </button>
    </div>
  );
}
