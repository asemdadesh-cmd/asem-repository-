import Link from "next/link";
import { TagIcon } from "@/components/icons";

export function NoProducts() {
  return (
    <div className="card empty">
      <TagIcon size={40} />
      <p className="empty-title">لا توجد أصناف بعد</p>
      <p className="small" style={{ marginBottom: 16 }}>
        أضف صنفاً مثل «بسبوسة» مع سعر الصينية أولاً.
      </p>
      <Link href="/products" className="btn">
        إضافة صنف
      </Link>
    </div>
  );
}
