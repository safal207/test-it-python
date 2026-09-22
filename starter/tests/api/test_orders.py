import httpx
import pytest
pytestmark = pytest.mark.api

@pytest.fixture
def client():
    with httpx.Client(base_url="http://127.0.0.1:8000", timeout=5) as client:
        yield client

def test_create_read_delete(client):
    response = client.post("/orders", json={"items": [{"product_id": 1, "quantity": 2}]})
    assert response.status_code == 201
    order = response.json()
    try:
        assert order["total_cents"] == 300000
        fetched = client.get(f"/orders/{order['id']}")
        assert fetched.status_code == 200
        assert fetched.json()["total_cents"] == 300000
    finally:
        deleted = client.delete(f"/orders/{order['id']}")
        assert deleted.status_code == 204
    assert client.get(f"/orders/{order['id']}").status_code == 404

@pytest.mark.parametrize("items", [[], [{"product_id": 999, "quantity": 1}], [{"product_id": 1, "quantity": 0}]])
def test_invalid_order(client, items):
    assert client.post("/orders", json={"items": items}).status_code == 422
