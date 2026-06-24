import json
import os
import random

KB_PATH = os.path.join("healthcare_rag_project", "data", "healthcare_kb.json")

# Define vocabulary lists for permutations
doctors = ["Vance", "Green", "Miller", "Grey", "House", "Wilson", "Cuddy", "Shepherd", "Bailey", "Yang", "Hunt", "Webber"]
departments = ["Cardiology", "Pediatrics", "Oncology", "Neurology", "Orthopedics", "Dermatology", "Gastroenterology", "Psychiatry"]
medications = ["Lipitor", "Metformin", "Synthroid", "Albuterol", "Gabapentin", "Amoxicillin", "Lisinopril", "Insulin", "Zoloft", "Omeprazole"]
pharmacies = ["CVS Pharmacy", "Walgreens", "Rite Aid", "Walmart Pharmacy", "Costco Pharmacy", "Target CVS"]
procedures = ["MRI Scan", "Blood Panel", "Ultrasound", "X-Ray", "CT Scan", "Endoscopy", "Echocardiogram", "Biopsy"]
cpt_codes = ["74177", "36415", "99213", "22840", "70551", "76830", "93000", "80053"]
diagnosis_codes = ["I10", "E11", "M54", "U07", "J45", "F32", "K21", "L20"]

def generate_entries(count=1000):
    with open(KB_PATH, "r", encoding="utf-8") as f:
        existing = json.load(f)
        
    generated = list(existing)
    existing_ids = {item["id"] for item in existing}
    
    # We will generate "count" entries
    categories = ["Appointment", "Billing", "Prescription", "Insurance", "Claims", "Benefits", "Prior Authorization", "Compliance"]
    channels = ["Voice", "Chat", "Non-Voice"]
    
    for i in range(1, count + 1):
        doc_id = f"G{i:04d}"
        # Make sure ID is unique
        while doc_id in existing_ids:
            doc_id = f"G{random.randint(1000, 9999)}"
            
        category = random.choice(categories)
        channel = random.choice(channels)
        
        if category == "Appointment":
            doc = random.choice(doctors)
            dept = random.choice(departments)
            day = random.choice(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
            question = f"How can I book an appointment with Dr. {doc} in {dept} on {day}?"
            answer = f"To schedule an appointment with Dr. {doc} in the {dept} department on {day}, verify the patient's record, check the doctor's EHR schedule, and book the slot. Confirm the booking details with the patient via SMS."
            
        elif category == "Prescription":
            med = random.choice(medications)
            pharm = random.choice(pharmacies)
            question = f"How do I request a refill for {med} to be sent to {pharm}?"
            answer = f"To process a refill for {med} at {pharm}, pull up the member's medication records, confirm active refills remaining on the prescription, and route the electronic request directly to {pharm}."
            
        elif category == "Billing":
            copay = random.randint(10, 100)
            deductible = random.randint(500, 5000)
            question = f"Why is my specialist copay charge ${copay} before meeting my ${deductible} deductible?"
            answer = f"Check the member's insurance plan summary. Specialist copays of ${copay} are fixed fees that apply to office visits, regardless of whether the annual ${deductible} deductible has been met."
            
        elif category == "Prior Authorization":
            proc = random.choice(procedures)
            cpt = random.choice(cpt_codes)
            question = f"Do I need prior authorization for a {proc} (CPT-{cpt})?"
            answer = f"Prior authorization for {proc} (CPT-{cpt}) depends on the member's plan rules. Submit clinical documentation of medical necessity to the authorization queue for review."
            
        elif category == "Claims":
            claim_num = f"CLM-{random.randint(100000, 999999)}"
            cpt = random.choice(cpt_codes)
            question = f"What is the status of my claim {claim_num} for CPT-{cpt}?"
            answer = f"Search claim {claim_num} in the Claims Registry. Check if the CPT-{cpt} procedure was coded correctly, confirm payment allowance status, and inform the member of the current review stage."
            
        elif category == "Benefits":
            dept = random.choice(departments)
            question = f"Does my standard benefits plan cover {dept} specialist services?"
            answer = f"Standard benefits plan covers {dept} specialist services. The member is responsible for the specialist copay or coinsurance, provided they visit an in-network provider."
            
        elif category == "Insurance":
            icd = random.choice(diagnosis_codes)
            question = f"Is a patient with primary diagnosis {icd} eligible for covered services?"
            answer = f"Eligibility depends on the patient's active enrollment details. Perform an eligibility transaction check for diagnosis code {icd} in the eligibility system."
            
        else: # Compliance
            question = f"What is the HIPAA compliance guideline for transmitting member details via {channel}?"
            answer = f"Under HIPAA privacy rules, transmitting member records via {channel} requires secure channels. Ensure all PHI is encrypted and verify caller identity beforehand."
            
        generated.append({
            "id": doc_id,
            "channel": channel,
            "category": category,
            "question": question,
            "answer": answer
        })
        existing_ids.add(doc_id)
        
    with open(KB_PATH, "w", encoding="utf-8") as f:
        json.dump(generated, f, indent=2)
        
    print(f"Successfully generated and wrote {count} new entries to {KB_PATH}. Total entries: {len(generated)}")

if __name__ == "__main__":
    generate_entries(1000)
