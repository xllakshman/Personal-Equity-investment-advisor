import type { Metadata } from "next";

import { AuthShell } from "@/components/features/auth/AuthShell";
import { SignupForm } from "@/components/features/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
