from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="agent", nullable=False)  # admin, agent, auditor, compliance
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    claim_number = Column(String, unique=True, index=True, nullable=False)
    patient_id = Column(String, index=True, nullable=False)
    patient_name = Column(String, nullable=False)
    diagnosis_code = Column(String, nullable=False)  # ICD-10 code
    procedure_code = Column(String, nullable=False)  # CPT code
    billed_amount = Column(Float, nullable=False)
    allowed_amount = Column(Float, nullable=False)
    copay = Column(Float, default=0.0)
    coinsurance = Column(Float, default=0.0)
    status = Column(String, default="submitted")  # submitted, in_review, approved, denied
    denied_probability = Column(Float, default=0.0)
    denial_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CallSession(Base):
    __tablename__ = "call_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    patient_id = Column(String, index=True, nullable=True)
    caller_name = Column(String, nullable=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    status = Column(String, default="ongoing")  # ongoing, completed, escalated
    transcript = Column(Text, default="")
    summary = Column(Text, nullable=True)
    sentiment = Column(String, default="neutral")  # satisfied, neutral, frustrated
    escalation_detected = Column(Boolean, default=False)
    coach_notes = Column(Text, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String, nullable=True)
    action = Column(String, nullable=False)  # READ, WRITE, EXPORT, PHI_ACCESS
    resource = Column(String, nullable=False)  # e.g., "Claims - CLM10293", "KnowledgeBase"
    details = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, docx, web
    filepath = Column(String, nullable=True)
    version = Column(Integer, default=1)
    status = Column(String, default="pending")  # pending, indexed, failed
    total_chunks = Column(Integer, default=0)
    uploaded_by = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    chunk_index = Column(Integer, nullable=False)
    text_content = Column(Text, nullable=False)
    source_citation = Column(String, nullable=True)
    tags = Column(String, nullable=True)  # Comma separated

    document = relationship("Document", back_populates="chunks")

class BillingDispute(Base):
    __tablename__ = "billing_disputes"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), nullable=False)
    patient_name = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, default="open")  # open, under_investigation, resolved, closed
    priority = Column(String, default="medium")  # low, medium, high
    resolution_time_est_hours = Column(Float, default=24.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

class PriorAuthRequest(Base):
    __tablename__ = "prior_auth_requests"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    patient_name = Column(String, nullable=False)
    physician_name = Column(String, nullable=False)
    procedure_code = Column(String, nullable=False)  # CPT code
    clinical_notes = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, approved, denied, missing_info
    submitted_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    patient_name = Column(String, nullable=False)
    doctor_name = Column(String, nullable=False)
    specialty = Column(String, nullable=False)
    slot = Column(String, nullable=False)  # ISO Date String or formatted
    status = Column(String, default="scheduled")  # scheduled, rescheduled, cancelled
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
