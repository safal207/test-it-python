const C=(expression,label)=>({expression,label});
export const labs = [
{id:'assert',title:'Первый assert',level:'С нуля',module:'start',minutes:5,description:'В функции test_total проверь, что сумма [100, 200, 300] равна 600. Вызови функцию, чтобы проверка действительно выполнилась.',starter:`def test_total():
    prices = [100, 200, 300]
    total = sum(prices)
    # Напиши assert здесь

test_total()
print("Проверка завершена")`,hint:'Проверка записывается как assert total == 600. Она поднимает AssertionError при неверном результате.',solution:`def test_total():
    prices = [100, 200, 300]
    total = sum(prices)
    assert total == 600

test_total()
print("Проверка завершена")`,checks:[C('any(isinstance(n, ast.Assert) for n in ast.walk(ast.parse(_source)))','В коде есть assert'),C('_assert_detects_bad_sum(_scope.get("test_total"))','Проверка замечает неверную сумму'),C('callable(_scope.get("test_total")) and _scope["test_total"]() is None','Тест проходит с правильной суммой')]},
{id:'boundaries',title:'Поймай ошибку на границе',level:'База',module:'start',minutes:8,description:'Исправь valid_quantity(q): разрешены целые количества от 1 до 99 включительно. На входах в этой задаче всегда целые числа.',starter:`def valid_quantity(q):
    return 1 < q < 99

print(valid_quantity(1))`,hint:'Обе границы включены. Используй <= с двух сторон.',solution:`def valid_quantity(q):
    return 1 <= q <= 99`,checks:[C('valid_quantity(0) is False','0 отклоняется'),C('valid_quantity(1) is True','1 разрешено'),C('valid_quantity(99) is True','99 разрешено'),C('valid_quantity(100) is False','100 отклоняется'),C('valid_quantity(50) is True','Обычное значение разрешено')]},
{id:'filter',title:'Достань активных пользователей',level:'Python',module:'python',minutes:10,description:'Напиши active_ids(users). Верни список id пользователей, у которых active равно True. Сохрани исходный порядок. У каждой записи есть id и active.',starter:`def active_ids(users):
    # Верни список id активных пользователей
    return []

print(active_ids([{"id": 7, "active": True}]))`,hint:'Подойдёт цикл с append или list comprehension: [u["id"] for u in users if u["active"] is True].',solution:`def active_ids(users):
    return [u["id"] for u in users if u["active"] is True]`,checks:[C('active_ids([]) == []','Пустой список'),C('active_ids([{"id": 7, "active": True}]) == [7]','Активный пользователь'),C('active_ids([{"id": 3, "active": False}, {"id": 8, "active": True}, {"id": 2, "active": True}]) == [8, 2]','Фильтрация и исходный порядок')]},
{id:'discount',title:'Скидка без сюрпризов',level:'Python',module:'python',minutes:12,description:'Реализуй discounted_price(price, percent). Цена в целых копейках, процент целый 0…100. Результат округляй вниз. Отрицательная цена и процент вне диапазона вызывают ValueError. Типы входа в задаче всегда int.',starter:`def discounted_price(price, percent):
    return price

print(discounted_price(1000, 10))`,hint:'Сначала отклони недопустимые значения. Расчёт: price * (100 - percent) // 100.',solution:`def discounted_price(price, percent):
    if price < 0 or not 0 <= percent <= 100:
        raise ValueError("invalid input")
    return price * (100 - percent) // 100`,checks:[C('discounted_price(1000, 10) == 900','Скидка 10%'),C('discounted_price(700, 0) == 700','Нулевая скидка'),C('discounted_price(700, 100) == 0','Полная скидка'),C('discounted_price(999, 15) == 849','Округление вниз'),C('_raises(ValueError, discounted_price, -1, 10)','Отрицательная цена'),C('_raises(ValueError, discounted_price, 100, 101) and _raises(ValueError, discounted_price, 100, -1)','Недопустимый процент')]},
{id:'cart',title:'Посчитай корзину',level:'Python',module:'python',minutes:10,description:'Напиши cart_total(items). У каждого товара есть целые price_cents и quantity. Верни сумму цена × количество. Пустая корзина стоит 0. Входные значения неотрицательны.',starter:`def cart_total(items):
    return 0

print(cart_total([{"price_cents": 300, "quantity": 2}]))`,hint:'Суммируй произведения для каждой записи. sum возвращает 0 для пустой последовательности.',solution:`def cart_total(items):
    return sum(item["price_cents"] * item["quantity"] for item in items)`,checks:[C('cart_total([]) == 0','Пустая корзина'),C('cart_total([{"price_cents": 300, "quantity": 2}]) == 600','Количество учитывается'),C('cart_total([{"price_cents": 100, "quantity": 3}, {"price_cents": 70, "quantity": 2}]) == 440','Несколько товаров'),C('cart_total([{"price_cents": 900, "quantity": 0}]) == 0','Нулевое количество')]},
{id:'pytest-param',title:'Запусти настоящий pytest',level:'pytest',module:'pytest',minutes:12,packages:['pytest'],pytest:true,description:'Напиши параметризованный тест встроенной abs. Добавь четыре пары: (0, 0), (-1, 1), (1, 1), (-10, 10). В test_abs проверь abs(value) == expected. Здесь действительно запускается pytest.',starter:`import pytest

@pytest.mark.parametrize("value, expected", [
    (0, 0),
    # Добавь остальные три набора
])
def test_abs(value, expected):
    pass`,hint:'В теле нужен assert abs(value) == expected. Каждая пара станет отдельным тестом.',solution:`import pytest

@pytest.mark.parametrize("value, expected", [
    (0, 0), (-1, 1), (1, 1), (-10, 10),
])
def test_abs(value, expected):
    assert abs(value) == expected`,checks:[C('any(isinstance(n, ast.Assert) for n in ast.walk(ast.parse(_source)))','В тесте есть assert'),C('_param_cases_cover(_scope.get("test_abs"))','Есть все четыре заданных случая'),C('_pytest_result == 0 and _pytest_count >= 4','pytest: не менее 4 тестов, без падений')]},
{id:'pytest-fixture',title:'Независимые тесты с фикстурой',level:'pytest',module:'pytest',minutes:12,packages:['pytest'],pytest:true,description:'Добавь фикстуру cart с областью function, которая возвращает новый пустой список. Два готовых теста должны пройти: один меняет корзину, второй проверяет, что она снова пустая.',starter:`import pytest

# Добавь фикстуру cart здесь

def test_add_item(cart):
    cart.append("book")
    assert cart == ["book"]

def test_empty_cart(cart):
    assert cart == []`,hint:'Напиши @pytest.fixture перед def cart(): и верни [] внутри. Общий список вне функции не подходит.',solution:`import pytest

@pytest.fixture
def cart():
    return []

def test_add_item(cart):
    cart.append("book")
    assert cart == ["book"]

def test_empty_cart(cart):
    assert cart == []`,checks:[C('_fixture_is_function(_scope.get("cart"))','cart — фикстура с областью function'),C('_fixture_is_fresh(_scope.get("cart"))','Каждый вызов создаёт независимый список'),C('_pytest_result == 0 and _pytest_count >= 2','pytest: оба теста проходят')]},
{id:'mock',title:'Клиент без настоящей сети',level:'pytest',module:'pytest',minutes:12,description:'Реализуй load_name(client, user_id): вызови client.get_user(user_id) ровно один раз и верни поле name. Проверка подставит мок-клиент.',starter:`def load_name(client, user_id):
    return ""

# Проверка передаст Mock вместо сети.`,hint:'Сохрани результат вызова в user и верни user["name"]. Не используй фиксированный ID.',solution:`def load_name(client, user_id):
    user = client.get_user(user_id)
    return user["name"]`,checks:[C('_mock_check(load_name, 7, "Alex")','Имя и один вызов с ID 7'),C('_mock_check(load_name, 42, "Sam")','ID передаётся из аргумента'),C('_propagates_client_error(load_name)','Ошибка клиента не скрывается')]},
{id:'contract',title:'Проверь контракт ответа',level:'API',module:'api',minutes:15,description:'Напиши valid_user(data). Верни True только для словаря с id — положительным int (bool не считается), name — непустой строкой после strip и active — bool. Дополнительные поля допустимы. Некорректные данные возвращают False.',starter:`def valid_user(data):
    return False

print(valid_user({"id": 7, "name": "Alex", "active": True}))`,hint:'Сначала isinstance(data, dict). Для id используй type(value) is int: bool — подкласс int. Имя проверь через str и strip().',solution:`def valid_user(data):
    return (
        isinstance(data, dict)
        and type(data.get("id")) is int
        and data["id"] > 0
        and isinstance(data.get("name"), str)
        and bool(data["name"].strip())
        and type(data.get("active")) is bool
    )`,checks:[C('valid_user({"id": 1, "name": "Alex", "active": True}) is True','Валидная запись'),C('valid_user({"id": 2, "name": "Sam", "active": False, "extra": 1}) is True','False и дополнительное поле допустимы'),C('valid_user({}) is False and valid_user(None) is False','Нет полей или неверный тип'),C('valid_user({"id": True, "name": "Alex", "active": True}) is False','bool не принимается как ID'),C('valid_user({"id": 0, "name": "Alex", "active": True}) is False','ID положительный'),C('valid_user({"id": 1, "name": "  ", "active": True}) is False','Пустое имя'),C('valid_user({"id": 1, "name": "Alex", "active": 1}) is False','active строго bool')]},
{id:'dedupe',title:'Удали дубли, сохрани порядок',level:'API',module:'api',minutes:12,description:'Реализуй unique_ids(ids): убери повторяющиеся целые ID, сохранив порядок первого появления. Исходный список не изменяй.',starter:`def unique_ids(ids):
    return ids

print(unique_ids([3, 1, 3, 2, 1]))`,hint:'Помни встреченные ID в set, результат собирай в list. Сам set не выражает требование порядка.',solution:`def unique_ids(ids):
    seen = set()
    result = []
    for value in ids:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result`,checks:[C('unique_ids([]) == []','Пустой вход'),C('unique_ids([3, 1, 3, 2, 1]) == [3, 1, 2]','Порядок первых появлений'),C('unique_ids([5, 5, 5]) == [5]','Повтор одного ID'),C('_does_not_mutate(unique_ids)','Вход не изменяется')]},
{id:'sql',title:'Заказ в базе SQLite',level:'SQL',module:'ci',minutes:15,description:'Напиши order_total(db, order_id). Верни total_cents из таблицы orders для заданного ID или None, если записи нет. db — соединение SQLite. Используй параметризованный запрос.',starter:`def order_total(db, order_id):
    # orders(id INTEGER, total_cents INTEGER)
    return None`,hint:'Выполни SELECT total_cents FROM orders WHERE id = ? с параметрами (order_id,). Верни row[0], если fetchone() вернул строку.',solution:`def order_total(db, order_id):
    row = db.execute(
        "SELECT total_cents FROM orders WHERE id = ?", (order_id,)
    ).fetchone()
    return row[0] if row is not None else None`,checks:[C('_sql_check(order_total, 1, 500)','Первый заказ'),C('_sql_check(order_total, 2, 900)','Другой заказ'),C('_sql_check(order_total, 999, None)','Записи нет'),C('_sql_check(order_total, "1 OR 1=1", None)','Ввод не интерпретируется как SQL')]},
{id:'normalize',title:'Нормализация и свойства',level:'Продвинутый',module:'advanced',minutes:12,description:'Реализуй normalize(text): убери пробелы по краям и приведи строку к нижнему регистру методом lower. Внутренние пробелы сохрани. Проверь идемпотентность.',starter:`def normalize(text):
    return text

print(normalize("  Hello QA  "))`,hint:'Соедини strip() и lower(). Повторный вызов с нормализованным результатом не должен его менять.',solution:`def normalize(text):
    return text.strip().lower()`,checks:[C('normalize("  Hello QA  ") == "hello qa"','Пробелы и регистр'),C('normalize("") == "" and normalize("   ") == ""','Пустые строки'),C('normalize(" A  B ") == "a  b"','Внутренние пробелы сохраняются'),C('normalize(" ПРИВЕТ ") == "привет"','Кириллица'),C('all(normalize(normalize(s)) == normalize(s) for s in ["", " HELLO ", " A  B ", "ПРИВЕТ"])','Идемпотентность')]},
{id:'percentile',title:'Посчитай p95',level:'Продвинутый',module:'advanced',minutes:15,description:'Реализуй percentile(values, p) методом nearest rank: отсортируй непустой список, индекс ceil(p / 100 × n) − 1. p в диапазоне (0, 100]. На пустом списке и неверном p — ValueError. Вход не изменяй.',starter:`import math

def percentile(values, p):
    return 0

print(percentile([10, 20, 30, 40], 95))`,hint:'Используй sorted(values). Валидация должна предшествовать вычислению индекса.',solution:`import math

def percentile(values, p):
    if not values or not 0 < p <= 100:
        raise ValueError("invalid input")
    ordered = sorted(values)
    return ordered[math.ceil(p / 100 * len(ordered)) - 1]`,checks:[C('percentile([40, 10, 30, 20], 95) == 40','p95'),C('percentile([40, 10, 30, 20], 50) == 20','p50 по nearest rank'),C('percentile([7], 100) == 7','Один элемент'),C('_raises(ValueError, percentile, [], 95)','Пустая выборка'),C('_raises(ValueError, percentile, [1, 2], 0) and _raises(ValueError, percentile, [1, 2], 101)','Неверный процентиль'),C('_percentile_preserves_input(percentile)','Вход не изменяется')]}
];

