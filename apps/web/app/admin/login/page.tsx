import type { Metadata } from "next";

import { AuthShell } from "@/components/features/auth/AuthShell";
import { AdminLoginForm } from "@/components/features/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Platform admin",
};

export default function AdminLoginPage() {
  return (
    <AuthShell>
      <AdminLoginForm />
    </AuthShell>
  );
}
