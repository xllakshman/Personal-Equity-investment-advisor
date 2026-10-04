import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("eqveste LogoMark", () => {
  it("is a continuous-stroke e with unique gradient ids and no globe", () => {
    const mark = src("components/features/brand/LogoMark.tsx");
    assert.match(mark, /viewBox="0 0 36 36"/);
    assert.match(mark, /M7\.5 18 H28\.5 A10\.5 10\.5 0 1 0 25\.42 25\.42/);
    assert.match(mark, /strokeWidth="4\.6"/);
    assert.match(mark, /x1="6"/);
    assert.match(mark, /offset="35%" stopColor="#bf5af2"/);
    assert.equal(mark.includes("<circle"), false);
    assert.equal(mark.includes("radialGradient"), false);
    assert.equal(mark.includes("globe"), false);
  });

  it("wordmark pairs LogoMark with a gradient v at nav / footer / login sizes", () => {
    const wordmark = src("components/features/brand/EqvesteWordmark.tsx");
    const word = src("components/features/brand/EqvesteWord.tsx");
    const css = src("app/globals.css");
    assert.match(wordmark, /<LogoMark size=\{v\.size\} gid=\{gid\} \/>/);
    assert.match(wordmark, /nav: \{ size: 28/);
    assert.match(wordmark, /footer: \{ size: 24/);
    assert.match(wordmark, /login: \{ size: 32/);
    assert.match(word, /eq<span className="eqveste-word__v">v<\/span>este/);
    assert.match(css, /gap: 10px/);
    assert.match(css, /eqveste-word--nav/);
    assert.match(css, /font-size: 19px/);
    assert.match(css, /font-size: 16px/);
    assert.match(css, /font-size: 21px/);
    assert.match(css, /--bg: #191f30/);
    assert.match(css, /--grad-brand:/);
  });

  it("favicon svg is the continuous e with a transparent background, no globe", () => {
    const fav = src("public/favicon.svg");
    const mock = src("../../docs/mock-ui/favicon.svg");
    const layout = src("app/layout.tsx");
    assert.match(fav, /viewBox="0 0 64 64"/);
    assert.match(fav, /M14 32 H50 A18 18 0 1 0 44\.73 44\.73/);
    assert.match(fav, /stroke-width="8"/);
    assert.equal(fav.includes('rx="15"'), false);
    assert.equal(fav.includes("#191f30"), false);
    assert.equal(fav.includes("<rect"), false);
    assert.equal(fav.includes('r="13.5"'), false);
    assert.equal(fav.includes("<circle"), false);
    assert.equal(fav.includes("<ellipse"), false);
    assert.equal(mock.includes("<rect"), false);
    assert.equal(mock.includes("#191f30"), false);
    assert.match(layout, /url: "\/favicon\.svg"/);
    assert.match(layout, /url: "\/favicon-32\.png"/);
    assert.match(layout, /url: "\/favicon-180\.png"/);
  });
});
