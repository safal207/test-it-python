"""Local learning API. In-memory state resets on restart."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4
from cart import cart_total

PRODUCTS = [
    {"id": 1, "name": "Python Book", "price_cents": 150000},
    {"id": 2, "name": "QA Notebook", "price_cents": 50000},
]
ORDERS = {}
LOCK = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, value):
        payload = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/":
            payload = Path(__file__).with_name("shop.html").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        elif path == "/health":
            self.reply(200, {"status": "ok"})
        elif path == "/products":
            self.reply(200, {"items": PRODUCTS})
        elif path.startswith("/orders/"):
            with LOCK:
                order = ORDERS.get(path.removeprefix("/orders/"))
            self.reply(200 if order else 404, order or {"error": "not_found"})
        else:
            self.reply(404, {"error": "not_found"})

    def do_POST(self):
        if urlsplit(self.path).path != "/orders":
            return self.reply(404, {"error": "not_found"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 32768:
                raise ValueError("invalid body size")
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict) or not isinstance(data.get("items"), list) or not data["items"]:
                raise ValueError("items must be a nonempty list")
            items = []
            for item in data["items"]:
                if not isinstance(item, dict):
                    raise ValueError("invalid item")
                product_id = item.get("product_id")
                if type(product_id) is not int:
                    raise ValueError("product_id must be an integer")
                product = next((p for p in PRODUCTS if p["id"] == product_id), None)
                if product is None:
                    raise ValueError("unknown product")
                items.append({**product, "quantity": item.get("quantity")})
            total = cart_total(items)
        except (ValueError, TypeError, KeyError):
            return self.reply(422, {"error": "invalid_order"})
        order = {"id": str(uuid4()), "items": items, "total_cents": total, "status": "created"}
        with LOCK:
            ORDERS[order["id"]] = order
        self.reply(201, order)

    def do_DELETE(self):
        path = urlsplit(self.path).path
        if not path.startswith("/orders/"):
            return self.reply(404, {"error": "not_found"})
        with LOCK:
            order = ORDERS.pop(path.removeprefix("/orders/"), None)
        if order is None:
            return self.reply(404, {"error": "not_found"})
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()


if __name__ == "__main__":
    print("Test it learning shop: http://127.0.0.1:8000", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
