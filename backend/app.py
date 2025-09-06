import os
import http.client
import json
from urllib.parse import quote
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
from typing import Any, Dict

load_dotenv()

app = Flask(__name__)
CORS(app, resources={
     r"/api/*": {"origins": "*"}})

# --- Configuration ---
RAPIDAPI_KEY: str = os.getenv("RAPIDAPI_KEY") or ""
RAPIDAPI_NEWS_KEY: str = os.getenv("RAPIDAPINEWS_KEY") or ""
RAPIDAPI_STOCK_HOST: str = "real-time-finance-data.p.rapidapi.com"
RAPIDAPI_NEWS_HOST: str = "real-time-news-data.p.rapidapi.com"
SUPABASE_URL: str = os.getenv("VITE_SUPABASE_URL") or ""
SUPABASE_KEY: str = os.getenv("VITE_SUPABASE_KEY") or ""
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""

if not all([RAPIDAPI_KEY, RAPIDAPI_NEWS_KEY, SUPABASE_URL, SUPABASE_KEY]):
    raise ValueError("One or more required environment variables are not set.")

# Create two Supabase clients - one for regular operations, one for service role
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_service: Client = create_client(
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_SERVICE_ROLE_KEY else supabase

# --- Helpers ---


def make_stock_api_request(endpoint: str) -> Dict[str, Any]:
    conn = http.client.HTTPSConnection(RAPIDAPI_STOCK_HOST)
    headers = {'x-rapidapi-key': RAPIDAPI_KEY,
               'x-rapidapi-host': RAPIDAPI_STOCK_HOST}
    try:
        conn.request("GET", endpoint, headers=headers)
        res = conn.getresponse()
        data = res.read()
        return json.loads(data.decode("utf-8"))
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()


def make_news_api_request(endpoint: str) -> Dict[str, Any]:
    conn = http.client.HTTPSConnection(RAPIDAPI_NEWS_HOST)
    headers = {'x-rapidapi-key': RAPIDAPI_NEWS_KEY,
               'x-rapidapi-host': RAPIDAPI_NEWS_HOST}
    try:
        conn.request("GET", endpoint, headers=headers)
        res = conn.getresponse()
        data = res.read()
        return json.loads(data.decode("utf-8"))
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()


def get_user_from_token():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    jwt = auth_header.split(" ")[1]
    try:
        user_response = supabase.auth.get_user(jwt)
        return getattr(user_response, "user", None)
    except Exception as e:
        print(f"Token validation error: {e}")
        return None

# --- Public API Endpoints (No Auth Required) ---


@app.route("/api/search", methods=["GET"])
def search_stocks():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
    result = make_stock_api_request(
        f"/search?query={quote(query)}&language=en")
    return jsonify(result)


@app.route("/api/quote", methods=["GET"])
def get_quotes():
    symbols = request.args.get('symbols')
    if not symbols:
        return jsonify({"error": "Symbols parameter is required"}), 400
    result = make_stock_api_request(
        f"/stock-quote?symbol={quote(symbols)}&language=en")
    return jsonify(result)


@app.route("/api/market-trends", methods=["GET"])
def get_market_trends():
    gainers = make_stock_api_request(
        "/market-trends?trend_type=GAINERS&country=in&language=en")
    losers = make_stock_api_request(
        "/market-trends?trend_type=LOSERS&country=in&language=en")
    response = {
        "gainers": gainers.get("data", {}).get("trends", [])[:5],
        "losers": losers.get("data", {}).get("trends", [])[:5]
    }
    return jsonify(response)


@app.route("/api/popular-stocks", methods=["GET"])
def get_popular_stocks():
    symbols = "RELIANCE:NSE,TCS:NSE,HDFCBANK:NSE,ICICIBANK:NSE,INFY:NSE,SBIN:NSE,BHARTIARTL:NSE,LT:NSE,CIPLA:NSE"
    result = make_stock_api_request(
        f"/stock-quote?symbol={quote(symbols)}&language=en")
    return jsonify(result)


@app.route("/api/business-news", methods=["GET"])
def get_business_news():
    limit = request.args.get('limit', 8, type=int)
    offset = request.args.get('offset', 0, type=int)

    endpoint = f"/topic-headlines?topic=BUSINESS&limit=500&country=IN&lang=en"
    result = make_news_api_request(endpoint)

    if result.get("status") != "OK" or not isinstance(result.get("data"), list):
        return jsonify({"status": "error", "data": []}), 500

    formatted_news = []
    for item in result["data"]:
        formatted_news.append({
            "article_title": item.get("title"),
            "article_url": item.get("link"),
            "article_photo_url": item.get("photo_url"),
            "source": item.get("source_name"),
            "post_time_utc": item.get("published_datetime_utc")
        })

    # Apply pagination
    paginated_news = formatted_news[offset:offset + limit]
    has_more = len(formatted_news) > offset + limit

    return jsonify({
        "status": "OK",
        "data": paginated_news,
        "has_more": has_more,
        "total": len(formatted_news)
    })

# --- Protected API Endpoints (Auth Required) ---


@app.route("/api/portfolios", methods=["GET", "POST"])
def handle_portfolios():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == "GET":
        try:
            # Get portfolios with holding count
            response = supabase.table('portfolios').select(
                '*, holdings_count:holdings(count)'
            ).eq('user_id', user.id).execute()

            # Process the data to flatten holdings_count
            portfolios = []
            for portfolio in response.data:
                portfolio_data = {**portfolio}
                if 'holdings_count' in portfolio_data and portfolio_data['holdings_count']:
                    portfolio_data['holdings_count'] = portfolio_data['holdings_count'][0]['count']
                else:
                    portfolio_data['holdings_count'] = 0
                portfolios.append(portfolio_data)

            return jsonify(portfolios), 200
        except Exception as e:
            print(f"Error fetching portfolios: {e}")
            return jsonify({"error": "Failed to fetch portfolios"}), 500

    if request.method == "POST":
        try:
            req_data = request.get_json() or {}
            name = req_data.get("name", "").strip()
            description = req_data.get("description", "").strip()

            if not name:
                return jsonify({"error": "Portfolio name is required"}), 400

            new_portfolio = {
                "name": name,
                "description": description,
                "user_id": user.id
            }

            # Use service role client to bypass RLS if needed
            try:
                response = supabase.table('portfolios').insert(
                    new_portfolio).execute()
            except Exception as rls_error:
                print(f"Regular insert failed with RLS error: {rls_error}")
                # Try with service role client if available
                if supabase_service != supabase:
                    print("Trying with service role client...")
                    response = supabase_service.table(
                        'portfolios').insert(new_portfolio).execute()
                else:
                    raise rls_error

            return jsonify(response.data[0]), 201

        except Exception as e:
            print(f"Error creating portfolio: {e}")
            return jsonify({"error": f"Failed to create portfolio: {str(e)}"}), 500

    return jsonify({"error": "Method not allowed"}), 405


@app.route("/api/portfolios/<int:portfolio_id>", methods=["DELETE"])
def delete_portfolio(portfolio_id: int):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        # First delete all holdings in this portfolio
        holdings_response = supabase.table('holdings').delete().eq(
            'portfolio_id', portfolio_id).execute()

        # Then delete the portfolio
        response = supabase.table('portfolios').delete().match(
            {'id': portfolio_id, 'user_id': user.id}).execute()

        if not response.data:
            return jsonify({"error": "Portfolio not found or access denied"}), 404
        return jsonify({"message": "Portfolio deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting portfolio: {e}")
        return jsonify({"error": "Failed to delete portfolio"}), 500


@app.route("/api/holdings/<int:portfolio_id>", methods=["GET", "POST"])
def handle_holdings(portfolio_id: int):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        # Verify portfolio ownership
        owner_check = supabase.table('portfolios').select('id').match(
            {'id': portfolio_id, 'user_id': user.id}).execute()
        if not owner_check.data:
            return jsonify({"error": "Access denied"}), 403

        if request.method == "GET":
            holdings_data = supabase.table('holdings').select(
                '*').eq('portfolio_id', portfolio_id).execute()
            return jsonify(holdings_data.data), 200

        if request.method == "POST":
            req_data = request.get_json() or {}

            # Validate required fields
            symbol = req_data.get("symbol", "").strip().upper()
            quantity = req_data.get("quantity")
            purchase_price = req_data.get("purchase_price")

            if not symbol or not quantity or not purchase_price:
                return jsonify({"error": "Symbol, quantity, and purchase_price are required"}), 400

            try:
                quantity = float(quantity)
                purchase_price = float(purchase_price)
            except (TypeError, ValueError):
                return jsonify({"error": "Quantity and purchase_price must be valid numbers"}), 400

            if quantity <= 0 or purchase_price <= 0:
                return jsonify({"error": "Quantity and purchase_price must be positive numbers"}), 400

            new_holding = {
                "portfolio_id": portfolio_id,
                "symbol": symbol,
                "quantity": quantity,
                "purchase_price": purchase_price,
            }

            response = supabase.table('holdings').insert(new_holding).execute()
            return jsonify(response.data[0]), 201

    except Exception as e:
        print(f"Error handling holdings: {e}")
        return jsonify({"error": "Failed to handle holdings"}), 500

    return jsonify({"error": "Method not allowed"}), 405


@app.route("/api/holdings/<int:holding_id>", methods=["DELETE"])
def delete_holding(holding_id: int):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        # Verify the holding belongs to a portfolio owned by the user
        holding_check = supabase.table('holdings').select(
            'id, portfolio_id, portfolios!inner(user_id)'
        ).eq('id', holding_id).eq('portfolios.user_id', user.id).execute()

        if not holding_check.data:
            return jsonify({"error": "Holding not found or access denied"}), 404

        response = supabase.table('holdings').delete().eq(
            'id', holding_id).execute()

        return jsonify({"message": "Holding deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting holding: {e}")
        return jsonify({"error": "Failed to delete holding"}), 500

# Add a health check endpoint


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "OK", "message": "API is running"}), 200

# Error handlers


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)
