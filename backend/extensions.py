from supabase import create_client, Client
from flask import Flask

supabase: Client = None  # type: ignore
supabase_service: Client = None  # type: ignore


def init_extensions(app: Flask):
    """Initializes Supabase clients using the app's configuration."""
    global supabase, supabase_service

    config = app.config
    supabase = create_client(config["SUPABASE_URL"], config["SUPABASE_KEY"])

    if config.get("SUPABASE_SERVICE_ROLE_KEY"):
        supabase_service = create_client(
            config["SUPABASE_URL"], config["SUPABASE_SERVICE_ROLE_KEY"]
        )
    else:
        supabase_service = supabase
