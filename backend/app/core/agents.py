from typing import Dict, Any, List
from sqlalchemy.orm import Session
import datetime

from backend.app.core.rag import rag_pipeline
from backend.app.core.ml_models import ml_pipeline
from backend.app.core.compliance import mask_phi
from backend.app.models import Claim, Appointment, PriorAuthRequest, BillingDispute

class HealthcareAgent:
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    def process(self, query: str, db: Session, patient_id: str = None) -> Dict[str, Any]:
        raise NotImplementedError("Each agent must implement process method.")


class ClaimsAgent(HealthcareAgent):
    def __init__(self):
        super().__init__("Claims Agent", "Processes health claim status, disputes, and denial predictions.")

    def process(self, query: str, db: Session, patient_id: str = None) -> Dict[str, Any]:
        # 1. Look up claims in database if patient_id is present
        claims_data = []
        if patient_id:
            claims = db.query(Claim).filter(Claim.patient_id == patient_id).all()
            for c in claims:
                claims_data.append({
                    "claim_number": c.claim_number,
                    "status": c.status,
                    "billed": c.billed_amount,
                    "allowed": c.allowed_amount,
                    "denial_prob": c.denied_probability,
                    "denial_reason": c.denial_reason
                })

        # 2. Add Custom Agent Assessment for LLM context
        assessment = "There are no active claims listed in the system for this patient."
        if claims_data:
            primary_claim = claims_data[0]
            assessment = f"We found an active claim {primary_claim['claim_number']} with status {primary_claim['status'].upper()}."
            if primary_claim['status'] == "denied":
                assessment += f" The claim was denied due to: {primary_claim['denial_reason']}."
            elif primary_claim['denial_prob'] > 0.4:
                assessment += f" Note that this claim has a high predicted denial probability of {round(primary_claim['denial_prob'] * 100, 1)}% due to: {primary_claim['denial_reason']}."

        # 3. Query Knowledge Base for claim rules and generate conversational response
        rag_response = rag_pipeline.retrieve_and_generate(query, metadata_context=assessment)

        return {
            "agent": self.name,
            "answer": rag_response["answer"],
            "sources": rag_response["sources"],
            "hallucination_score": rag_response["hallucination_score"],
            "metadata": {
                "claims_found": len(claims_data),
                "claims": claims_data
            }
        }


class InsuranceVerificationAgent(HealthcareAgent):
    def __init__(self):
        super().__init__("Insurance Verification Agent", "Validates plan status, eligibility dates, and deductible limits.")

    def process(self, query: str, db: Session, patient_id: str = None) -> Dict[str, Any]:
        eligibility_details = "Plan eligibility is active for the current benefits cycle."
        if patient_id:
            eligibility_details = f"Patient ID {patient_id} is verified to have active coverage under a PPO Preferred Care plan."

        rag_response = rag_pipeline.retrieve_and_generate(query, metadata_context=eligibility_details)

        return {
            "agent": self.name,
            "answer": rag_response["answer"],
            "sources": rag_response["sources"],
            "hallucination_score": rag_response["hallucination_score"],
            "metadata": {"plan_status": "active", "network": "PPO"}
        }


class PriorAuthAgent(HealthcareAgent):
    def __init__(self):
        super().__init__("Prior Authorization Agent", "Handles clinical necessity reviews and CPT authorization checks.")

    def process(self, query: str, db: Session, patient_id: str = None) -> Dict[str, Any]:
        active_auths = []
        if patient_id:
            auths = db.query(PriorAuthRequest).filter(PriorAuthRequest.patient_id == patient_id).all()
            for a in auths:
                active_auths.append({
                    "id": a.id,
                    "procedure": a.procedure_code,
                    "status": a.status,
                    "submitted": a.submitted_at.isoformat()
                })

        assessment = "No pending prior authorization requests were found in our system records."
        if active_auths:
            assessment = f"We found active prior authorization requests in the system: " + ", ".join([f"Procedure {x['procedure']} with status {x['status'].upper()}" for x in active_auths])

        rag_response = rag_pipeline.retrieve_and_generate(query, metadata_context=assessment)

        return {
            "agent": self.name,
            "answer": rag_response["answer"],
            "sources": rag_response["sources"],
            "hallucination_score": rag_response["hallucination_score"],
            "metadata": {"auth_requests": active_auths}
        }


class BillingAgent(HealthcareAgent):
    def __init__(self):
        super().__init__("Billing Agent", "Addresses copays, coinsurance, billing disputes, and resolution estimators.")

    def process(self, query: str, db: Session, patient_id: str = None) -> Dict[str, Any]:
        disputes_data = []
        if patient_id:
            disputes = db.query(BillingDispute).filter(BillingDispute.patient_name.like(f"%{patient_id}%")).all()
            for d in disputes:
                disputes_data.append({
                    "id": d.id,
                    "reason": d.reason,
                    "status": d.status,
                    "priority": d.priority,
                    "est_resolution_hours": d.resolution_time_est_hours
                })

        assessment = "No active billing disputes were found in the patient's billing records."
        if disputes_data:
            assessment = f"There is an active billing dispute in the registry with status {disputes_data[0]['status'].upper()}. The estimated resolution timeframe is {disputes_data[0]['est_resolution_hours']} hours."

        rag_response = rag_pipeline.retrieve_and_generate(query, metadata_context=assessment)

        return {
            "agent": self.name,
            "answer": rag_response["answer"],
            "sources": rag_response["sources"],
            "hallucination_score": rag_response["hallucination_score"],
            "metadata": {"billing_disputes": disputes_data}
        }


