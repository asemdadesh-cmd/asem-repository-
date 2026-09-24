"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="login-wrap">
      <div className="card login-card stack" style={{ textAlign: "center" }}>
        <h1 className="page-title" style={{ margin: 0 }}>حدث خطأ</h1>
        <p className="hint" style={{ margin: 0 }}>تحقق من الاتصال بالإنترنت ثم حاول مجدداً.</p>
        <button type="button" className="btn" onClick={reset}>
          إعادة المحاولة
        </button>
      </div>
    </main>
  );
}
