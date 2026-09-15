import Link from "next/link";

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div>
      <h1 className="desk__h1">{title}</h1>
      <p className="desk__lede">{body}</p>
      <p className="desk__lede">
        <Link href="/desk" style={{ color: "#2f5f52" }}>
          Back to Home
        </Link>
      </p>
    </div>
  );
}
