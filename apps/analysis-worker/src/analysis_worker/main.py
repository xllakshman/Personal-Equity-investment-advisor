"""Long-running analysis worker. Next.js does not start this process."""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT / "packages" / "python"))
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from thesis_platform.config import Settings  # noqa: E402
from thesis_platform.db import connect  # noqa: E402

from analysis_worker.jobs.run import process_one  # noqa: E402


def main() -> None:
    settings = Settings.from_env()
    interval = float(os.environ.get("WORKER_POLL_SECONDS", "2"))
    while True:
        conn = connect(settings)
        try:
            result = process_one(conn, settings)
            conn.commit()
            if result is None:
                time.sleep(interval)
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


if __name__ == "__main__":
    main()
