import { PHOTOS } from '../config/menu';
import { store } from '../config/store';
import { Icon } from './Icon';
import { Img } from './Img';

export function Hero() {
  const years = new Date().getFullYear() - store.established;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="eyebrow">صواني · طواجين · بوكسات · كيك — كاملة</p>
          <h1 id="hero-title">
            طاجين يجمعكم
            <br />
            <span>على الحلو</span>
          </h1>
          <p className="hero-lead">
            بسبوسة، كنافة، بقلاوة وكيك — نجهّزها لكم طاجين كامل للعيلة والضيوف والمناسبات. اختار طاجينك وخليه علينا.
          </p>
          <div className="hero-ctas">
            <a href="#menu" className="btn btn-primary btn-lg">
              <Icon name="tray" /> اختار طاجينك
            </a>
            <a href="#occasions" className="btn btn-ghost btn-lg">
              <Icon name="users" /> عندك لمّة؟
            </a>
          </div>
          <ul className="trust">
            <li>
              <Icon name="flame" size={18} /> محضّرة يومياً
            </li>
            <li>
              <Icon name="whatsapp" size={18} /> الطلب يوصلنا على واتساب
            </li>
            <li>
              <Icon name="check" size={18} /> من {store.established}
              {years > 0 ? ` · ${years} سنين حلا` : ''}
            </li>
          </ul>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-tile hero-tile-a">
            <Img photo={PHOTOS.basbousa} ratio={4 / 5} widths={[420, 640, 900]} sizes="(min-width: 900px) 30vw, 55vw" priority />
            <span className="tile-tag">طاجين بسبوسة</span>
          </div>
          <div className="hero-tile hero-tile-b">
            <Img photo={PHOTOS.kunafa} ratio={1} widths={[300, 500]} sizes="(min-width: 900px) 20vw, 38vw" priority />
            <span className="tile-tag">صينية كنافة</span>
          </div>
          <div className="hero-tile hero-tile-c">
            <Img photo={PHOTOS.baklavaBox} ratio={1} widths={[300, 500]} sizes="(min-width: 900px) 20vw, 38vw" />
            <span className="tile-tag">بوكس بقلاوة</span>
          </div>
        </div>
      </div>
    </section>
  );
}
