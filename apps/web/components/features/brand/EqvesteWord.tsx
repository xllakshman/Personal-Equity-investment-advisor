export function EqvesteWord({ className }: { className?: string }) {
  return (
    <span className={className ? `${className} eqveste-word` : "eqveste-word"}>
      eq<span className="eqveste-word__v">v</span>este
    </span>
  );
}
