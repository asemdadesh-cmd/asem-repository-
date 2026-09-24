import Link from "next/link";
import { trayUnit } from "@/lib/format";
import { Avatar } from "./Avatar";
import { ChevronIcon } from "./icons";

export type CustomerRowData = {
  id: number;
  name: string;
  phone: string;
  balance: number;
  valueText: string;
  /** e.g. "منذ 12 يوماً" or "آخر حركة أمس" */
  sub: string;
  overdue: boolean;
};

export function CustomerRow({ c, href }: { c: CustomerRowData; href?: string }) {
  return (
    <Link href={href ?? `/customers/${c.id}`} className="item">
      <Avatar name={c.name} id={c.id} />
      <div className="item-main">
        <div className="item-title">{c.name}</div>
        <div className="item-sub">
          {c.overdue ? <span className="tag danger">{c.sub}</span> : c.sub}
        </div>
      </div>
      <div className="item-end">
        {c.balance > 0 ? (
          <>
            <span className="item-amount">
              <span className="num">{c.balance}</span> <span className="small muted">{trayUnit(c.balance)}</span>
            </span>
            {c.valueText && <span className="small muted num">{c.valueText}</span>}
          </>
        ) : (
          <span className="tag ok">لا شيء عليه</span>
        )}
      </div>
      <ChevronIcon size={18} className="chev" />
    </Link>
  );
}
