"use client";

export function ExpertToggle({
  expert,
  onChange,
}: {
  expert: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="report__toggle" role="group" aria-label="Reading density">
      <button
        type="button"
        className={expert ? "report__pill" : "report__pill report__pill--on"}
        onClick={() => {
          onChange(false);
          try {
            localStorage.setItem("thesis-report-expert", "0");
          } catch {
            /* ignore */
          }
        }}
      >
        Beginner
      </button>
      <button
        type="button"
        className={expert ? "report__pill report__pill--on" : "report__pill"}
        onClick={() => {
          onChange(true);
          try {
            localStorage.setItem("thesis-report-expert", "1");
          } catch {
            /* ignore */
          }
        }}
      >
        Expert
      </button>
    </div>
  );
}
