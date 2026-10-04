import { LogoMark } from "@/components/features/brand/LogoMark";
import { EqvesteWord } from "@/components/features/brand/EqvesteWord";

const VARIANTS = {
  nav: { size: 28, word: "eqveste-word--nav" },
  footer: { size: 24, word: "eqveste-word--footer" },
  login: { size: 32, word: "eqveste-word--login" },
} as const;

export function EqvesteWordmark({
  variant = "nav",
  gid,
}: {
  variant?: keyof typeof VARIANTS;
  gid: string;
}) {
  const v = VARIANTS[variant];
  return (
    <span className="eqveste-wordmark">
      <LogoMark size={v.size} gid={gid} />
      <EqvesteWord className={v.word} />
    </span>
  );
}
