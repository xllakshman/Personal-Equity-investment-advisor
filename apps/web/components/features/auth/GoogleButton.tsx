"use client";

import { useState } from "react";

import { googleSignInBanner } from "@/lib/auth/google-error";
import { createClient } from "@/lib/supabase/client";

export function GoogleButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div>
      {error ? (
        <p className="auth__banner auth__banner--error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="auth__google"
        disabled={pending}
        onClick={async () => {
          setError(null);
          setPending(true);
          try {
            const supabase = createClient();
            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: `${window.location.origin}/desk`,
                skipBrowserRedirect: true,
              },
            });
            if (oauthError) {
              setError(googleSignInBanner(oauthError.message));
              return;
            }
            if (data.url) {
              window.location.assign(data.url);
              return;
            }
            setError(googleSignInBanner(null));
          } catch (err) {
            setError(
              googleSignInBanner(err instanceof Error ? err.message : null),
            );
          } finally {
            setPending(false);
          }
        }}
      >
        Continue with Google
      </button>
    </div>
  );
}
