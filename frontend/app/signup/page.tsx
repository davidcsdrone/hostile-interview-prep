import { Suspense } from "react";
import { AuthForm } from "../../src/components/AuthForm";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <AuthForm mode="signup" />
    </Suspense>
  );
}
