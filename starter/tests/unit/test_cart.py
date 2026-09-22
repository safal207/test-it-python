import pytest
from cart import cart_total, discounted_price

def test_empty_cart():
    assert cart_total([]) == 0

@pytest.mark.parametrize("quantity", [1, 2, 99])
def test_quantity(quantity):
    assert cart_total([{"price_cents": 100, "quantity": quantity}]) == quantity * 100

@pytest.mark.parametrize("quantity", [0, -1, 100, True, 1.5])
def test_invalid_quantity(quantity):
    with pytest.raises(ValueError):
        cart_total([{"price_cents": 100, "quantity": quantity}])

@pytest.mark.parametrize("percent, expected", [(0, 1000), (10, 900), (100, 0)])
def test_discount(percent, expected):
    assert discounted_price(1000, percent) == expected

def test_discount_rounds_down():
    assert discounted_price(999, 15) == 849
