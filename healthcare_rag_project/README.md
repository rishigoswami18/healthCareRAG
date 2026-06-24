# Healthcare Customer Service RAG Project

A Retrieval-Augmented Generation (RAG) mini-project for a **healthcare customer
service process** covering **Voice, Chat, and Non-Voice (back-office)**
support scenarios.

## What this project does

- Stores a **JSON knowledge base** (`data/healthcare_kb.json`) of real-style
  healthcare support Q&A: appointments, billing, claims, prescriptions,
  insurance, portal issues, prior authorization, HIPAA compliance, and KPIs.
- Builds a **TF-IDF retrieval index** over the knowledge base (the "Retrieval"
  in RAG).
- Given a user query, **retrieves the most relevant entries** and **generates
  a grounded answer** by combining them (the "Generation" step) — fully
  offline, no API key required.

## Project structure

```
healthcare_rag_project/
├── data/
│   └── healthcare_kb.json     # knowledge base (Voice / Chat / Non-Voice entries)
├── rag.py                     # retrieval + answer generation logic
├── requirements.txt
└── README.md
```

## Setup

```bash
pip install -r requirements.txt
```

## Usage

**Single query:**
```bash
python rag.py "What is the status of my claim?"
```

**Interactive mode:**
```bash
python rag.py
```
Then type queries one by one, e.g.:
- "I forgot my portal password"
- "How do I refill my medicine"
- "What does my insurance cover"
- "What is HIPAA"

Type `exit` to quit.

## How the RAG pipeline works

1. **Load** — `healthcare_kb.json` entries are loaded, each tagged with a
   channel (Voice / Chat / Non-Voice / General), category, question, and answer.
2. **Index (Retrieval setup)** — A TF-IDF vectorizer turns every KB question
   into a vector.
3. **Retrieve** — The user's query is vectorized and compared using cosine
   similarity to find the closest matching KB entries.
4. **Generate** — The top match's answer is returned as the primary response;
   if other closely-related entries exist, their guidance is appended as
   additional context. This keeps the answer **grounded in the knowledge
   base** rather than invented.

## Why this matters for healthcare customer service

This mirrors how real healthcare support teams use **knowledge base + search
tools** to quickly find the right answer for a patient/member across
different channels, while staying compliant (e.g., HIPAA identity
verification) and consistent.

## Extending this project

- Add more entries to `data/healthcare_kb.json` to grow the knowledge base.
- Swap TF-IDF for sentence-embedding similarity (e.g., `sentence-transformers`)
  for smarter semantic retrieval.
- Connect `generate_answer()` to an LLM API to rephrase/personalize the final
  answer instead of returning the raw KB text.
- Wrap `rag.py` in a Flask/FastAPI endpoint to turn it into a chat-style web app.
