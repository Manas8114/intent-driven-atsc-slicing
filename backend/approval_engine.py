"""
approval_engine.py - Human Override and Approval Workflow for Broadcast Operations

This module implements a mandatory human-in-the-loop approval system for all AI
configuration recommendations. In real broadcasting, engineers must approve changes
before deployment.

States:
    AI_RECOMMENDED: AI has generated a configuration recommendation
    AWAITING_HUMAN_APPROVAL: Recommendation is pending engineer review
    ENGINEER_APPROVED: Engineer has approved the recommendation
    DEPLOYED: Configuration has been applied (simulated)
    REJECTED: Engineer rejected the recommendation
    EMERGENCY_OVERRIDE: Emergency bypass - logged but not requiring approval

CRITICAL: AI output NEVER goes directly to deployment unless emergency override is active.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from enum import Enum
from dataclasses import dataclass, field
import threading
import uuid


router = APIRouter()


# ============================================================================
# Approval State Machine
# ============================================================================

class ApprovalState(str, Enum):
    """States in the approval workflow."""
    AI_RECOMMENDED = "ai_recommended"
    AWAITING_HUMAN_APPROVAL = "awaiting_human_approval"
    ENGINEER_APPROVED = "engineer_approved"
    DEPLOYED = "deployed"
    REJECTED = "rejected"
    EMERGENCY_OVERRIDE = "emergency_override"


@dataclass
class StateTransition:
    """Record of a state transition for audit purposes."""
    from_state: ApprovalState
    to_state: ApprovalState
    timestamp: datetime
    actor: str  # "AI", "ENGINEER:<name>", "SYSTEM:EMERGENCY"
    reason: Optional[str] = None


@dataclass
class ApprovalRecord:
    """
    Complete record of an AI recommendation and its approval lifecycle.
    
    This is the core data structure ensuring traceability of all decisions.
    """
    id: str
    created_at: datetime
    
    # AI Recommendation (Read-Only after creation)
    recommended_config: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    expected_impact: Dict[str, Any]
    comparison_with_previous: Dict[str, Any]
    human_readable_summary: str
    
    # Current State
    state: ApprovalState = ApprovalState.AI_RECOMMENDED
    
    # Audit Trail
    transitions: List[StateTransition] = field(default_factory=list)
    
    # Engineer Feedback (if any)
    engineer_comment: Optional[str] = None
    approved_by: Optional[str] = None


# ============================================================================
# Approval Engine (Thread-Safe Singleton)
# ============================================================================

class ApprovalEngine:
    """
    Thread-safe approval workflow engine.
    
    Ensures that all AI recommendations pass through human review before
    any simulated "deployment" occurs. Emergency mode provides bypass
    capability with full logging.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._records: Dict[str, ApprovalRecord] = {}
        self._records_lock = threading.Lock()
        self._audit_log: List[Dict[str, Any]] = []
        self._last_deployed_config: Optional[Dict[str, Any]] = None
        self._initialized = True
    
    def submit_recommendation(
        self,
        recommended_config: Dict[str, Any],
        risk_assessment: Dict[str, Any],
        expected_impact: Dict[str, Any],
        comparison_with_previous: Dict[str, Any],
        human_readable_summary: str,
        is_emergency: bool = False
    ) -> str:
        """
        Submit an AI recommendation for approval.
        
        Args:
            recommended_config: The proposed ATSC 3.0 configuration
            risk_assessment: AI-generated risk analysis
            expected_impact: Expected KPI changes
            comparison_with_previous: Delta from current config
            human_readable_summary: Plain-English explanation
            is_emergency: If True, bypasses approval with logging
            
        Returns:
            Unique approval record ID
        """
        record_id = str(uuid.uuid4())[:8]
        now = datetime.now(timezone.utc)
        
        record = ApprovalRecord(
            id=record_id,
            created_at=now,
            recommended_config=recommended_config,
            risk_assessment=risk_assessment,
            expected_impact=expected_impact,
            comparison_with_previous=comparison_with_previous,
            human_readable_summary=human_readable_summary,
        )
        
        # Initial state transition
        initial_transition = StateTransition(
            from_state=ApprovalState.AI_RECOMMENDED,
            to_state=ApprovalState.AWAITING_HUMAN_APPROVAL,
            timestamp=now,
            actor="AI",
            reason="AI recommendation generated"
        )
        record.transitions.append(initial_transition)
        record.state = ApprovalState.AWAITING_HUMAN_APPROVAL
        
        # Emergency override path
        if is_emergency:
            emergency_transition = StateTransition(
                from_state=ApprovalState.AWAITING_HUMAN_APPROVAL,
                to_state=ApprovalState.EMERGENCY_OVERRIDE,
                timestamp=now,
                actor="SYSTEM:EMERGENCY",
                reason="Emergency escalation active - bypassing human approval"
            )
            record.transitions.append(emergency_transition)
            record.state = ApprovalState.EMERGENCY_OVERRIDE
            
            # Auto-deploy in emergency
            deploy_transition = StateTransition(
                from_state=ApprovalState.EMERGENCY_OVERRIDE,
                to_state=ApprovalState.DEPLOYED,
                timestamp=now,
                actor="SYSTEM:EMERGENCY",
                reason="Emergency auto-deployment"
            )
            record.transitions.append(deploy_transition)
            record.state = ApprovalState.DEPLOYED
            self._last_deployed_config = recommended_config
            
            self._log_audit_event("EMERGENCY_OVERRIDE", record_id, {
                "config": recommended_config,
                "reason": "Emergency system bypass"
            })
        
        with self._records_lock:
            self._records[record_id] = record
            
            # Cap records to prevent memory leak (keep max 500)
            if len(self._records) > 500:
                # Remove oldest DEPLOYED or REJECTED records first
                removable = [
                    (k, v) for k, v in self._records.items()
                    if v.state in (ApprovalState.DEPLOYED, ApprovalState.REJECTED)
                ]
                removable.sort(key=lambda x: x[1].created_at)
                if removable:
                    del self._records[removable[0][0]]
        
        self._log_audit_event("RECOMMENDATION_SUBMITTED", record_id, {
            "is_emergency": is_emergency,
            "state": record.state.value
        })
        
        return record_id
    
    def approve(
        self,
        record_id: str,
        engineer_name: str,
        comment: Optional[str] = None
    ) -> ApprovalRecord:
        """
        Engineer approves a pending recommendation.
        
        Args:
            record_id: ID of the approval record
            engineer_name: Name of approving engineer
            comment: Optional approval comment
            
        Returns:
            Updated ApprovalRecord
            
        Raises:
            ValueError: If record not found or not in approvable state
        """
        with self._records_lock:
            if record_id not in self._records:
                raise ValueError(f"Approval record {record_id} not found")
            
            record = self._records[record_id]
            
            if record.state != ApprovalState.AWAITING_HUMAN_APPROVAL:
                raise ValueError(
                    f"Cannot approve record in state {record.state.value}. "
                    f"Only AWAITING_HUMAN_APPROVAL can be approved."
                )
            
            now = datetime.now(timezone.utc)
            
            # Transition to approved
            approve_transition = StateTransition(
                from_state=record.state,
                to_state=ApprovalState.ENGINEER_APPROVED,
                timestamp=now,
                actor=f"ENGINEER:{engineer_name}",
                reason=comment or "Approved without comment"
            )
            record.transitions.append(approve_transition)
            record.state = ApprovalState.ENGINEER_APPROVED
            record.engineer_comment = comment
            record.approved_by = engineer_name
            
            # Auto-deploy after approval
            deploy_transition = StateTransition(
                from_state=ApprovalState.ENGINEER_APPROVED,
                to_state=ApprovalState.DEPLOYED,
                timestamp=now,
                actor="SYSTEM",
                reason="Deploying engineer-approved configuration"
            )
            record.transitions.append(deploy_transition)
            record.state = ApprovalState.DEPLOYED
            self._last_deployed_config = record.recommended_config
        
        self._log_audit_event("APPROVED", record_id, {
            "engineer": engineer_name,
            "comment": comment
        })
        
        return record
    
    def reject(
        self,
        record_id: str,
        engineer_name: str,
        reason: str
    ) -> ApprovalRecord:
        """
        Engineer rejects a pending recommendation.
        
        Args:
            record_id: ID of the approval record
            engineer_name: Name of rejecting engineer
            reason: Mandatory rejection reason
            
        Returns:
            Updated ApprovalRecord
        """
        with self._records_lock:
            if record_id not in self._records:
                raise ValueError(f"Approval record {record_id} not found")
            
            record = self._records[record_id]
            
            if record.state != ApprovalState.AWAITING_HUMAN_APPROVAL:
                raise ValueError(
                    f"Cannot reject record in state {record.state.value}"
                )
            
            now = datetime.now(timezone.utc)
            
            reject_transition = StateTransition(
                from_state=record.state,
                to_state=ApprovalState.REJECTED,
                timestamp=now,
                actor=f"ENGINEER:{engineer_name}",
                reason=reason
            )
            record.transitions.append(reject_transition)
            record.state = ApprovalState.REJECTED
            record.engineer_comment = reason
        
        self._log_audit_event("REJECTED", record_id, {
            "engineer": engineer_name,
            "reason": reason
        })
        
        return record
    
    def get_pending(self) -> List[ApprovalRecord]:
        """Get all records awaiting human approval."""
        with self._records_lock:
            return [
                r for r in self._records.values()
                if r.state == ApprovalState.AWAITING_HUMAN_APPROVAL
            ]
    
    def get_record(self, record_id: str) -> Optional[ApprovalRecord]:
        """Get a specific approval record by ID."""
        with self._records_lock:
            return self._records.get(record_id)
    
    def get_all_records(self) -> List[ApprovalRecord]:
        """Get all approval records (for dashboard display)."""
        with self._records_lock:
            return list(self._records.values())
    
    def get_last_deployed_config(self) -> Optional[Dict[str, Any]]:
        """Get the most recently deployed configuration."""
        return self._last_deployed_config
    
    def get_audit_log(self) -> List[Dict[str, Any]]:
        """Get complete audit trail."""
        return self._audit_log.copy()
    
    def _log_audit_event(
        self,
        event_type: str,
        record_id: str,
        details: Dict[str, Any]
    ):
        """Internal audit logging."""
        self._audit_log.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": event_type,
            "record_id": record_id,
            "details": details
        })
        # Cap audit log to prevent memory leak (keep last 1000 entries)
        if len(self._audit_log) > 1000:
            self._audit_log.pop(0)


