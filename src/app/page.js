import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginScreen from "@/components/LoginScreen";

export default function Home() {
  const session = getSession();

  if (session?.accessToken) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-900">
      <LoginScreen />
    </main>
  );
}
