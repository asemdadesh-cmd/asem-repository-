import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth">
      <div className="auth-card card card-pad stack" style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem" }}>الصفحة غير موجودة</h1>
        <p className="muted small">ربما حُذف هذا العنصر أو تغيّر الرابط.</p>
        <Link href="/" className="btn">
          العودة للرئيسية
        </Link>
      </div>
    </main>
  );
}
