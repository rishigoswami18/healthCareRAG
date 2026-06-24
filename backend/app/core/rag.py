import json
import os
import numpy as np
import re
import requests
from typing import List, Dict, Any, Tuple
from backend.app.config import settings

# Gracefully import FAISS, SentenceTransformers, and BM25, providing robust fallbacks if they are missing
try:
    import faiss
    HAS_FAISS = True
except ImportError:
    HAS_FAISS = False

try:
    from sentence_transformers import SentenceTransformer
    HAS_ST = True
except ImportError:
    HAS_ST = False

try:
    from rank_bm25 import BM25Okapi
    HAS_BM25 = True
except ImportError:
    HAS_BM25 = False


class OfflineEmbedder:
    """A resilient, zero-dependency embedding generator in case SentenceTransformers isn't loaded."""
    def __init__(self, dimension=384):
        self.dimension = dimension
        np.random.seed(42)

    def encode(self, texts: List[str]) -> np.ndarray:
        # Generate stable mock dense vectors based on text hash to ensure deterministic retrieval
        vectors = []
        for text in texts:
            vec = np.zeros(self.dimension)
            # Create a simple deterministic vector from characters
            for idx, char in enumerate(text[:self.dimension]):
                vec[idx % self.dimension] += ord(char)
            # Normalize vector
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            vectors.append(vec)
        return np.array(vectors, dtype=np.float32)


class SimpleBM25Fallback:
    """A lightweight BM25/TF-IDF style fallback keyword matching class."""
    def __init__(self, corpus: List[str]):
        self.corpus = [text.lower().split() for text in corpus]
        self.doc_freqs = {}
        for doc in self.corpus:
            for word in set(doc):
                self.doc_freqs[word] = self.doc_freqs.get(word, 0) + 1
        self.N = len(corpus)

    def get_scores(self, query: List[str]) -> np.ndarray:
        scores = np.zeros(self.N)
        for idx, doc in enumerate(self.corpus):
            score = 0.0
            for word in query:
                if word in doc:
                    tf = doc.count(word)
                    df = self.doc_freqs.get(word, 0)
                    idf = np.log((self.N - df + 0.5) / (df + 0.5) + 1.0)
                    # Simple BM25 scoring
                    score += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (len(doc) / 15.0)))
            scores[idx] = score
        return scores


