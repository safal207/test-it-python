import pytest
from playwright.sync_api import expect
pytestmark = pytest.mark.ui

def test_checkout(page):
    page.goto("http://127.0.0.1:8000")
    page.get_by_role("button", name="В корзину", exact=True).click()
    page.get_by_label("Количество", exact=True).fill("2")
    with page.expect_response(lambda r: r.url.endswith("/orders") and r.request.method == "POST") as info:
        page.get_by_role("button", name="Оформить заказ", exact=True).click()
    response = info.value
    assert response.status == 201
    order = response.json()
    try:
        expect(page.get_by_role("status")).to_contain_text("Заказ создан:")
        assert order["total_cents"] == 300000
    finally:
        page.request.delete(f"http://127.0.0.1:8000/orders/{order['id']}")
