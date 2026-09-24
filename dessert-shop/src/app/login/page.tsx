import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "تسجيل الدخول — دفتر الصواني" };

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/");
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-head">
          <LogoMark size={56} />
          <div>
            <h1>دفتر الصواني</h1>
            <p className="muted small">تتبّع الصواني عند كل زبون</p>
          </div>
        </div>
        <div className="card card-pad">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
