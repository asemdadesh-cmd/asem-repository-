import Link from "next/link";

export function NoProducts() {
  return (
    <div className="card empty stack">
      <p style={{ margin: 0, fontWeight: 700 }}>لا توجد أصناف بعد</p>
      <p style={{ margin: 0 }}>أضف صنفاً مثل «بسبوسة» أولاً.</p>
      <Link href="/products" className="btn">
        إضافة صنف
      </Link>
    </div>
  );
}
