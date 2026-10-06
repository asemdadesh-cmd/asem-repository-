import { store } from '../config/store';
import { Icon, type IconName } from './Icon';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'tray', title: 'اختار الصنف', text: 'بسبوسة، كنافة، بقلاوة أو كيك.' },
  { icon: 'users', title: 'اختار الحجم', text: 'صغير، وسط أو كبير — على قد لمّتك.' },
  { icon: 'truck', title: 'وين نوصّل؟', text: 'الاسم، الرقم والعنوان — أو استلم من المحل.' },
  { icon: 'whatsapp', title: 'أرسل على واتساب', text: 'رسالة الطلب جاهزة، بس اضغط إرسال.' },
];

export function HowItWorks() {
  return (
    <section id="how" className="section how" aria-labelledby="how-title">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">أقل من دقيقة</p>
          <h2 id="how-title">كيف تطلب؟</h2>
        </div>
        <ol className="how-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="how-num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="how-icon">
                <Icon name={s.icon} size={24} />
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        <ul className="facts">
          <li>
            <Icon name="clock" size={18} /> {store.hours}
          </li>
          <li>
            <Icon name="truck" size={18} /> توصيل داخل {store.city}
          </li>
          <li>
            <Icon name="gift" size={18} /> {store.leadTimeNote}
          </li>
        </ul>
      </div>
    </section>
  );
}