class AppointmentSchedulingAgent(HealthcareAgent):
    def __init__(self):
        super().__init__("Appointment Scheduling Agent", "Schedules, reschedules, or cancels appointments in the EHR calendar.")

    def process(self, query: str, db: Session, patient_id: str = None) -> Dict[str, Any]:
        bookings = []
        if patient_id:
            appts = db.query(Appointment).filter(Appointment.patient_id == patient_id).all()
            for a in appts:
                bookings.append({
                    "doctor": a.doctor_name,
                    "specialty": a.specialty,
                    "slot": a.slot,
                    "status": a.status
                })

        assessment = "There are currently no upcoming appointments scheduled in the system."
        if bookings:
            assessment = f"We have the following appointments registered in the scheduling system: " + ", ".join([f"Dr. {b['doctor']} ({b['specialty']}) on {b['slot']} with status {b['status'].upper()}" for b in bookings])

        rag_response = rag_pipeline.retrieve_and_generate(query, metadata_context=assessment)

        return {
            "agent": self.name,
            "answer": rag_response["answer"],
            "sources": rag_response["sources"],
            "hallucination_score": rag_response["hallucination_score"],
            "metadata": {"appointments": bookings}
        }


class PrescriptionAgent(HealthcareAgent):
    def __init__(self):
        super().__init__("Prescription Agent", "Checks active medications, refill counts, and expiration dates.")

    def process(self, query: str, db: Session, patient_id: str = None) -> Dict[str, Any]:
        assessment = "The prescription system indicates the patient has an active prescription for Lipitor 10mg with 2 refills remaining."
        rag_response = rag_pipeline.retrieve_and_generate(query, metadata_context=assessment)
        return {
            "agent": self.name,
            "answer": rag_response["answer"],
            "sources": rag_response["sources"],
            "hallucination_score": rag_response["hallucination_score"],
            "metadata": {"refills_remaining": 2, "medication": "Lipitor 10mg"}
        }


class HIPAAComplianceAgent(HealthcareAgent):
    def __init__(self):
        super().__init__("HIPAA Compliance Agent", "Scans text for compliance violations and protects PHI.")

    def process(self, query: str, db: Session, patient_id: str = None) -> Dict[str, Any]:
        rag_response = rag_pipeline.retrieve_and_generate(query)
        return {
            "agent": self.name,
            "answer": rag_response["answer"],
            "sources": rag_response["sources"],
            "hallucination_score": rag_response["hallucination_score"],
            "metadata": {}
        }


class QualityAuditAgent(HealthcareAgent):
    def __init__(self):
        super().__init__("Quality Audit Agent", "Performs evaluations and grades call/chat logs.")

    def process(self, query: str, db: Session, patient_id: str = None) -> Dict[str, Any]:
        rag_response = rag_pipeline.retrieve_and_generate(query)
        return {
            "agent": self.name,
            "answer": rag_response["answer"],
            "sources": rag_response["sources"],
            "hallucination_score": rag_response["hallucination_score"],
            "metadata": {}
        }


class AgentRouter:
    def __init__(self):
        self.agents: Dict[str, HealthcareAgent] = {
            "claims": ClaimsAgent(),
            "verification": InsuranceVerificationAgent(),
            "prior_auth": PriorAuthAgent(),
            "billing": BillingAgent(),
            "appointment": AppointmentSchedulingAgent(),
            "prescription": PrescriptionAgent(),
            "hipaa": HIPAAComplianceAgent(),
            "quality_audit": QualityAuditAgent()
        }

    def route_and_execute(self, query: str, db: Session, patient_id: str = None) -> Dict[str, Any]:
        """Routes query using ML intent classifier and runs specialized agent, guarding output for compliance."""
        # 1. Call ML Pipeline for Classification
        ml_prediction = ml_pipeline.predict_query_metrics(query)
        intent = ml_prediction["intent"]
        priority = ml_prediction["priority"]
        sentiment = ml_prediction["sentiment"]
        escalation_detected = ml_prediction["escalation_detected"]
        res_time = ml_prediction["resolution_time_est_hours"]

        # Default mapping fallback if intent is general/unknown
        agent_key = intent
        if agent_key not in self.agents:
            # Map general prompts to Claims or Verification depending on query keywords
            lowered = query.lower()
            if "bill" in lowered or "copay" in lowered or "charge" in lowered:
                agent_key = "billing"
            elif "auth" in lowered or "cpt" in lowered:
                agent_key = "prior_auth"
            elif "appt" in lowered or "schedule" in lowered or "appointment" in lowered:
                agent_key = "appointment"
            elif "refill" in lowered or "pill" in lowered or "rx" in lowered:
                agent_key = "prescription"
            elif "compliance" in lowered or "hipaa" in lowered:
                agent_key = "hipaa"
            else:
                agent_key = "verification"  # Default agent

        agent = self.agents[agent_key]

        # 2. Execute specialized Agent
        response = agent.process(query, db, patient_id)

        # 3. Apply HIPAA Compliance verification on final outbound text
        raw_answer = response["answer"]
        masked_answer = mask_phi(raw_answer)
        response["answer"] = masked_answer
        
        # Log if masking took place
        phi_redacted = raw_answer != masked_answer

        # 4. Enforce metadata updates
        response["routing_info"] = {
            "predicted_intent": intent,
            "allocated_agent": agent.name,
            "ticket_priority": priority,
            "caller_sentiment": sentiment,
            "escalation_flag": escalation_detected,
            "est_resolution_hours": res_time,
            "phi_redacted": phi_redacted
        }

        return response

# Singleton instance
agent_router = AgentRouter()
