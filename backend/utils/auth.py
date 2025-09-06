from functools import wraps
from typing import Callable
from flask import request, jsonify, g
import backend.extensions as ext


def auth_required(f: Callable) -> Callable:
    """Decorator to protect routes that require user authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized: Missing or invalid token"}), 401

        jwt = auth_header.split(" ")[1]
        try:
            user_response = ext.supabase.auth.get_user(jwt)
            # ------------------------
            if not user_response or not hasattr(user_response, "user"):
                raise ValueError("Invalid user response")
            g.user = user_response.user
        except Exception as e:
            print(f"Token validation error: {e}")
            return jsonify({"error": "Unauthorized: Invalid or expired token"}), 401

        return f(*args, **kwargs)
    return decorated_function