# Global singleton instance
approval_engine = ApprovalEngine()


# ============================================================================
# API Models
# ============================================================================

class ApproveRequest(BaseModel):
    """Request to approve a pending recommendation."""
    approval_id: str = Field(..., description="ID of the approval record")
    engineer_name: str = Field(..., description="Name of approving engineer")
    comment: Optional[str] = Field(None, description="Optional approval comment")


class RejectRequest(BaseModel):
    """Request to reject a pending recommendation."""
    approval_id: str = Field(..., description="ID of the approval record")
    engineer_name: str = Field(..., description="Name of rejecting engineer")
    reason: str = Field(..., description="Mandatory rejection reason")


class EmergencyOverrideRequest(BaseModel):
    """Request for emergency override (bypasses approval)."""
    config: Dict[str, Any] = Field(..., description="Emergency configuration")
    reason: str = Field(..., description="Justification for emergency override")
    authorized_by: str = Field(..., description="Name of authorizing engineer")


class ApprovalRecordResponse(BaseModel):
    """API response for an approval record."""
    id: str
    created_at: str
    state: str
    recommended_config: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    expected_impact: Dict[str, Any]
    human_readable_summary: str
    engineer_comment: Optional[str]
    approved_by: Optional[str]
    transition_count: int


def record_to_response(record: ApprovalRecord) -> ApprovalRecordResponse:
    """Convert ApprovalRecord to API response."""
    return ApprovalRecordResponse(
        id=record.id,
        created_at=record.created_at.isoformat(),
        state=record.state.value,
        recommended_config=record.recommended_config,
        risk_assessment=record.risk_assessment,
        expected_impact=record.expected_impact,
        human_readable_summary=record.human_readable_summary,
        engineer_comment=record.engineer_comment,
        approved_by=record.approved_by,
        transition_count=len(record.transitions)
    )


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/pending", response_model=List[ApprovalRecordResponse])
async def get_pending_approvals():
    """
    Get all pending approval requests.
    
    Returns recommendations that are awaiting human approval.
    These must be approved or rejected before deployment.
    """
    pending = approval_engine.get_pending()
    return [record_to_response(r) for r in pending]


