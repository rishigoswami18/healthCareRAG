import os

# Zero-dependency local .env file loader for secure credentials loading
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(project_root, ".env")
if os.path.exists(env_path):
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")
    except Exception:
        pass

class Settings:
    PROJECT_NAME: str = "Healthcare Enterprise AI Agent Platform"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./healthcare_agent.db")
    
    # JWT Security
    SECRET_KEY: str = os.getenv("JWT_SECRET", "jwt_" + "fallback_key_2026_change_me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    # RAG Settings
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    FAISS_INDEX_PATH: str = "faiss_index.bin"
    KB_JSON_PATH: str = os.getenv("KB_JSON_PATH", "../healthcare_rag_project/data/healthcare_kb.json")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # ML & Monitoring
    MLFLOW_TRACKING_URI: str = "./mlflow_runs"
    PROMETHEUS_METRICS_PORT: int = 8000

settings = Settings()

