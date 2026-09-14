"""DEV vs PROD schema parity for P10-00. Comparison only — no SQL writes."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

DEV_PROJECT_REF = "cmksomahsfmsjufakryw"
PROD_PROJECT_REF = "ndgvglcrkbygovlszxze"
DEV_URL = f"https://{DEV_PROJECT_REF}.supabase.co"
PROD_URL = f"https://{PROD_PROJECT_REF}.supabase.co"
MAYA_SEED_RELPATH = "supabase/seed/001_maya_desk.sql"
COUNT_RELATIONS = (
    "users",
    "families",
    "holding_lots",
    "holdings",
    "analysis_requests",
    "reports",
    "plans",
)
NATIVE_LLM_ENV_KEYS = (
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "XAI_API_KEY",
    "DEEPSEEK_API_KEY",
)


@dataclass(frozen=True)
class SchemaInventory:
    project_ref: str
    migrations: tuple[tuple[int, str], ...] = ()
    tables: tuple[str, ...] = ()
    views: tuple[str, ...] = ()
    functions: tuple[str, ...] = ()
    enums: tuple[str, ...] = ()
    rls_on: tuple[str, ...] = ()
    buckets: tuple[str, ...] = ()
    row_counts: dict[str, int | None] = field(default_factory=dict)


@dataclass(frozen=True)
class ParityReport:
    git_files: tuple[tuple[int, str], ...]
    dev_migrations: tuple[tuple[int, str], ...]
    prod_migrations: tuple[tuple[int, str], ...]
    pending_files: tuple[str, ...]
    git_missing_on_dev: tuple[int, ...]
    extra_prod_migrations: tuple[int, ...]
    tables_only_dev: tuple[str, ...]
    tables_only_prod: tuple[str, ...]
    views_only_dev: tuple[str, ...]
    views_only_prod: tuple[str, ...]
    functions_only_dev: tuple[str, ...]
    functions_only_prod: tuple[str, ...]
    enums_only_dev: tuple[str, ...]
    enums_only_prod: tuple[str, ...]
    buckets_only_dev: tuple[str, ...]
    buckets_only_prod: tuple[str, ...]
    rls_only_dev: tuple[str, ...]
    row_counts_dev: dict[str, int | None]
    row_counts_prod: dict[str, int | None]
    native_llm_keys_set: tuple[str, ...]
    seed_would_apply: bool = False
    apply_ok: bool = False
    apply_reason: str = ""


def native_llm_keys_set(env: dict[str, str]) -> tuple[str, ...]:
    return tuple(name for name in NATIVE_LLM_ENV_KEYS if (env.get(name) or "").strip())


def parse_env_file(path: Path) -> dict[str, str]:
    """Parse KEY=value lines. Values are returned to the caller; never log them."""
    out: dict[str, str] = {}
    if not path.is_file():
        raise FileNotFoundError(str(path))
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key:
            out[key] = value
    return out


def project_ref_from_url(url: str) -> str:
    host = url.strip().removeprefix("https://").removeprefix("http://").split("/")[0]
    host = host.split(":")[0]
    if host.startswith("db.") and host.endswith(".supabase.co"):
        return host[len("db.") : -len(".supabase.co")]
    if host.endswith(".supabase.co"):
        return host[: -len(".supabase.co")]
    return host


def assert_env_hosts(*, dev: dict[str, str], prod: dict[str, str]) -> None:
    dev_url = (dev.get("SUPABASE_URL") or "").strip()
    prod_url = (prod.get("SUPABASE_URL") or "").strip()
    if project_ref_from_url(dev_url) != DEV_PROJECT_REF:
        raise RuntimeError("DEV .env SUPABASE_URL is not the DEV project")
    if project_ref_from_url(prod_url) != PROD_PROJECT_REF:
        raise RuntimeError("PROD .env.prod SUPABASE_URL is not the PROD project")
    if project_ref_from_url(dev_url) == project_ref_from_url(prod_url):
        raise RuntimeError("DEV and PROD URLs resolve to the same project")
    prod_next = (prod.get("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
    if prod_next and project_ref_from_url(prod_next) != PROD_PROJECT_REF:
        raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL in .env.prod is not PROD")
    if DEV_PROJECT_REF in prod_url or PROD_PROJECT_REF in dev_url:
        raise RuntimeError("DEV/PROD env files look swapped")
    if not (dev.get("SUPABASE_DB_PASSWORD") or "").strip():
        raise RuntimeError("DEV SUPABASE_DB_PASSWORD is empty")
    if not (prod.get("SUPABASE_DB_PASSWORD") or "").strip():
        raise RuntimeError("PROD SUPABASE_DB_PASSWORD is empty")


def db_host_from_env(env: dict[str, str]) -> str:
    explicit = (env.get("SUPABASE_DB_HOST") or "").strip()
    if explicit:
        return explicit
    ref = project_ref_from_url(env.get("SUPABASE_URL") or "")
    if not ref:
        raise RuntimeError("Cannot derive DB host")
    return f"db.{ref}.supabase.co"


def list_git_migrations(migrations_dir: Path) -> list[tuple[int, Path]]:
    found: list[tuple[int, Path]] = []
    for path in migrations_dir.glob("*.sql"):
        prefix = path.name.split("_", 1)[0]
        if prefix.isdigit():
            found.append((int(prefix), path))
    return sorted(found, key=lambda item: (item[0], item[1].name))


def pending_migration_files(
    git_files: list[tuple[int, Path]],
    prod_ids: set[int],
) -> list[Path]:
    return [path for mid, path in git_files if mid not in prod_ids]


def _only(left: tuple[str, ...], right: tuple[str, ...]) -> tuple[str, ...]:
    right_set = set(right)
    return tuple(name for name in left if name not in right_set)


def apply_gate(
    *,
    git_missing_on_dev: tuple[int, ...],
    extra_prod_migrations: tuple[int, ...],
    tables_only_prod: tuple[str, ...],
    views_only_prod: tuple[str, ...],
) -> tuple[bool, str]:
    if git_missing_on_dev:
        return False, (
            "DEV is missing git migrations "
            f"{list(git_missing_on_dev)}; refuse prod apply until DEV matches git"
        )
    if extra_prod_migrations:
        return False, (
            "PROD schema_migrations has ids not in git "
            f"{list(extra_prod_migrations)}; refuse apply"
        )
    if tables_only_prod or views_only_prod:
        extra = list(tables_only_prod) + list(views_only_prod)
        return False, (
            "PROD public has tables/views DEV does not "
            f"{extra}; refuse apply"
        )
    return True, "safe to apply pending git files (or already at schema parity)"


def build_report(
    *,
    git_files: list[tuple[int, Path]],
    dev: SchemaInventory,
    prod: SchemaInventory,
    native_llm_keys_set: tuple[str, ...],
) -> ParityReport:
    git_ids = {mid for mid, _ in git_files}
    git_listed = tuple((mid, path.name) for mid, path in git_files)
    dev_ids = {mid for mid, _ in dev.migrations}
    prod_ids = {mid for mid, _ in prod.migrations}
    pending = tuple(path.name for path in pending_migration_files(git_files, prod_ids))
    git_missing_on_dev = tuple(sorted(git_ids - dev_ids))
    extra_prod = tuple(sorted(prod_ids - git_ids))
    tables_only_dev = _only(dev.tables, prod.tables)
    tables_only_prod = _only(prod.tables, dev.tables)
    views_only_dev = _only(dev.views, prod.views)
    views_only_prod = _only(prod.views, dev.views)
    ok, reason = apply_gate(
        git_missing_on_dev=git_missing_on_dev,
        extra_prod_migrations=extra_prod,
        tables_only_prod=tables_only_prod,
        views_only_prod=views_only_prod,
    )
    return ParityReport(
        git_files=git_listed,
        dev_migrations=dev.migrations,
        prod_migrations=prod.migrations,
        pending_files=pending,
        git_missing_on_dev=git_missing_on_dev,
        extra_prod_migrations=extra_prod,
        tables_only_dev=tables_only_dev,
        tables_only_prod=tables_only_prod,
        views_only_dev=views_only_dev,
        views_only_prod=views_only_prod,
        functions_only_dev=_only(dev.functions, prod.functions),
        functions_only_prod=_only(prod.functions, dev.functions),
        enums_only_dev=_only(dev.enums, prod.enums),
        enums_only_prod=_only(prod.enums, dev.enums),
        buckets_only_dev=_only(dev.buckets, prod.buckets),
        buckets_only_prod=_only(prod.buckets, dev.buckets),
        rls_only_dev=_only(dev.rls_on, prod.rls_on),
        row_counts_dev=dict(dev.row_counts),
        row_counts_prod=dict(prod.row_counts),
        native_llm_keys_set=native_llm_keys_set,
        seed_would_apply=False,
        apply_ok=ok,
        apply_reason=reason,
    )


def _fmt_ids(pairs: tuple[tuple[int, str], ...]) -> str:
    if not pairs:
        return "(none)"
    ids = [mid for mid, _ in pairs]
    return f"{ids[0]}–{ids[-1]} ({len(ids)} rows)" if len(ids) > 1 else str(ids[0])


def _fmt_names(names: tuple[str, ...], *, limit: int = 40) -> str:
    if not names:
        return "(none)"
    shown = ", ".join(names[:limit])
    if len(names) > limit:
        shown += f" … +{len(names) - limit} more"
    return shown


def format_report(report: ParityReport) -> str:
    pending = "\n".join(f"  {name}" for name in report.pending_files) or "  (none — prod already has every git migration)"
    rows = []
    for name in COUNT_RELATIONS:
        dev_n = report.row_counts_dev.get(name)
        prod_n = report.row_counts_prod.get(name)
        rows.append(
            f"  {name}: DEV={dev_n if dev_n is not None else 'missing'} "
            f"PROD={prod_n if prod_n is not None else 'missing'}"
        )
    gate = "PASS" if report.apply_ok else "FAIL"
    n = len(report.native_llm_keys_set)
    if n == 0:
        native = "0/4 set (worker LLM will fail until pasted)"
    else:
        native = f"{n}/4 set ({', '.join(report.native_llm_keys_set)})"
    return "\n".join(
        [
            "Thesis prod dry-run — read-only; no writes to DEV or PROD.",
            f"Git migrations: {_fmt_ids(report.git_files)}",
            f"DEV schema_migrations: {_fmt_ids(report.dev_migrations)}",
            f"PROD schema_migrations: {_fmt_ids(report.prod_migrations)}",
            f"Would apply to PROD (in order):",
            pending,
            f"Would NOT apply: {MAYA_SEED_RELPATH} (Maya seed — prod book stays empty).",
            f"Seed would apply: {report.seed_would_apply}",
            "",
            "Object gap (DEV has, PROD lacks) — expected while prod is behind:",
            f"  tables: {_fmt_names(report.tables_only_dev)}",
            f"  views: {_fmt_names(report.views_only_dev)}",
            f"  enums: {_fmt_names(report.enums_only_dev)}",
            f"  functions: {_fmt_names(report.functions_only_dev)}",
            f"  RLS-on tables: {_fmt_names(report.rls_only_dev)}",
            f"  storage buckets: {_fmt_names(report.buckets_only_dev)}",
            "",
            "Object gap (PROD has, DEV lacks) — apply refuses if any table/view:",
            f"  tables: {_fmt_names(report.tables_only_prod)}",
            f"  views: {_fmt_names(report.views_only_prod)}",
            f"  extra schema_migrations ids: {list(report.extra_prod_migrations) or '(none)'}",
            f"  git ids missing on DEV: {list(report.git_missing_on_dev) or '(none)'}",
            "",
            "Row counts (Maya on DEV is not a schema mismatch; prod must stay 0 holdings):",
            *rows,
            "",
            f"Native lab keys in .env.prod: {native}",
            f"Apply gate: {gate} — {report.apply_reason}",
            "Writes: CONFIRM_APPLY=1 ./tools/db/apply_prod.sh --apply",
        ]
    )
