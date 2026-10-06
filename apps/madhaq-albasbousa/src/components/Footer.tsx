import emblem from '../assets/emblem.png';
import { PHOTOS } from '../config/menu';
import { store } from '../config/store';
import { creditUrl } from '../lib/images';
import { Icon } from './Icon';

export function Footer() {
  const credits = [...new Map(Object.values(PHOTOS).flatMap((p) => (p.credit ? [[p.credit.username, p.credit]] : []))).values()];
  const chat = `https://wa.me/${store.whatsappNumber}?text=${encodeURIComponent(`السلام عليكم، عندي استفسار عن ${store.nameAr}`)}`;
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <img src={emblem} alt="" width={72} height={73} loading="lazy" />
          <div>
            <p className="footer-name">{store.nameAr}</p>
            <p className="footer-tag">حلا لمّتكم — من {store.established}</p>
          </div>
        </div>
        <div className="footer-contact">
          <a href={`tel:+${store.whatsappNumber}`} className="footer-link">
            <Icon name="phone" size={18} /> <span dir="ltr">{store.phoneDisplay}</span>
          </a>
          <a href={chat} className="footer-link" target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" size={18} /> راسلنا على واتساب
          </a>
          <p className="footer-link">
            <Icon name="clock" size={18} /> {store.hours}
          </p>
        </div>
      </div>
      <div className="container footer-fine">
        <p>
          © {new Date().getFullYear()} {store.nameAr}. {store.demoMode && 'الأسعار والصور في هذه النسخة تجريبية.'}
        </p>
        {credits.length > 0 && (
          <details className="credits">
            <summary>صور العرض من Unsplash</summary>
            <p>
              {credits.map((c, i) => (
                <span key={c.username}>
                  {i > 0 && '، '}
                  <a href={creditUrl(c.username)} target="_blank" rel="noopener noreferrer" dir="ltr">
                    {c.name}
                  </a>
                </span>
              ))}
            </p>
          </details>
        )}
      </div>
    </footer>
  );
}
