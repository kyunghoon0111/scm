"""Phase 1 연결 테스트 — GET /health 및 CORS 확인."""
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_health_returns_ok():
    """GET /health 가 200 + {"status": "ok"} 를 반환하는지 확인."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_localhost():
    """CORS preflight 요청이 localhost:5173 에 대해 허용되는지 확인."""
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert "http://localhost:5173" in response.headers.get(
        "access-control-allow-origin", ""
    )


def test_scm_requires_auth():
    """인증 없이 SCM 엔드포인트 호출 시 403 반환 확인."""
    response = client.get("/api/scm/inventory/onhand")
    assert response.status_code == 403


def test_pipeline_requires_auth():
    """인증 없이 Pipeline 엔드포인트 호출 시 403 반환 확인."""
    response = client.get("/api/pipeline/status")
    assert response.status_code == 403
