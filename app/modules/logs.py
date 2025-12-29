from flask import Blueprint

logs_bp = Blueprint("logs", __name__)

@logs_bp.route("/health/logs")
def dummy_logs():
    return {"status": "ok", "message": "logs placeholder"}, 200
