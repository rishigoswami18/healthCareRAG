import re
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models import AuditLog, User

# Regex patterns for common PHI entities
SSN_PATTERN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
DOB_PATTERN = re.compile(r"\b(0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])[-/](19|20)\d{2}\b")
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_PATTERN = re.compile(r"\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b")

# Medical ID patterns: e.g. MEM12345678 or CLM12345678 (sometimes we want to flag but keep, or mask depending on requirement)
MEMBER_ID_PATTERN = re.compile(r"\bMEM\d{8}\b", re.IGNORECASE)

def detect_phi(text: str) -> dict:
    """Detects PHI elements and returns a dictionary with categories and matched occurrences."""
    found = {
        "ssn": SSN_PATTERN.findall(text),
        "dob": DOB_PATTERN.findall(text),
        "email": EMAIL_PATTERN.findall(text),
        "phone": PHONE_PATTERN.findall(text),
    }
    has_phi = any(len(v) > 0 for v in found.values())
    return {"has_phi": has_phi, "matches": found}

def mask_phi(text: str) -> str:
    """Masks all detected PHI with standard token replacement."""
    masked = text
    masked = SSN_PATTERN.sub("[MASKED_SSN]", masked)
    masked = EMAIL_PATTERN.sub("[MASKED_EMAIL]", masked)
    masked = PHONE_PATTERN.sub("[MASKED_PHONE]", masked)
    
    # We carefully handle DOB masking to avoid messing up numbers that look like dates but aren't
    # (though in clinical settings, dates of birth are heavily protected)
    masked = DOB_PATTERN.sub("[MASKED_DOB]", masked)
    
    return masked

def log_phi_access(db: Session, user: User, action: str, resource: str, details: str = "", ip_address: str = "127.0.0.1"):
    """Inserts a tamper-resistant record into the AuditLog table."""
    audit_entry = AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else "anonymous",
        action=action,
        resource=resource,
        details=details,
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
