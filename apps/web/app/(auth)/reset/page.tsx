import type { Metadata } from "next";

import { AuthShell } from "@/components/features/auth/AuthShell";
import {
  ResetRequestForm,
  ResetUpdateForm,
} from "@/components/features/auth/ResetForm";
import { getOptionalUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Reset password",
};

export default async function ResetPage() {
  const user = await getOptionalUser();
  return (
    <AuthShell>{user ? <ResetUpdateForm /> : <ResetRequestForm />}</AuthShell>
  );
}
