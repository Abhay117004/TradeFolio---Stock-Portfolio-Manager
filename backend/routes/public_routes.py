from urllib.parse import quote
from flask import Blueprint, jsonify, request, current_app
from backend.utils.api_helpers import make_api_request

public_bp = Blueprint('public_routes', __name__, url_prefix='/api')


@public_bp.route("/search", methods=["GET"])
def search_stocks():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
    result = make_api_request(
        current_app.config["RAPIDAPI_STOCK_HOST"],
        current_app.config["RAPIDAPI_KEY"],
        f"/search?query={quote(query)}&language=en"
    )
    return jsonify(result)


@public_bp.route("/quote", methods=["GET"])
def get_quotes():
    symbols = request.args.get('symbols')
    if not symbols:
        return jsonify({"error": "Symbols parameter is required"}), 400
    result = make_api_request(
        current_app.config["RAPIDAPI_STOCK_HOST"],
        current_app.config["RAPIDAPI_KEY"],
        f"/stock-quote?symbol={quote(symbols)}&language=en"
    )
    return jsonify(result)


@public_bp.route("/market-trends", methods=["GET"])
def get_market_trends():
    gainers = make_api_request(
        current_app.config["RAPIDAPI_STOCK_HOST"], current_app.config["RAPIDAPI_KEY"],
        "/market-trends?trend_type=GAINERS&country=in&language=en"
    )
    losers = make_api_request(
        current_app.config["RAPIDAPI_STOCK_HOST"], current_app.config["RAPIDAPI_KEY"],
        "/market-trends?trend_type=LOSERS&country=in&language=en"
    )
    response = {
        "gainers": gainers.get("data", {}).get("trends", [])[:5],
        "losers": losers.get("data", {}).get("trends", [])[:5]
    }
    return jsonify(response)


@public_bp.route("/popular-stocks", methods=["GET"])
def get_popular_stocks():
    symbols = "RELIANCE:NSE,TCS:NSE,HDFCBANK:NSE,ICICIBANK:NSE,INFY:NSE,SBIN:NSE,BHARTIARTL:NSE,LT:NSE,CIPLA:NSE"
    result = make_api_request(
        current_app.config["RAPIDAPI_STOCK_HOST"],
        current_app.config["RAPIDAPI_KEY"],
        f"/stock-quote?symbol={quote(symbols)}&language=en"
    )
    return jsonify(result)


@public_bp.route("/business-news", methods=["GET"])
def get_business_news():
    limit = request.args.get('limit', 8, type=int)
    offset = request.args.get('offset', 0, type=int)
    result = make_api_request(
        current_app.config["RAPIDAPI_NEWS_HOST"],
        current_app.config["RAPIDAPI_NEWS_KEY"],
        f"/topic-headlines?topic=BUSINESS&limit=500&country=IN&lang=en"
    )
    if result.get("status") != "OK" or not isinstance(result.get("data"), list):
        return jsonify({"status": "error", "message": "Failed to fetch news"}), 500
    formatted_news = [{"article_title": i.get("title"), "article_url": i.get("link"), "article_photo_url": i.get(
        "photo_url"), "source": i.get("source_name"), "post_time_utc": i.get("published_datetime_utc")} for i in result["data"]]
    paginated = formatted_news[offset:offset + limit]
    return jsonify({"status": "OK", "data": paginated, "has_more": len(formatted_news) > offset + limit, "total": len(formatted_news)})


@public_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "OK", "message": "API is healthy"}), 200