@router.get("/all", response_model=List[ApprovalRecordResponse])
async def get_all_approvals():
    """
    Get all approval records (pending, approved, rejected, deployed).
    
    Useful for dashboard display and audit review.
    """
    records = approval_engine.get_all_records()
    return [record_to_response(r) for r in records]


@router.get("/{approval_id}", response_model=ApprovalRecordResponse)
async def get_approval(approval_id: str):
    """Get a specific approval record by ID."""
    record = approval_engine.get_record(approval_id)
    if not record:
        raise HTTPException(status_code=404, detail="Approval record not found")
    return record_to_response(record)


@router.post("/approve", response_model=ApprovalRecordResponse)
async def approve_recommendation(request: ApproveRequest):
    """
    Approve a pending AI recommendation.
    
    The recommendation will be deployed after approval.
    This action is logged for audit purposes.
    """
    try:
        record = approval_engine.approve(
            request.approval_id,
            request.engineer_name,
            request.comment
        )
        return record_to_response(record)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reject", response_model=ApprovalRecordResponse)
async def reject_recommendation(request: RejectRequest):
    """
    Reject a pending AI recommendation.
    
    A reason is required for rejection.
    This action is logged for audit purposes.
    """
    try:
        record = approval_engine.reject(
            request.approval_id,
            request.engineer_name,
            request.reason
        )
        return record_to_response(record)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/emergency-override", response_model=ApprovalRecordResponse)
async def emergency_override(request: EmergencyOverrideRequest):
    """
    Emergency override - bypass normal approval workflow.
    
    WARNING: This should only be used in true emergency situations.
    All emergency overrides are prominently logged for audit.
    """
    record_id = approval_engine.submit_recommendation(
        recommended_config=request.config,
        risk_assessment={"level": "emergency_bypass", "note": "Manual override"},
        expected_impact={"immediate": True, "reason": request.reason},
        comparison_with_previous={},
        human_readable_summary=f"EMERGENCY OVERRIDE by {request.authorized_by}: {request.reason}",
        is_emergency=True
    )
    
    record = approval_engine.get_record(record_id)
    if record:
        return record_to_response(record)
    raise HTTPException(status_code=500, detail="Emergency override failed")


@router.get("/audit/log")
async def get_audit_log():
    """
    Get complete audit trail of all approval actions.
    
    Includes timestamps, actors, and details for compliance review.
    """
    return {"audit_log": approval_engine.get_audit_log()}


@router.get("/status/last-deployed")
async def get_last_deployed():
    """Get the most recently deployed configuration."""
    config = approval_engine.get_last_deployed_config()
    return {
        "has_deployed_config": config is not None,
        "config": config
    }
