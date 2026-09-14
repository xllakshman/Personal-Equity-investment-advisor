"""Thesis analysis HTTP API — port 8091. Does not call the LLM on GET."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
if str(ROOT / "packages" / "python") not in sys.path:
    sys.path.insert(0, str(ROOT / "packages" / "python"))
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(ROOT / ".env")

from analysis_api.api.routes.analysis import router as analysis_router
from analysis_api.api.routes.reports import router as reports_router

app = FastAPI(title="Thesis analysis-api", version="0.1.0")
_origins = [
    o.strip()
    for o in os.environ.get(
        "THESIS_CORS_ORIGINS", "http://127.0.0.1:3100"
    ).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(analysis_router)
app.include_router(reports_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
