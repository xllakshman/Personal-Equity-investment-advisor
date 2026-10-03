import Link from "next/link";

export default function DeskNotFound() {
  return (
    <div>
      <h1 className="desk__h1">That page was not found</h1>
      <p className="desk__lede">Open Analyse a stock to start a new run.</p>
      <p className="bld__actions" style={{ marginTop: 18 }}>
        <Link href="/analyse" className="desk__btn">
          Analyse a stock
        </Link>
        <Link href="/desk">Back to Home</Link>
      </p>
    </div>
  );
}
