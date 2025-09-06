from flask import Blueprint, jsonify, request, g
from backend.utils.auth import auth_required
import backend.extensions as ext

portfolio_bp = Blueprint('portfolio_routes', __name__, url_prefix='/api')


@portfolio_bp.route("/portfolios", methods=["GET", "POST"])
@auth_required
def handle_portfolios():
    """
    Handles fetching all portfolios for a user (GET) and creating a new one (POST).
    """
    user = g.user
    if request.method == "GET":
        try:
            res = ext.supabase.table('portfolios').select(
                '*, holdings_count:holdings(count)').eq('user_id', user.id).execute()
            portfolios = [dict(p, holdings_count=p['holdings_count'][0]['count'] if p.get(
                'holdings_count') else 0) for p in res.data]
            return jsonify(portfolios), 200
        except Exception as e:
            return jsonify({"error": f"Failed to fetch portfolios: {e}"}), 500

    if request.method == "POST":
        data = request.get_json() or {}
        if not (name := data.get("name", "").strip()):
            return jsonify({"error": "Portfolio name is required"}), 400
        try:
            new_p = {"name": name, "description": data.get(
                "description", "").strip(), "user_id": user.id}
            res = ext.supabase.table('portfolios').insert(new_p).execute()
            return jsonify(res.data[0]), 201
        except Exception as e:
            return jsonify({"error": f"Failed to create portfolio: {e}"}), 500
    return jsonify({"error": "Method not allowed"}), 405


@portfolio_bp.route("/portfolios/<portfolio_id>", methods=["DELETE"])
@auth_required
def delete_portfolio(portfolio_id: str):
    """
    Deletes a specific portfolio belonging to the authenticated user.
    Accepts a UUID string for portfolio_id.
    """
    try:
        res = ext.supabase.table('portfolios').delete().match(
            {'id': portfolio_id, 'user_id': g.user.id}).execute()
        if not res.data:
            return jsonify({"error": "Portfolio not found or access denied"}), 404
        return jsonify({"message": "Portfolio deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete portfolio: {e}"}), 500


@portfolio_bp.route("/holdings/<portfolio_id>", methods=["GET", "POST"])
@auth_required
def handle_holdings(portfolio_id: str):
    """
    Handles fetching holdings for a portfolio (GET) and adding a new holding (POST).
    Accepts a UUID string for portfolio_id.
    """
    user = g.user
    try:
        # Verify the user owns the portfolio first
        if not ext.supabase.table('portfolios').select('id').match({'id': portfolio_id, 'user_id': user.id}).execute().data:
            return jsonify({"error": "Portfolio not found or access denied"}), 403

        if request.method == "GET":
            holdings = ext.supabase.table('holdings').select(
                '*').eq('portfolio_id', portfolio_id).execute()
            return jsonify(holdings.data), 200

        if request.method == "POST":
            data = request.get_json() or {}
            symbol = data.get("symbol", "").strip().upper()
            try:
                quantity, price = float(data["quantity"]), float(
                    data["purchase_price"])
            except (TypeError, ValueError, KeyError):
                return jsonify({"error": "Quantity and purchase_price must be valid numbers"}), 400
            if not symbol or quantity <= 0 or price <= 0:
                return jsonify({"error": "Symbol, positive quantity, and positive price are required"}), 400

            new_h = {"portfolio_id": portfolio_id, "symbol": symbol,
                     "quantity": quantity, "purchase_price": price}
            res = ext.supabase.table('holdings').insert(new_h).execute()
            return jsonify(res.data[0]), 201

    except Exception as e:
        return jsonify({"error": f"Internal server error: {e}"}), 500
    return jsonify({"error": "Method not allowed"}), 405


@portfolio_bp.route("/holdings/<holding_id>", methods=["DELETE"])
@auth_required
def delete_holding(holding_id: str):
    """
    Deletes a specific holding belonging to the authenticated user.
    Accepts a UUID string for holding_id.
    """
    try:
        # This complex query ensures a user can only delete holdings from their own portfolios.
        check = ext.supabase.table('holdings').select(
            'id, portfolios!inner(user_id)'
        ).match({
            'id': holding_id,
            'portfolios.user_id': g.user.id
        }).execute()

        if not check.data:
            return jsonify({"error": "Holding not found or access denied"}), 404

        # If the check passes, proceed with deletion.
        ext.supabase.table('holdings').delete().eq('id', holding_id).execute()
        return jsonify({"message": "Holding deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete holding: {e}"}), 500
