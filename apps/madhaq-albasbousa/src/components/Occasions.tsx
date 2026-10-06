import { useState } from 'react';
import { PHOTOS, SIZE_NAMES } from '../config/menu';
import { suggestTrays } from '../lib/catalog';
import { Icon } from './Icon';
import { Img } from './Img';

const OCCASIONS = ['العيلة', 'الضيوف', 'الجمعات', 'المناسبات', 'العزائم', 'الهدايا'];

export function Occasions({ onPick }: { onPick: (productId: string) => void }) {
  const [people, setPeople] = useState(12);
  const plan = suggestTrays(people);
  const planText = plan.map((p) => `${p.count > 1 ? `${p.count}× ` : ''}طاجين ${SIZE_NAMES[p.size]}`).join(' + ');

  return (
    <section id="occasions" className="section occasions" aria-labelledby="occ-title">
      <div className="container occ-inner">
        <div className="occ-media">
          <Img photo={PHOTOS.occasionTrays} ratio={4 / 3} widths={[500, 800, 1100]} sizes="(min-width: 900px) 45vw, 100vw" />
        </div>
        <div className="occ-copy">
          <p className="eyebrow">للمّات والمناسبات</p>
          <h2 id="occ-title">عندك لمّة؟ إحنا علينا الحلو.</h2>
          <p className="section-lead">من الفرن إلى لمّتكم — صواني كاملة مقطّعة وجاهزة للتقديم.</p>
          <ul className="occ-tags" aria-label="مناسبات نجهّز لها">
            {OCCASIONS.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>

          <div className="planner">
            <label htmlFor="people" className="planner-label">
              <Icon name="users" /> كم شخص عندك؟ <output htmlFor="people">{people}</output>
            </label>
            <input
              id="people"
              type="range"
              min={2}
              max={60}
              step={1}
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
              aria-valuetext={`${people} شخص`}
            />
            <p className="planner-result" aria-live="polite">
              ننصحك بـ <strong>{planText}</strong>
            </p>
            <div className="planner-ctas">
              <button type="button" className="btn btn-primary" onClick={() => onPick('basbousa-qishta')}>
                اطلب طاجين بسبوسة
              </button>
              {people >= 15 && (
                <button type="button" className="btn btn-ghost" onClick={() => onPick('occasion-mix')}>
                  أو صينية المناسبات المشكلة
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
