import { Suspense } from "react";
import { AuthForm } from "../../src/components/AuthForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <AuthForm mode="login" />
    </Suspense>
  );
}
