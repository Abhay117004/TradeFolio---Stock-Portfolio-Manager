import os
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

# Load .env.local first (for development), then .env (for production/examples)
env_local_path = os.path.join(project_root, '.env.local')
env_path = os.path.join(project_root, '.env')

if os.path.exists(env_local_path):
    load_dotenv(dotenv_path=env_local_path)
else:
    load_dotenv(dotenv_path=env_path)


class Config:
    RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
    RAPIDAPI_NEWS_KEY = os.getenv("RAPIDAPINEWS_KEY")
    RAPIDAPI_STOCK_HOST = "real-time-finance-data.p.rapidapi.com"
    RAPIDAPI_NEWS_HOST = "real-time-news-data.p.rapidapi.com"

    SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
    SUPABASE_KEY = os.getenv("VITE_SUPABASE_KEY")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")

    # Check for placeholder values and treat them as missing
    if SUPABASE_URL and SUPABASE_URL.startswith("YOUR_"):
        SUPABASE_URL = None
    if SUPABASE_KEY and SUPABASE_KEY.startswith("YOUR_"):
        SUPABASE_KEY = None
    if SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SERVICE_ROLE_KEY.startswith("YOUR_"):
        SUPABASE_SERVICE_ROLE_KEY = None
    if RAPIDAPI_KEY and RAPIDAPI_KEY.startswith("YOUR_"):
        RAPIDAPI_KEY = None
    if RAPIDAPI_NEWS_KEY and RAPIDAPI_NEWS_KEY.startswith("YOUR_"):
        RAPIDAPI_NEWS_KEY = None

    if not all([RAPIDAPI_KEY, SUPABASE_URL, SUPABASE_KEY]):
        missing_vars = []
        if not RAPIDAPI_KEY:
            missing_vars.append("RAPIDAPI_KEY")
        if not SUPABASE_URL:
            missing_vars.append("VITE_SUPABASE_URL")
        if not SUPABASE_KEY:
            missing_vars.append("VITE_SUPABASE_KEY")

        raise ValueError(
            f"Missing required environment variables: {', '.join(missing_vars)}. "
            f"Please create a .env.local file with your actual values from Supabase dashboard and RapidAPI."
        )
