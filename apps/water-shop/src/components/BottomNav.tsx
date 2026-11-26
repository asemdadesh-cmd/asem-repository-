import { Home, Plus, Users, ScrollText, LayoutGrid } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn, haptic } from '@/lib/utils';

const items = [
  { to: '/', label: 'الرئيسية', icon: Home, end: true },
  { to: '/customers', label: 'الزبائن', icon: Users },
  { to: '/sale', label: 'بيع جديد', icon: Plus, primary: true },
  { to: '/history', label: 'السجل', icon: ScrollText },
  { to: '/more', label: 'المزيد', icon: LayoutGrid },
];

export function BottomNav() {
  return (
    <nav aria-label="التنقل الرئيسي" className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/95 pb-safe backdrop-blur-md">
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2">
        {items.map(({ to, label, icon: Icon, end, primary }) => (
          <li key={to}>
            <NavLink to={to} end={end} onClick={() => haptic(6)}
              className={({ isActive }) => cn('flex flex-col items-center gap-0.5 pb-2 pt-2 text-[0.72rem] font-bold transition-colors',
                isActive ? 'text-brand-700' : 'text-ink-3')}>
              {({ isActive }) => primary ? (
                <>
                  <span className="-mt-7 grid size-15 place-items-center rounded-[1.4rem] bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-[0_10px_22px_-8px_rgb(14_94_111/0.7)] ring-4 ring-bg transition active:scale-95">
                    <Icon className="size-8" strokeWidth={2.6} />
                  </span>
                  <span className={cn(isActive ? 'text-brand-700' : 'text-ink-2')}>{label}</span>
                </>
              ) : (
                <>
                  <span className={cn('grid h-8 w-14 place-items-center rounded-full transition', isActive && 'bg-brand-50')}>
                    <Icon className="size-6" strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
