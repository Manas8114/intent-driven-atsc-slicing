from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import Literal

router = APIRouter()

class IntentRequest(BaseModel):
    intent: Literal["maximize_coverage", "ensure_emergency_reliability", "optimize_spectrum"] = Field(..., description="High-level operator intent")
    target: float = Field(..., ge=0.0, le=1.0, description="Target value for the intent, e.g., 0.99 for reliability")

    @validator("target")
    def check_target(cls, v, values):
        # Simple sanity checks based on intent type
        intent = values.get("intent")
        if intent == "maximize_coverage" and not (0.0 < v <= 1.0):
            raise ValueError("Coverage target must be between 0 and 1")
        if intent == "ensure_emergency_reliability" and not (0.9 <= v <= 1.0):
            raise ValueError("Reliability target must be >= 0.9")
        if intent == "optimize_spectrum" and not (0.0 < v <= 1.0):
            raise ValueError("Spectrum efficiency target must be between 0 and 1")
        return v

@router.post("/", response_model=dict)
async def submit_intent(request: IntentRequest):
    """Validate and translate a high‑level intent into a formal objective.

    In a full implementation this would forward the request to the AI engine.
    Here we simply echo back a structured representation for downstream services.
    """
    # Basic policy translation – map intent to a constraint dict
    policy = {
        "type": request.intent,
        "target": request.target,
    }
    # In a real system, additional validation against regulatory rules would occur here.
    return {"status": "accepted", "policy": policy}