export const projects = [
{id:'unit',title:'01. Тесты бизнес-логики',level:'Python + pytest',goal:'Собери пакет расчёта корзины: сумма, скидка, валидация количества. Можно начать со стартового проекта ниже.',artifact:'Репозиторий с кодом, параметризованными тестами и README.',steps:['Опиши правила расчёта и допустимые входы.','Добавь минимум 10 осмысленных случаев: пустая корзина, границы, ошибки.','Разнеси код и тесты, используй фикстуры для данных.','Внеси дефект и убедись, что тесты его ловят.','Повтори установку и запуск по README в чистом окружении.'],review:'Каждый тест запускается отдельно. Удаление важного поведения вызывает понятное падение.'},
{id:'api',title:'02. API магазина',level:'HTTPX + API',goal:'Используй локальный магазин из стартового проекта. Проверь каталог, создание заказа и валидацию входа.',artifact:'API-клиент, независимые тесты, таблица негативных сценариев.',steps:['Запусти demo_server.py на своём компьютере.','Проверь GET /products и создание POST /orders.','Проверь неизвестный товар, количество 0 и отсутствие обязательного поля.','Прочитай заказ через GET /orders/{id}, затем удали его.','Вынеси base_url и timeout в настройки, очистку — в фикстуру.'],review:'Проверяется содержимое и сохранённое состояние. Все данные принадлежат конкретному тесту.'},
{id:'ui',title:'03. Браузерный путь покупателя',level:'Playwright',goal:'На локальном магазине добавь товар, создай заказ и проверь подтверждение. Затем усложни сценарий ошибками.',artifact:'UI-набор с Page Object и trace при падении.',steps:['Установи pytest-playwright и Chromium.','Запусти страницу магазина и пройди путь вручную.','Выбери локаторы по ролям и доступным именам.','Добавь проверки результата с expect, без sleep.','Сохрани trace при намеренном падении и опиши причину.'],review:'Тест проходит в headed и headless режимах и показывает понятный результат заказа.'},
{id:'pipeline',title:'04. Конвейер качества',level:'CI + Docker',goal:'Научи проект проверять себя при изменениях: сначала быстрые тесты, затем API и UI с локальным сервером.',artifact:'Workflow с результатом тестов и артефактами.',steps:['Добавь workflow для unit-тестов на push и pull_request.','Сохрани JUnit-отчёт даже при падении.','Запусти сервер для интеграционных тестов и проверь готовность.','Добавь UI-набор с установленным Chromium.','Убедись, что намеренный дефект делает проверку красной.'],review:'Чистый runner ставит зависимости, поднимает среду и возвращает настоящий exit code.'},
{id:'reliability',title:'05. Лаборатория надёжности',level:'Hypothesis + xdist',goal:'Проверь набор при параллелизме, случайных входах и изменении порядка.',artifact:'Разбор причины flaky и property-based тесты.',steps:['Запусти тесты на двух workers, проверь уникальность данных.','Добавь два свойства для чистых функций через Hypothesis.','Воспроизведи утечку общего состояния и исправь её.','Измерь длительность и зафиксируй медленные тесты.','Внеси мутацию функции и проверь, что тесты заметили её.'],review:'Результаты воспроизводятся, причины нестабильности описаны, повторы не скрывают проблему.'},
{id:'capstone',title:'06. QA-система магазина',level:'Итоговый проект',goal:'Объедини практику в законченный проект для демонстрации на собеседовании.',artifact:'Репозиторий, стратегия по рискам, CI, пример дефекта и демонстрация.',steps:['Составь карту рисков и объясни уровни проверок.','Раздели тесты, клиентов, страницы, данные и настройки.','Добавь негативные API-сценарии и критичный путь в UI.','Собери воспроизводимый запуск и артефакты CI.','Проведи ревью, укажи ограничения и защити решения в README.'],review:'Другой человек может запустить проект и понять, что он проверяет и почему.'}
];

