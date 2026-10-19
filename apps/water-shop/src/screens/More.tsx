import { BarChart3, ChevronLeft, HandCoins, Package, Receipt, Settings as SettingsIcon, Wallet, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Page, PageHeader } from '@/components/ui/page';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Tile { to: string; title: string; text: string; icon: LucideIcon; tone: string }

const TILES: Tile[] = [
  { to: '/day', title: 'حساب اليوم', text: 'اعرف ما في الدرج وأغلق يومك', icon: Wallet, tone: 'bg-brand-50 text-brand-700' },
  { to: '/reports', title: 'التقارير', text: 'المبيعات والمصروفات لأي فترة', icon: BarChart3, tone: 'bg-pos-50 text-pos-700' },
  { to: '/expense', title: 'تسجيل مصروف', text: 'سجّل ما دفعته من الدرج', icon: Receipt, tone: 'bg-neg-50 text-neg-700' },
  { to: '/pay', title: 'تسديد دين', text: 'استلم مبلغاً من زبون عليه دين', icon: HandCoins, tone: 'bg-warn-50 text-warn-600' },
  { to: '/settings/catalog', title: 'المنتجات والأسعار', text: 'غيّر الأسعار وأضف منتجات جديدة', icon: Package, tone: 'bg-brand-50 text-brand-700' },
  { to: '/settings', title: 'الإعدادات', text: 'النسخ الاحتياطي وقفل التطبيق', icon: SettingsIcon, tone: 'bg-surface-2 text-ink-2' },
];

export default function More() {
  return (
    <Page>
      <PageHeader title="المزيد" />
      <ul className="space-y-3">
        {TILES.map((t) => (
          <li key={t.to}>
            <Link to={t.to} className="block rounded-[var(--radius-card)] focus-visible:outline-2 focus-visible:outline-brand-500">
              <Card className="flex min-h-20 items-center gap-4 p-4 transition active:scale-[0.98]">
                <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl', t.tone)}>
                  <t.icon className="size-7" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold">{t.title}</span>
                  <span className="block text-sm text-ink-2">{t.text}</span>
                </span>
                <ChevronLeft className="size-6 shrink-0 text-ink-3" aria-hidden />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-sm text-ink-3">إدارة محل المياه · الإصدار <span className="num">1.0</span></p>
    </Page>
  );
}
