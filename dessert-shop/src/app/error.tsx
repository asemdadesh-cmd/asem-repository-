"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="auth">
      <div className="auth-card card card-pad stack" style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem" }}>حدث خطأ</h1>
        <p className="muted small">تحقق من الاتصال بالإنترنت ثم حاول مجدداً.</p>
        <button type="button" className="btn" onClick={reset}>
          إعادة المحاولة
        </button>
      </div>
    </main>
  );
}
