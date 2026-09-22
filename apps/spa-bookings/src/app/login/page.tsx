import { redirect } from "next/navigation";

/** Sign-in was removed. Old links and home-screen shortcuts land on the calendar. */
export default function LoginPage() {
  redirect("/calendar");
}
