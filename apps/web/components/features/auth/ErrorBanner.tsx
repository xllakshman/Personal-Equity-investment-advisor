export function ErrorBanner({
  error,
  notice,
}: {
  error: string | null;
  notice?: string | null;
}) {
  if (error) {
    return (
      <p className="auth__banner auth__banner--error" role="alert">
        {error}
      </p>
    );
  }
  if (notice) {
    return (
      <p className="auth__banner auth__banner--notice" role="status">
        {notice}
      </p>
    );
  }
  return null;
}
