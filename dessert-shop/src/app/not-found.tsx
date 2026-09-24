import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login-wrap">
      <div className="card login-card stack" style={{ textAlign: "center" }}>
        <h1 className="page-title" style={{ margin: 0 }}>الصفحة غير موجودة</h1>
        <Link href="/" className="btn">
          العودة للزبائن
        </Link>
      </div>
    </main>
  );
}
