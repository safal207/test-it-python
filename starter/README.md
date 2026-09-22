# Test it — учебный магазин

Локальный полигон для курса Python QA. Нужен Python 3.12 или новее.

## Windows PowerShell

Открой терминал в распакованной папке:

~~~powershell
py -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pytest tests/unit -q
.venv\Scripts\python demo_server.py
~~~

Оставь сервер работающим. Во втором терминале в той же папке:

~~~powershell
.venv\Scripts\python -m pytest tests/api -q
.venv\Scripts\python -m playwright install chromium
.venv\Scripts\python -m pytest tests/ui --browser chromium --tracing retain-on-failure
~~~

## macOS / Linux

~~~sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m pytest tests/unit -q
.venv/bin/python demo_server.py
~~~

Во втором терминале:

~~~sh
.venv/bin/python -m pytest tests/api -q
.venv/bin/python -m playwright install chromium
.venv/bin/python -m pytest tests/ui --browser chromium --tracing retain-on-failure
~~~

На Linux могут понадобиться системные зависимости браузера:
python -m playwright install --with-deps chromium (может запросить права администратора).

Магазин: http://127.0.0.1:8000. Остановка сервера — Ctrl+C.
API и UI требуют работающего сервера. Unit-тесты работают без него.
Запуск всех каталогов требует и сервер, и Chromium.
После успешной установки сохрани точные версии зависимостей своего окружения.

## Контракт

- GET /health → 200, {"status":"ok"}
- GET /products → 200, {"items":[...]}
- POST /orders с {"items":[{"product_id":1,"quantity":2}]} → 201.
  Ответ: id, items, total_cents, status="created".
- GET /orders/{id} → 200 или 404.
- DELETE /orders/{id} → 204; повтор → 404.
- Пустые items, неизвестный product_id, количество вне 1…99, bool, дроби,
  пропущенные обязательные поля → 422. Цены в целых копейках берутся с сервера.

Состояние в памяти сбрасывается при перезапуске. Сервер слушает только 127.0.0.1.
Здесь нет аккаунтов, прав доступа, изменения заказов, пагинации и идемпотентности.
Добавь их как самостоятельные расширения для продвинутых уроков.
Примеры этих тем в курсе не выполняются готовым сервером.
Этот сервер предназначен для обучения на своём компьютере.

## Следующие шаги

1. Добавь негативные проверки типов и пропущенных полей.
2. Добавь скидку в API и проверь итоговые суммы.
3. Вынеси подготовку и очистку заказов в фикстуру.
4. Сделай Page Object и проверки пустой корзины.
5. Настрой CI с сервером, readiness-check и trace.
6. Добавь собственные контрактные и property-based тесты.

Готовые примеры — старт, а не выполненное за тебя портфолио.
