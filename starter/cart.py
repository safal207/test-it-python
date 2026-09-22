"""Prices in cents. Pure functions for the Test it learning shop."""
def cart_total(items):
    total = 0
    for item in items:
        price, quantity = item["price_cents"], item["quantity"]
        if type(price) is not int or price < 0:
            raise ValueError("price must be a nonnegative integer")
        if type(quantity) is not int or not 1 <= quantity <= 99:
            raise ValueError("quantity must be an integer from 1 to 99")
        total += price * quantity
    return total


def discounted_price(price, percent):
    if type(price) is not int or price < 0:
        raise ValueError("price must be a nonnegative integer")
    if type(percent) is not int or not 0 <= percent <= 100:
        raise ValueError("percent must be an integer from 0 to 100")
    return price * (100 - percent) // 100
