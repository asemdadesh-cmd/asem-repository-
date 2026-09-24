import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "الدخول — دفتر الحلويات" };

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/");
  return (
    <main className="login-wrap">
      <div className="card login-card stack">
        <div className="logo" aria-hidden="true">🍯</div>
        <h1 className="page-title" style={{ textAlign: "center", margin: 0 }}>
          دفتر الحلويات
        </h1>
        <p className="hint" style={{ textAlign: "center", margin: 0 }}>
          اكتب كلمة المرور للدخول
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
