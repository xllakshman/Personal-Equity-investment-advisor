"use client";

export default function DeskSegmentError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h1 className="desk__h1">This page could not load</h1>
      <p className="desk__lede">Try again, or open Portfolio from the left.</p>
      <button type="button" className="desk__btn" onClick={() => reset()}>
        Reload
      </button>
    </div>
  );
}
