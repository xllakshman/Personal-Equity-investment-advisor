"""P10-02: droplet compose talks to prod, not this laptop or OptimAI."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMPOSE = (ROOT / "infra/docker/docker-compose.yml").read_text(encoding="utf-8")
OVERLAY = (ROOT / "infra/docker/docker-compose.droplet.yml").read_text(encoding="utf-8")
CADDY = (ROOT / "infra/docker/Caddyfile.eqveste.snippet").read_text(encoding="utf-8")
SCRIPT = (ROOT / "tools/deploy/droplet_p10_02.sh").read_text(encoding="utf-8")
DNS = (ROOT / "tools/deploy/porkbun_eqveste_api.py").read_text(encoding="utf-8")
VERCEL = (ROOT / "tools/deploy/vercel_prod.sh").read_text(encoding="utf-8")
API_MAIN = (ROOT / "apps/analysis-api/src/analysis_api/main.py").read_text(encoding="utf-8")
WORKER_MAIN = (ROOT / "apps/analysis-worker/src/analysis_worker/main.py").read_text(
    encoding="utf-8"
)
DOCKERFILE_API = (ROOT / "infra/docker/Dockerfile.api").read_text(encoding="utf-8")
DOCKERFILE_WORKER = (ROOT / "infra/docker/Dockerfile.worker").read_text(encoding="utf-8")


def test_compose_uses_env_prod_not_laptop_env() -> None:
    assert "../../.env.prod" in COMPOSE
    assert ".env.local" not in COMPOSE
    assert "env_file:\n      - ../../.env\n" not in COMPOSE
    assert "cmksomahsfmsjufakryw" not in COMPOSE


def test_compose_cors_is_eqveste_not_port_3100() -> None:
    assert 'THESIS_CORS_ORIGINS: "https://eqveste.com,https://www.eqveste.com"' in COMPOSE
    assert "127.0.0.1:3100" not in COMPOSE


def test_droplet_overlay_does_not_publish_80_443_or_8091() -> None:
    assert "ports: !reset []" in OVERLAY
    assert 'expose:\n      - "8091"' in OVERLAY
    assert "80:80" not in OVERLAY
    assert "443:443" not in OVERLAY
    assert "8091:8091" not in OVERLAY
    assert "container_name: thesis-analysis-api" in OVERLAY
    assert "container_name: thesis-analysis-worker" in OVERLAY


def test_caddy_snippet_is_api_eqveste_not_optimai() -> None:
    assert "api.eqveste.com" in CADDY
    assert "thesis-analysis-api:8091" in CADDY
    assert "api.optimai.in" not in CADDY
    assert "ap.optimai.in" not in CADDY


def test_droplet_script_rsyncs_env_prod_excludes_dev_env() -> None:
    assert "157.245.102.243" in SCRIPT
    assert "/opt/eqveste" in SCRIPT
    assert "--exclude .env" in SCRIPT
    assert "--exclude apps/web/.env.local" in SCRIPT
    assert ".env.prod" in SCRIPT
    assert "docker-compose.droplet.yml" in SCRIPT
    assert "api.eqveste.com" in SCRIPT
    assert "api.optimai.in" not in SCRIPT
    assert "80:443" not in SCRIPT


def test_porkbun_api_record_points_at_droplet_not_vercel() -> None:
    assert 'SUB = "api"' in DNS
    assert 'DROPLET_IP = "157.245.102.243"' in DNS
    assert "76.76.21.21" not in DNS
    assert 'Would NOT change: @, www' in DNS


def test_vercel_script_sets_analysis_api_url_never_service_role() -> None:
    assert "ANALYSIS_API_URL" in VERCEL
    assert "https://api.eqveste.com" in VERCEL
    assert 'vercel env add SUPABASE_SERVICE_KEY' not in VERCEL
    assert 'vercel env add OPENAI_API_KEY' not in VERCEL
    assert "vercel env rm" in VERCEL
    assert "SUPABASE_SERVICE_KEY" in VERCEL


def test_dockerfiles_do_not_copy_env_files() -> None:
    assert "COPY .env" not in DOCKERFILE_API
    assert "COPY .env" not in DOCKERFILE_WORKER
    assert "COPY .env.prod" not in DOCKERFILE_API
    assert "COPY .env.prod" not in DOCKERFILE_WORKER


def test_api_image_installs_playwright_for_pdf_rerender() -> None:
    assert "playwright" in DOCKERFILE_API
    assert "chromium" in DOCKERFILE_API
    assert "playwright" in DOCKERFILE_WORKER


def test_processes_load_dotenv_without_override() -> None:
    """Docker env_file must win over a missing laptop .env."""
    assert 'load_dotenv(ROOT / ".env")' in API_MAIN
    assert 'load_dotenv(ROOT / ".env")' in WORKER_MAIN
    assert "override=True" not in API_MAIN
    assert "override=True" not in WORKER_MAIN
    assert '@app.get("/health")' in API_MAIN
