from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    username: str
    role: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        orm_mode = True
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# Claim Schemas
class ClaimBase(BaseModel):
    claim_number: str
    patient_id: str
    patient_name: str
    diagnosis_code: str
    procedure_code: str
    billed_amount: float
    allowed_amount: float
    copay: float
    coinsurance: float
    status: str

class ClaimCreate(ClaimBase):
    pass

class ClaimResponse(ClaimBase):
    id: int
    denied_probability: float
    denial_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Prior Auth Schemas
class PriorAuthCreate(BaseModel):
    patient_id: str
    patient_name: str
    physician_name: str
    procedure_code: str
    clinical_notes: str

class PriorAuthResponse(BaseModel):
    id: int
    patient_id: str
    patient_name: str
    physician_name: str
    procedure_code: str
    clinical_notes: str
    status: str
    submitted_at: datetime
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Billing Dispute Schemas
class BillingDisputeCreate(BaseModel):
    claim_id: int
    patient_name: str
    reason: str
    priority: Optional[str] = "medium"

class BillingDisputeResponse(BaseModel):
    id: int
    claim_id: int
    patient_name: str
    reason: str
    status: str
    priority: str
    resolution_time_est_hours: float
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentCreate(BaseModel):
    patient_id: str
    patient_name: str
    doctor_name: str
    specialty: str
    slot: str

class AppointmentResponse(BaseModel):
    id: int
    patient_id: str
    patient_name: str
    doctor_name: str
    specialty: str
    slot: str
    status: str
    updated_at: datetime

    class Config:
        from_attributes = True

# Call Session Schemas
class CallSessionCreate(BaseModel):
    session_id: str
    caller_name: Optional[str] = None
    patient_id: Optional[str] = None

class CallSessionUpdate(BaseModel):
    transcript: Optional[str] = None
    status: Optional[str] = None
    sentiment: Optional[str] = None
    escalation_detected: Optional[bool] = None
    summary: Optional[str] = None
    coach_notes: Optional[str] = None
    end_time: Optional[datetime] = None

class CallSessionResponse(BaseModel):
    id: int
    session_id: str
    caller_name: Optional[str] = None
    patient_id: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    transcript: str
    summary: Optional[str] = None
    sentiment: str
    escalation_detected: bool
    coach_notes: Optional[str] = None

    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    username: Optional[str] = None
    action: str
    resource: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# Ingestion Schemas
class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    version: int
    status: str
    total_chunks: int
    uploaded_by: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class RAGQuery(BaseModel):
    query: str
    top_k: Optional[int] = 3

class RAGSource(BaseModel):
    id: Optional[str] = None
    document_id: Optional[int] = None
    source_citation: str
    score: float

class RAGResponse(BaseModel):
    query: str
    answer: str
    sources: List[RAGSource]
    hallucination_score: float  # 0.0 to 1.0 (0.0 means completely safe/grounded)
