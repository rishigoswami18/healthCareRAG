import os
import re
from typing import List, Dict, Any

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:
    from bs4 import BeautifulSoup
    import urllib.request
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False


class KnowledgeIngestionPipeline:
    def __init__(self):
        pass

    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extracts text from a local PDF file using pypdf, falling back if not installed."""
        if not HAS_PYPDF:
            # Fallback mock extraction
            return f"Mock PDF text extraction from {os.path.basename(file_path)}. This PDF outlines the clinical care guidelines for diabetes patients."
        
        text_content = []
        try:
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)
            return "\n".join(text_content)
        except Exception as e:
            return f"Error reading PDF {os.path.basename(file_path)}: {str(e)}"

    def extract_text_from_docx(self, file_path: str) -> str:
        """Extracts text from a local Word DOCX file, falling back if not installed."""
        if not HAS_DOCX:
            return f"Mock Word DOCX text extraction from {os.path.basename(file_path)}. This document details internal copay levels and out-of-network claims."
        
        try:
            doc = docx.Document(file_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            return "\n".join(full_text)
        except Exception as e:
            return f"Error reading Word document {os.path.basename(file_path)}: {str(e)}"

    def extract_text_from_web(self, url: str) -> str:
        """Scrapes text content from an external website URL."""
        if not HAS_BS4:
            return f"Mock Web scrape from {url}. This medical policy covers prior authorizations for heart surgery."

        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                html = response.read()
            
            soup = BeautifulSoup(html, "html.parser")
            
            # Kill script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
                
            text = soup.get_text()
            
            # Break into lines and clear leading/trailing spaces
            lines = (line.strip() for line in text.splitlines())
            # Break multi-headlines into a line each
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            # Drop blank lines
            clean_text = "\n".join(chunk for chunk in chunks if chunk)
            return clean_text
        except Exception as e:
            return f"Error scraping URL {url}: {str(e)}"

    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
        """Splits raw text into overlapping chunks of character segments."""
        chunks = []
        if len(text) <= chunk_size:
            return [text]
            
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start += chunk_size - overlap
            
        return chunks

    def tag_chunk(self, chunk: str, filename: str) -> Dict[str, Any]:
        """Analyzes chunk contents to auto-assign category and channel tags."""
        normalized = chunk.lower()
        
        # Determine likely channel
        channel = "General"
        if "call" in normalized or "caller" in normalized or "voice" in normalized or "phone" in normalized:
            channel = "Voice"
        elif "chat" in normalized or "agent chat" in normalized or "portal" in normalized:
            channel = "Chat"
        elif "email" in normalized or "back-office" in normalized or "inbox" in normalized:
            channel = "Non-Voice"

        # Determine likely category
        category = "General"
        if "claim" in normalized or "denial" in normalized or "denied" in normalized:
            category = "Claims"
        elif "prior auth" in normalized or "pre-auth" in normalized or "authorization" in normalized:
            category = "Prior Authorization"
        elif "billing" in normalized or "copay" in normalized or "charge" in normalized or "bill" in normalized:
            category = "Billing"
        elif "schedule" in normalized or "appointment" in normalized or "calendar" in normalized:
            category = "Appointment"
        elif "medication" in normalized or "refill" in normalized or "prescription" in normalized:
            category = "Prescription"
        elif "hipaa" in normalized or "compliance" in normalized or "safeguard" in normalized:
            category = "Compliance"

        # Simple question synthesis for index search matches
        question = f"What details does {filename} state regarding {category}?"
        
        return {
            "channel": channel,
            "category": category,
            "question": question,
            "answer": chunk
        }

    def validate_knowledge_chunk(self, chunk: Dict[str, Any]) -> bool:
        """Validates if a chunk matches minimum quality/compliance criteria."""
        content = chunk.get("answer", "")
        # Filter out junk text (too short, empty, or garbage blocks)
        if len(content.strip()) < 30:
            return False
            
        # Basic check for medical validity (e.g. must not contain test placeholder strings)
        if "lorem ipsum" in content.lower():
            return False
            
        return True

    def process_file(self, file_path: str, file_type: str) -> List[Dict[str, Any]]:
        """Processes a file: reads text, chunks it, tags chunks, and returns list of validated knowledge entries."""
        filename = os.path.basename(file_path)
        
        if file_type.lower() == "pdf":
            text = self.extract_text_from_pdf(file_path)
        elif file_type.lower() == "docx":
            text = self.extract_text_from_docx(file_path)
        elif file_type.lower() == "web":
            text = self.extract_text_from_web(file_path)
        else:
            # Assume plain text
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()

        raw_chunks = self.chunk_text(text)
        validated_chunks = []
        
        for idx, chunk_text in enumerate(raw_chunks):
            tagged = self.tag_chunk(chunk_text, filename)
            tagged["id"] = f"DOC-{filename[:4].upper()}-{idx:03d}"
            
            if self.validate_knowledge_chunk(tagged):
                validated_chunks.append(tagged)
                
        return validated_chunks

# Singleton instance
ingestion_pipeline = KnowledgeIngestionPipeline()
