"""List native lab models and classify frontier vs quick by generation gap."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable

import httpx

from thesis_platform.config import Settings
from thesis_platform.native_llm import ANTHROPIC_VERSION, LAB_ORDER, api_key_for_provider

FetchFn = Callable[[str, dict[str, str]], dict[str, Any]]

OPENAI_MODELS_URL = "https://api.openai.com/v1/models"
ANTHROPIC_MODELS_URL = "https://api.anthropic.com/v1/models"
XAI_MODELS_URL = "https://api.x.ai/v1/models"
DEEPSEEK_MODELS_URL = "https://api.deepseek.com/v1/models"

SKIP_TOKENS = (
    "embed",
    "whisper",
    "tts",
    "audio",
    "realtime",
    "image",
    "dall-e",
    "dalle",
    "moderation",
    "transcri",
    "computer-use",
    "babbage",
    "davinci",
    "ada",
    "instruct",
)

SMALL_TOKENS = ("mini", "nano", "lite", "flash", "haiku", "instant")

ANTHROPIC_GAP = 1
DEFAULT_GAP = 2


@dataclass(frozen=True)
class LabModel:
    provider: str
    model_id: str
    label: str
    family: str
    major: int | None
    thesis_class: str


def generation_gap(provider: str) -> int:
    return ANTHROPIC_GAP if provider == "anthropic" else DEFAULT_GAP


def vendor_family(provider: str, model_id: str) -> str:
    mid = model_id.lower()
    if provider == "anthropic":
        for fam in ("opus", "sonnet", "haiku", "fable"):
            if fam in mid:
                return fam
        return "claude"
    if provider == "openai":
        return "gpt"
    if provider == "xai":
        return "grok"
    return "deepseek"


def parse_major(provider: str, model_id: str) -> int | None:
    mid = model_id.lower()
    if provider == "openai":
        found = re.search(r"gpt-(\d+)", mid)
        return int(found.group(1)) if found else None
    if provider == "anthropic":
        found = re.search(r"(?:opus|sonnet|haiku|fable)-(\d+)", mid)
        return int(found.group(1)) if found else None
    if provider == "xai":
        found = re.search(r"grok-(\d+)", mid)
        return int(found.group(1)) if found else None
    found = re.search(r"(?:v|deepseek-)(\d+)", mid)
    return int(found.group(1)) if found else None


def looks_like_chat(model_id: str) -> bool:
    mid = model_id.lower()
    if any(tok in mid for tok in SKIP_TOKENS):
        return False
    return (
        mid.startswith("gpt-")
        or mid.startswith("claude-")
        or mid.startswith("grok-")
        or mid.startswith("deepseek")
    )


def is_small(model_id: str) -> bool:
    mid = model_id.lower()
    return any(tok in mid for tok in SMALL_TOKENS)


def classify_group(models: list[LabModel]) -> list[LabModel]:
    if not models:
        return []
    provider = models[0].provider
    gap = generation_gap(provider)
    majors = [m.major for m in models if m.major is not None]
    latest = max(majors) if majors else None
    out: list[LabModel] = []
    for m in models:
        if provider == "anthropic" and "haiku" in m.model_id.lower():
            thesis = "quick"
        elif m.major is None:
            thesis = "quick" if is_small(m.model_id) else "frontier"
        elif latest is not None and m.major <= latest - gap:
            thesis = "quick"
        else:
            thesis = "frontier"
        out.append(
            LabModel(
                provider=m.provider,
                model_id=m.model_id,
                label=m.label,
                family=m.family,
                major=m.major,
                thesis_class=thesis,
            )
        )
    if len(out) > 1 and not any(m.thesis_class == "quick" for m in out):
        lowest = min(out, key=lambda m: (m.major is None, m.major or 0, m.model_id))
        out = [
            LabModel(
                provider=m.provider,
                model_id=m.model_id,
                label=m.label,
                family=m.family,
                major=m.major,
                thesis_class="quick" if m.model_id == lowest.model_id else m.thesis_class,
            )
            for m in out
        ]
    if not any(m.thesis_class == "frontier" for m in out):
        if all(
            is_small(m.model_id) or "haiku" in m.model_id.lower() for m in out
        ):
            return out
        highest = max(out, key=lambda m: (m.major or 0, m.model_id))
        out = [
            LabModel(
                provider=m.provider,
                model_id=m.model_id,
                label=m.label,
                family=m.family,
                major=m.major,
                thesis_class="frontier" if m.model_id == highest.model_id else m.thesis_class,
            )
            for m in out
        ]
    return out


def classify_models(raw: list[LabModel]) -> list[LabModel]:
    grouped: dict[tuple[str, str], list[LabModel]] = {}
    for m in raw:
        grouped.setdefault((m.provider, m.family), []).append(m)
    classified: list[LabModel] = []
    for group in grouped.values():
        classified.extend(classify_group(group))
    return classified


def catalog_id(provider: str, model_id: str) -> str:
    prefix = {"openai": "oai", "anthropic": "ant", "xai": "xai", "deepseek": "ds"}[provider]
    slug = re.sub(r"[^a-z0-9]+", "", model_id.lower())[:28]
    return f"{prefix}{slug}"[:40]


def human_label(model_id: str) -> str:
    text = model_id.replace("-", " ").replace("_", " ").strip()
    return " ".join(part.upper() if part[:1].isdigit() else part.capitalize() for part in text.split())


def _openai_compat_ids(body: dict[str, Any]) -> list[str]:
    data = body.get("data") or []
    ids: list[str] = []
    if isinstance(data, list):
        for row in data:
            if isinstance(row, dict) and row.get("id"):
                ids.append(str(row["id"]))
    return ids


def _anthropic_ids(body: dict[str, Any]) -> list[str]:
    data = body.get("data") or []
    ids: list[str] = []
    if isinstance(data, list):
        for row in data:
            if not isinstance(row, dict):
                continue
            mid = row.get("id") or row.get("type")
            if mid:
                ids.append(str(mid))
    return ids


def list_ids_for_provider(provider: str, body: dict[str, Any]) -> list[str]:
    if provider == "anthropic":
        return _anthropic_ids(body)
    return _openai_compat_ids(body)


def fetch_provider_models(
    settings: Settings,
    provider: str,
    *,
    fetch: FetchFn | None = None,
) -> list[str]:
    key, env_name = api_key_for_provider(settings, provider)
    if not key:
        raise RuntimeError(f"{env_name} missing")
    url = {
        "openai": OPENAI_MODELS_URL,
        "anthropic": ANTHROPIC_MODELS_URL,
        "xai": XAI_MODELS_URL,
        "deepseek": DEEPSEEK_MODELS_URL,
    }[provider]
    headers = {"Content-Type": "application/json"}
    if provider == "anthropic":
        headers["x-api-key"] = key
        headers["anthropic-version"] = ANTHROPIC_VERSION
    else:
        headers["Authorization"] = f"Bearer {key}"
    if fetch is not None:
        body = fetch(url, headers)
    else:
        resp = httpx.get(url, headers=headers, timeout=30.0)
        if resp.status_code >= 400:
            raise RuntimeError(f"{provider} models HTTP {resp.status_code}")
        body = resp.json()
    return [mid for mid in list_ids_for_provider(provider, body) if looks_like_chat(mid)]


def collect_lab_models(
    settings: Settings,
    *,
    fetch: FetchFn | None = None,
) -> tuple[list[LabModel], list[str], list[str]]:
    """Return (classified models, providers fetched, skipped errors)."""
    raw: list[LabModel] = []
    fetched: list[str] = []
    skipped: list[str] = []
    for provider in LAB_ORDER:
        try:
            ids = fetch_provider_models(settings, provider, fetch=fetch)
        except RuntimeError as exc:
            skipped.append(str(exc))
            continue
        fetched.append(provider)
        for mid in ids:
            raw.append(
                LabModel(
                    provider=provider,
                    model_id=mid,
                    label=human_label(mid),
                    family=vendor_family(provider, mid),
                    major=parse_major(provider, mid),
                    thesis_class="frontier",
                )
            )
    return classify_models(raw), fetched, skipped


def upsert_lab_models(cur, models: list[LabModel]) -> int:
    """Insert or update model_catalog. Matches existing rows on provider + provider_model_id."""
    count = 0
    for i, model in enumerate(models):
        thesis = "frontier" if model.thesis_class == "frontier" else "quick"
        sort_order = (10 if thesis == "frontier" else 50) + i
        min_plan = "professional" if thesis == "frontier" else "trial"
        cost = 150 if thesis == "frontier" else 50
        cid = catalog_id(model.provider, model.model_id)
        cur.execute(
            """
            select id from model_catalog
             where provider = %s and provider_model_id = %s
             limit 1
            """,
            (model.provider, model.model_id),
        )
        existing = cur.fetchone()
        if existing:
            cur.execute(
                """
                update model_catalog
                   set label = %s,
                       thesis_class = %s,
                       tier = %s,
                       vendor_class = %s,
                       is_active = true,
                       sort_order = %s
                 where id = %s
                """,
                (
                    model.label,
                    thesis,
                    "Frontier" if thesis == "frontier" else "Quick",
                    model.family,
                    sort_order,
                    existing["id"] if isinstance(existing, dict) else existing[0],
                ),
            )
            count += 1
            continue
        cur.execute(
            """
            insert into model_catalog (
              id, label, provider, provider_model_id,
              openrouter_model_id, openrouter_only,
              vendor_class, thesis_class, tier, is_refine_gate,
              cost_cents_per_run, min_plan_slug, is_active, sort_order
            ) values (
              %s, %s, %s, %s,
              %s, %s,
              %s, %s, %s, false,
              %s, %s, true, %s
            )
            on conflict (id) do update set
              label = excluded.label,
              provider = excluded.provider,
              provider_model_id = excluded.provider_model_id,
              thesis_class = excluded.thesis_class,
              tier = excluded.tier,
              vendor_class = excluded.vendor_class,
              is_active = true,
              sort_order = excluded.sort_order
            """,
            (
                cid,
                model.label,
                model.provider,
                model.model_id,
                f"{model.provider}/{model.model_id}",
                model.provider,
                model.family,
                thesis,
                "Frontier" if thesis == "frontier" else "Quick",
                cost,
                min_plan,
                sort_order,
            ),
        )
        count += 1
    return count
