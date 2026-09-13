from pydantic import BaseModel, Field


class RefineBody(BaseModel):
    user_text: str = Field(default="", max_length=8000)
    confirm: bool = False
    proceed: bool = False


class AnalysisStatus(BaseModel):
    id: str
    status: str
    ticker: str
    error_text: str | None = None
    report_id: str | None = None
