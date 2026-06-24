"""
Healthcare Customer Service RAG Project
----------------------------------------
A simple Retrieval-Augmented Generation (RAG) system built on a JSON knowledge
base covering Voice, Chat, and Non-Voice (back-office) processes for a
healthcare customer service operation.

How it works:
1. Loads Q&A knowledge base entries from data/healthcare_kb.json
2. Builds a TF-IDF vector index over the questions (retrieval step)
3. For a user query, finds the most relevant knowledge base entries (retrieval)
4. "Generates" a grounded answer by combining the retrieved entries
   (generation step) — no external API key needed, fully runs offline.

Run:
    python rag.py "How do I check claim status?"
    python rag.py            (interactive mode)
"""

import json
import sys
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "healthcare_kb.json")


class HealthcareRAG:
    def __init__(self, data_path=DATA_PATH):
        with open(data_path, "r", encoding="utf-8") as f:
            self.kb = json.load(f)

        # Combine question + category + channel for richer retrieval signal
        self.corpus = [
            f"{item['channel']} {item['category']} {item['question']}"
            for item in self.kb
        ]

        self.vectorizer = TfidfVectorizer(stop_words="english")
        self.doc_matrix = self.vectorizer.fit_transform(self.corpus)

    def retrieve(self, query, top_k=3):
        """Retrieve top_k most relevant KB entries for the query."""
        query_vec = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vec, self.doc_matrix).flatten()
        ranked_idx = scores.argsort()[::-1][:top_k]
        results = []
        for idx in ranked_idx:
            if scores[idx] > 0:
                entry = self.kb[idx]
                results.append({**entry, "score": round(float(scores[idx]), 3)})
        return results

    def generate_answer(self, query, top_k=3):
        """Retrieve relevant entries and compose a grounded answer."""
        retrieved = self.retrieve(query, top_k=top_k)

        if not retrieved:
            return {
                "query": query,
                "answer": "I couldn't find a relevant answer in the knowledge base. "
                          "Please escalate this query to a senior agent or supervisor.",
                "sources": []
            }

        best = retrieved[0]
        answer = best["answer"]

        # If there are closely related secondary matches, append extra context
        extra_context = [
            r["answer"] for r in retrieved[1:]
            if r["score"] >= best["score"] * 0.6
        ]
        if extra_context:
            answer += "\n\nAdditional related guidance:\n- " + "\n- ".join(extra_context)

        return {
            "query": query,
            "channel": best["channel"],
            "category": best["category"],
            "answer": answer,
            "sources": [
                {"id": r["id"], "channel": r["channel"], "category": r["category"], "score": r["score"]}
                for r in retrieved
            ]
        }


def print_result(result):
    print("\n" + "=" * 70)
    print(f"Query   : {result['query']}")
    if "channel" in result:
        print(f"Channel : {result['channel']}  |  Category: {result['category']}")
    print("-" * 70)
    print("Answer  :")
    print(result["answer"])
    if result["sources"]:
        print("-" * 70)
        print("Retrieved from knowledge base entries:")
        for s in result["sources"]:
            print(f"  [{s['id']}] {s['channel']} / {s['category']}  (relevance: {s['score']})")
    print("=" * 70 + "\n")


def main():
    rag = HealthcareRAG()

    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        result = rag.generate_answer(query)
        print_result(result)
        return

    print("Healthcare Customer Service RAG Assistant")
    print("Type a patient/member query (Voice, Chat, or Non-Voice related).")
    print("Type 'exit' to quit.\n")
    while True:
        query = input("Query> ").strip()
        if query.lower() in ("exit", "quit"):
            break
        if not query:
            continue
        result = rag.generate_answer(query)
        print_result(result)


if __name__ == "__main__":
    main()
