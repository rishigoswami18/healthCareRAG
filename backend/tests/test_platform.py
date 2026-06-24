import pytest
from backend.app.core.compliance import detect_phi, mask_phi
from backend.app.core.rag import rag_pipeline
from backend.app.core.ml_models import ml_pipeline
from backend.app.core.voice import analyze_sentiment, detect_escalation_risk

def test_phi_detection_and_redaction():
    # Test SSN
    ssn_text = "The patient's social security number is 123-45-6789."
    phi = detect_phi(ssn_text)
    assert phi["has_phi"] is True
    assert "123-45-6789" in phi["matches"]["ssn"]
    
    masked = mask_phi(ssn_text)
    assert "123-45-6789" not in masked
    assert "[MASKED_SSN]" in masked

    # Test Email
    email_text = "Contact me at alice.smith@provider.com"
    masked_email = mask_phi(email_text)
    assert "[MASKED_EMAIL]" in masked_email

def test_ml_denial_predictions():
    # Test simulated claim denial
    # CPT: 22840 (spinal surgery), ICD: I10 (hypertension) -> high denial probability
    denial_prob, reason = ml_pipeline.predict_claim_denial("22840", "I10", 25000.0, 15000.0)
    assert denial_prob > 0.4
    assert "necessity" in reason.lower()

    # CPT: 36415 (blood draw), ICD: E11 (diabetes) -> low denial probability
    denial_prob_ok, reason_ok = ml_pipeline.predict_claim_denial("36415", "E11", 150.0, 120.0)
    assert denial_prob_ok < 0.2

def test_voice_telemetry_sentiment():
    # Frustrated triggers
    angry_speech = "This is ridiculous! I want to speak with your manager immediately. My claim was denied."
    assert analyze_sentiment(angry_speech) == "frustrated"
    assert detect_escalation_risk(angry_speech) is True

    # Neutral triggers
    neutral_speech = "Hello, I would like to verify my active insurance coverage please."
    assert analyze_sentiment(neutral_speech) == "neutral"
    assert detect_escalation_risk(neutral_speech) is False

def test_hybrid_rag_search():
    # Test index exists and performs search
    search_res = rag_pipeline.retrieve_and_generate("What is HIPAA?")
    assert len(search_res["sources"]) > 0
    assert search_res["hallucination_score"] >= 0.0
