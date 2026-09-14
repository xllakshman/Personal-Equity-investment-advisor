# Docker

`docker-compose.yml` runs `analysis-api` on **8091** and `analysis-worker` as a long-running consumer. Next.js is not in this file.

Local laptop: keep using repo-root `.env` (DEV). Compose `env_file` is `.env.prod` for a named host.

Example host: [digitalocean.md](digitalocean.md).