class HealthcareHybridRAG:
    def __init__(self):
        self.kb_entries: List[Dict[str, Any]] = []
        self.load_initial_knowledge_base()

        # Initialize Embedder (SentenceTransformer or fallback)
        self.dimension = 384
        if HAS_ST:
            try:
                self.embedder = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
                # MiniLM model uses 384 dimensions
                self.dimension = self.embedder.get_sentence_embedding_dimension()
            except Exception:
                self.embedder = OfflineEmbedder(self.dimension)
        else:
            self.embedder = OfflineEmbedder(self.dimension)

        # Build Index lists
        self.rebuild_indices()

    def load_initial_knowledge_base(self):
        # Load from JSON path if exists
        path = settings.KB_JSON_PATH
        if not os.path.exists(path):
            # Fallback path try
            parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            path = os.path.join(parent_dir, "healthcare_rag_project", "data", "healthcare_kb.json")

        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                self.kb_entries = json.load(f)
        else:
            # Create synthetic default knowledge entries if not found
            self.kb_entries = [
                {
                    "id": "G001",
                    "channel": "General",
                    "category": "Compliance",
                    "question": "What is HIPAA and why does it matter in customer service?",
                    "answer": "HIPAA (Health Insurance Portability and Accountability Act) protects patient health information. Agents must verify identity before discussing any health details and must never share PHI with unauthorized individuals."
                }
            ]

    def add_knowledge_chunk(self, chunk_id: str, channel: str, category: str, question: str, answer: str):
        """Allows dynamically adding documents/chunks from the ingestion pipeline."""
        self.kb_entries.append({
            "id": chunk_id,
            "channel": channel,
            "category": category,
            "question": question,
            "answer": answer
        })
        self.rebuild_indices()

    def rebuild_indices(self):
        """Indexes or re-indexes the corpus into FAISS and BM25."""
        if not self.kb_entries:
            return

        self.corpus = [
            f"{item.get('channel', '')} {item.get('category', '')} {item.get('question', '')} {item.get('answer', '')}"
            for item in self.kb_entries
        ]

        # 1. Sparse Index (BM25)
        if HAS_BM25:
            tokenized_corpus = [doc.lower().split() for doc in self.corpus]
            self.bm25 = BM25Okapi(tokenized_corpus)
        else:
            self.bm25 = SimpleBM25Fallback(self.corpus)

        # 2. Dense Index (FAISS)
        embeddings = self.embedder.encode(self.corpus)
        embeddings = np.array(embeddings, dtype=np.float32)

        if HAS_FAISS:
            self.faiss_index = faiss.IndexFlatIP(self.dimension)  # Inner Product similarity (cosine equivalent when normalized)
            faiss.normalize_L2(embeddings)
            self.faiss_index.add(embeddings)
        else:
            # Simple list storage for pure NumPy search fallback
            self.dense_embeddings = embeddings

    def rewrite_query(self, query: str) -> str:
        """Expands typical healthcare acronyms and typos to improve query recall."""
        synonyms = {
            r"\bauth\b": "prior authorization",
            r"\brefill\b": "prescription refill renewal",
            r"\bcopay\b": "copayment cost fee",
            r"\bportal\b": "patient website portal log-in",
            r"\bhipaa\b": "hipaa privacy security compliance",
            r"\bclaim\b": "claim processing reimbursement status",
            r"\bdeductible\b": "deductible out-of-pocket remaining limit",
        }
        rewritten = query.lower()
        for pattern, replacement in synonyms.items():
            rewritten = re.sub(pattern, replacement, rewritten)
        return rewritten

    def hybrid_search(self, query: str, top_k: int = 3) -> List[Tuple[int, float]]:
        """Performs hybrid retrieval by combining BM25 keyword matching and FAISS dense matching using Reciprocal Rank Fusion."""
        rewritten = self.rewrite_query(query)
        
        # 1. Dense search
        query_emb = self.embedder.encode([rewritten])
        query_emb = np.array(query_emb, dtype=np.float32)
        
        dense_results = []
        if HAS_FAISS:
            faiss.normalize_L2(query_emb)
            scores, indices = self.faiss_index.search(query_emb, len(self.kb_entries))
            dense_results = list(zip(indices[0], scores[0]))
        else:
            # Fallback numpy matrix multiplication
            norm_query = query_emb / (np.linalg.norm(query_emb) + 1e-9)
            norm_dense = self.dense_embeddings / (np.linalg.norm(self.dense_embeddings, axis=1, keepdims=True) + 1e-9)
            scores = np.dot(norm_dense, norm_query.T).flatten()
            dense_results = list(enumerate(scores))

        # Sort dense by score descending
        dense_ranked = sorted(dense_results, key=lambda x: x[1], reverse=True)

        # 2. Sparse search (BM25)
        tokenized_query = rewritten.lower().split()
        if HAS_BM25:
            sparse_scores = self.bm25.get_scores(tokenized_query)
        else:
            sparse_scores = self.bm25.get_scores(tokenized_query)

        sparse_ranked = sorted(enumerate(sparse_scores), key=lambda x: x[1], reverse=True)

        # 3. Reciprocal Rank Fusion (RRF)
        # RRF formula: Score(d) = sum(1 / (k + rank_i(d)))
        rrf_scores = {}
        rrf_constant = 60  # Standard hyperparameter
        
        for rank, (idx, _) in enumerate(dense_ranked):
            rrf_scores[idx] = rrf_scores.get(idx, 0.0) + 1.0 / (rrf_constant + rank + 1)
            
        for rank, (idx, _) in enumerate(sparse_ranked):
            rrf_scores[idx] = rrf_scores.get(idx, 0.0) + 1.0 / (rrf_constant + rank + 1)

        # Sort by final fused RRF score
        sorted_rrf = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_rrf[:top_k]

    def compress_context(self, text: str, max_chars: int = 180) -> str:
        """Compresses context by truncating to key sentences containing relevant keywords."""
        if len(text) <= max_chars:
            return text
        sentences = re.split(r"(?<=[.!?])\s+", text)
        compressed = []
        char_count = 0
        for sent in sentences:
            if char_count + len(sent) < max_chars:
                compressed.append(sent)
                char_count += len(sent)
            else:
                break
        return " ".join(compressed) + "..."

    def verify_grounding(self, context: str, response: str) -> float:
        """Returns hallucination index (0.0 to 1.0) based on how grounded the response is in context."""
        # Split into words (ignoring case and punctuation)
        ctx_words = set(re.findall(r"\b\w{3,}\b", context.lower()))
        resp_words = set(re.findall(r"\b\w{3,}\b", response.lower()))
        
        if not resp_words:
            return 0.0
            
        # Check percentage of response vocabulary supported by the retrieved context
        unsupported = resp_words - ctx_words
        
        # Filter out common English helper words
        stopwords = {"the", "and", "you", "for", "with", "this", "that", "your", "will", "have", "please", "should", "needs"}
        unsupported = unsupported - stopwords
        
        hallucination_score = len(unsupported) / len(resp_words - stopwords) if len(resp_words - stopwords) > 0 else 0.0
        return round(hallucination_score, 3)

    def generate_with_groq(self, query: str, context: str) -> str:
        """Query Groq API using Llama3 to generate a clinical-grade grounded response."""
        if not settings.GROQ_API_KEY:
            return ""
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        system_content = (
            "You are Aegis Health's expert customer care representative. "
            "Respond to the member in a warm, empathetic, friendly, and natural human conversational tone. "
            "Speak like a helpful, supportive person addressing a patient's concerns. "
            "Avoid sounding like a robotic system or copy-pasting dry policy bullets unless helpful. "
            "Synthesize your answer using ONLY the verified context. Do NOT invent or assume details. "
            "If the context is insufficient, explain it gently and provide escalation steps. "
            "Ensure the output feels personal, warm, and highly professional."
        )
        
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": f"Verified Knowledge Base Context:\n{context}\n\nUser Query: {query}"}
            ],
            "temperature": 0.1,
            "max_tokens": 512
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=6.0)
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                return ""
        except Exception:
            return ""

    def retrieve_and_generate(self, query: str, top_k: int = 3, metadata_context: str = "") -> Dict[str, Any]:
        """Runs the complete RAG loop: Retrieve -> De-duplicate -> Rewrite -> Compress -> Cite -> Guard."""
        ranked_items = self.hybrid_search(query, top_k=top_k)
        
        sources = []
        contexts = []
        
        for rank, (idx, score) in enumerate(ranked_items):
            entry = self.kb_entries[idx]
            citation = f"KB Document [{entry.get('id', 'Unknown')}] - Category: {entry.get('category', 'General')}"
            sources.append({
                "id": entry.get("id"),
                "source_citation": citation,
                "score": round(float(score), 4)
            })
            contexts.append(entry.get("answer", ""))

        if not contexts:
            fallback_answer = "I couldn't locate specific information in the authorized healthcare knowledge base. Please escalate this query to a human agent."
            if metadata_context:
                fallback_answer = f"I retrieved the following information from our system records: {metadata_context}. Let me know if you would like me to escalate this to a supervisor."
            return {
                "query": query,
                "answer": fallback_answer,
                "sources": [],
                "hallucination_score": 0.0
            }

        # Build grounded response text
        primary_answer = contexts[0]
        
        # Perform dynamic context compression for secondary information if matching
        extra_info = []
        for ctx in contexts[1:]:
            compressed = self.compress_context(ctx)
            if compressed not in extra_info:
                extra_info.append(compressed)
                
        answer_text = primary_answer
        if extra_info:
            answer_text += "\n\nAdditional Guidance:\n- " + "\n- ".join(extra_info)

        # Offline fallback synthesis when Groq is disabled
        if metadata_context and not settings.GROQ_API_KEY:
            answer_text = f"According to our records, {metadata_context}. In accordance with plan policy: {answer_text}"

        # Attempt Groq generation using combined context
        if settings.GROQ_API_KEY:
            combined_context = "\n---\n".join(contexts)
            if metadata_context:
                combined_context += f"\n\nReal-time Active System Records:\n{metadata_context}"
            groq_answer = self.generate_with_groq(query, combined_context)
            if groq_answer:
                answer_text = groq_answer

        # Append citation tags
        answer_text += f"\n\n[References: {', '.join([s['id'] for s in sources])}]"

        # Hallucination checking
        all_context_text = " ".join(contexts) + " " + metadata_context
        hallucination_score = self.verify_grounding(all_context_text, answer_text)

        return {
            "query": query,
            "answer": answer_text,
            "sources": sources,
            "hallucination_score": hallucination_score
        }

# Singleton instance
rag_pipeline = HealthcareHybridRAG()
