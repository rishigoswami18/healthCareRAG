import re
from typing import Dict, Any, List

def analyze_sentiment(text: str) -> str:
    """Classifies sentiment of transcription snippet into satisfied, neutral, or frustrated."""
    frustrated_words = {"denied", "angry", "terrible", "ridiculous", "frustrated", "manager", "supervisor", "unfair", "liar", "scam"}
    satisfied_words = {"thank", "appreciate", "helpful", "great", "awesome", "perfect", "resolved"}

    words = set(re.findall(r"\b\w+\b", text.lower()))
    
    frustrated_hits = len(words.intersection(frustrated_words))
    satisfied_hits = len(words.intersection(satisfied_words))

    if frustrated_hits > satisfied_hits:
        return "frustrated"
    elif satisfied_hits > frustrated_hits:
        return "satisfied"
    return "neutral"

def detect_escalation_risk(text: str) -> bool:
    """Triggers true if critical escalation indicators are found in transcript."""
    escalation_phrases = [
        "manager",
        "supervisor",
        "representative",
        "sue you",
        "unacceptable",
        "cancel my plan",
        "lawyer",
        "ridiculous"
    ]
    normalized = text.lower()
    return any(phrase in normalized for phrase in escalation_phrases)

def generate_coaching_recommendations(text: str) -> List[str]:
    """Generates real-time suggestions to guide the live agent based on the latest transcription."""
    normalized = text.lower()
    coaching = []

    if "denied" in normalized or "claim" in normalized:
        coaching.append("Verify the claim number in the Claims Management System first.")
        coaching.append("Explain the specific denial reason code rather than general policy.")
        coaching.append("Offer to walk through the standard claim appeal filing process.")
    
    if "billing" in normalized or "copay" in normalized or "charge" in normalized or "deductible" in normalized:
        coaching.append("Confirm the member's insurance is primary and the plan eligibility dates.")
        coaching.append("Check if the visit was out-of-network or coded with special procedures.")
        coaching.append("Do not make immediate billing adjustments; offer to file a formal billing dispute.")

    if "prior authorization" in normalized or "pre-auth" in normalized:
        coaching.append("Ask for the specific CPT/procedure code and provider NPI number.")
        coaching.append("Lookup medical necessity documentation requirements in the Knowledge Base.")
        coaching.append("Provide standard pre-auth review timeline: 3-5 business days.")

    if "appointment" in normalized or "schedule" in normalized:
        coaching.append("Search the patient portal and verify current primary care doctor details.")
        coaching.append("Ensure slots booked respect provider calendar limits in the EHR system.")

    # General fallback/sentiment coach tips
    if analyze_sentiment(text) == "frustrated":
        coaching.append("Acknowledge the caller's frustration immediately: 'I understand this is frustrating and want to help.'")
        coaching.append("Maintain a calm, professional tone. Avoid talking over the customer.")
        
    if not coaching:
        coaching.append("Active listening: Confirm verification questions and document in internal log.")
        coaching.append("Maintain progress according to standard service level agreements (SLAs).")

    return coaching

def summarize_call_transcript(transcript: str) -> str:
    """Creates a structured summary of the patient call."""
    if not transcript.strip():
        return "Call session had no audible speech transcription."

    lines = [line.strip() for line in transcript.split("\n") if line.strip()]
    
    # Simple extraction of key sentences
    actions = []
    issues = []
    
    for line in lines:
        if "issue" in line.lower() or "problem" in line.lower() or "why" in line.lower() or "what" in line.lower():
            issues.append(line)
        if "confirm" in line.lower() or "send" in line.lower() or "scheduled" in line.lower() or "will" in line.lower():
            actions.append(line)

    summary_bullets = []
    if issues:
        summary_bullets.append(f"Identified Issues: {issues[0][:100]}...")
    if actions:
        summary_bullets.append(f"Actions Taken / Agreed: {', '.join([a[:60] for a in actions[:2]])}")
        
    summary_text = "Patient call session processed. "
    if summary_bullets:
        summary_text += " | ".join(summary_bullets)
    else:
        # Fallback summary
        summary_text += f"Completed discussion covering: {transcript[:120]}..."

    return summary_text
