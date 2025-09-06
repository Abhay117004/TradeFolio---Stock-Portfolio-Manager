import http.client
import json
from typing import Any, Dict


def make_api_request(host: str, api_key: str, endpoint: str) -> Dict[str, Any]:
    """Generic function to make requests to a RapidAPI endpoint."""
    conn = http.client.HTTPSConnection(host)
    headers = {'x-rapidapi-key': api_key, 'x-rapidapi-host': host}
    try:
        conn.request("GET", endpoint, headers=headers)
        res = conn.getresponse()
        data = res.read()
        return json.loads(data.decode("utf-8"))
    except Exception as e:
        print(f"API request error to {host}: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()
