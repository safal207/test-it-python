"""Build original, editable AI PATH teaching decks and matching print HTML.

Run with Python 3.12. Dependencies: python-pptx (installed in artifacts/slide-deps).
All visuals are original diagrams; no Unity runtime screenshots are implied.
PDF is produced separately from the HTML using a real browser print engine.
"""
from pathlib import Path
import html
import json
import shutil
import sys

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "artifacts" / "slide-deps"))
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

OUT = REPO / "dist" / "ai-path" / "teaching" / "unity"
CHAT = REPO / "artifacts" / "unity-slides" / "exports"
OUT.mkdir(parents=True, exist_ok=True)
CHAT.mkdir(parents=True, exist_ok=True)
W, H = 1600, 900
CREAM, PURPLE, INK, LIME = "FFF9EF", "6935CB", "24133F", "A7DF4B"
MUTED, LAVENDER, LINE, WHITE = "685A78", "EEE5FB", "D8CCE5", "FFFFFF"
SOURCES = {
    "S1": ("Unity 6: поддержка версий", "https://unity.com/releases/unity-6/support"),
    "S2": ("Input System: установка", "https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/Installation.html"),
    "S3": ("Rigidbody2D.linearVelocity", "https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Rigidbody2D-linearVelocity.html"),
}


class Deck:
    def __init__(self, name, title, total):
        self.name, self.title, self.total = name, title, total
        self.slides, self.current = [], None

    def slide(self, eyebrow, title, subtitle="", dark=False, sources=()):
        self.current = {"elements": [], "dark": dark, "sources": sources, "notes": []}
        self.slides.append(self.current)
        fg = CREAM if dark else INK
        self.rect(0, 0, W, H, INK if dark else CREAM)
        self.rect(80, 63, 12, 31, LIME if dark else PURPLE, radius=4)
        self.text(109, 61, 220, 36, "AI PATH", 25, fg, True)
        self.text(1260, 64, 260, 30, "UNITY + ИИ", 18, LIME if dark else PURPLE, True, align="right")
        self.text(80, 125, 1440, 27, eyebrow.upper(), 18, LIME if dark else PURPLE, True)
        self.text(80, 168, 1440, 151 if "\n" in title else 96, title, 62, fg, True)
        if subtitle:
            self.text(84, 274, 1430, 65, subtitle, 26, "D9CDEB" if dark else MUTED)
        self.rect(80, 833, 1440, 1, "55436D" if dark else LINE)
        self.text(80, 850, 1120, 25, self.title + " · AI PATH · предлагаемый учебный формат", 15, "C7B7D9" if dark else MUTED)
        self.text(1350, 848, 170, 27, f"{len(self.slides):02d} / {self.total:02d}", 18, LIME if dark else PURPLE, True, align="right")
        if sources:
            self.current["notes"].append("Источники: " + "; ".join(f"{key} — {SOURCES[key][1]}" for key in sources))
        return self

    def rect(self, x, y, w, h, fill, border=None, radius=0, kind="rect"):
        self.current["elements"].append(dict(type="shape", x=x, y=y, w=w, h=h, fill=fill, border=border, radius=radius, kind=kind))

    def text(self, x, y, w, h, text, size=28, color=INK, bold=False, font="Segoe UI", align="left", link=None):
        self.current["elements"].append(dict(type="text", x=x, y=y, w=w, h=h, text=text, size=size, color=color, bold=bold, font=font, align=align, link=link))

    def pill(self, x, y, w, text, dark=False):
        self.rect(x, y, w, 44, LIME if dark else LAVENDER, radius=20)
        self.text(x + 14, y + 8, w - 28, 28, text, 19, INK if dark else PURPLE, True)

    def card(self, x, y, w, h, number, title, body, dark=False):
        self.rect(x, y, w, h, "342149" if dark else WHITE, "5D4776" if dark else LINE, 18)
        self.text(x + 24, y + 23, w - 48, 35, number, 23, LIME if dark else PURPLE, True)
        self.text(x + 24, y + 78, w - 48, 92, title, 33, CREAM if dark else INK, True)
        self.text(x + 24, y + 183, w - 48, h - 201, body, 25, "DECFEB" if dark else MUTED)

    def source_line(self, keys, y=795):
        x = 84
        for key in keys:
            title, url = SOURCES[key]
            self.text(x, y, 460, 25, f"{key} · {title} ↗", 15, PURPLE, link=url)
            x += 480

    def note(self, value):
        self.current["notes"].append(value)


def game_board(d, x, y, w=690, h=350, label="Схема задуманного уровня · не кадр Unity"):
    d.rect(x, y, w, h, "EEE5FB", "D3C3E9", 22)
    cell = min((w - 64) / 9, (h - 70) / 5)
    for row in range(5):
        for col in range(9):
            d.rect(x + 28 + col * cell, y + 24 + row * cell, cell - 5, cell - 5, "E3D5F5", radius=4)
    for col, row in [(3, 0), (3, 1), (3, 3), (6, 1), (6, 2)]:
        d.rect(x + 28 + col * cell, y + 24 + row * cell, cell - 5, cell - 5, "A48BBF", radius=4)
    d.rect(x + 35 + cell, y + 31 + cell * 3, cell - 19, cell - 19, PURPLE, radius=8)
    for col, row in [(1, 1), (5, 3), (7, 0)]:
        d.rect(x + 39 + col * cell, y + 35 + row * cell, cell - 27, cell - 27, LIME, kind="diamond")
    d.text(x + 28, y + h - 34, w - 56, 25, label, 15, MUTED)


course = Deck("course-slides", "Курс · Первая игра в Unity с ИИ", 10)
course.slide("8 недель · 8 встреч · новый предлагаемый курс", "Первая игра в Unity.\nС ИИ — и пониманием.", dark=True)
course.text(84, 350, 670, 145, "Один небольшой уровень,\nкоторый можно пройти,\nперезапустить и объяснить.", 36, CREAM)
course.pill(84, 538, 245, "Можно с нуля", True)
course.pill(345, 538, 237, "Нужен компьютер", True)
course.text(84, 632, 660, 110, "Начинаем с управления квадратом.\nИдём к законченному игровому циклу.", 27, "D9CDEB")
game_board(course, 800, 367, 720, 378)
course.note("Обещание — ограниченный учебный результат. Это план нового курса, не сведения о завершённых потоках или коммерческом успехе.")

course.slide("01 · конечный результат", "«Собери 3 кристалла»", "Планируемая 2D-игра: небольшая задача с понятным началом и финалом.")
game_board(course, 80, 365, 810, 407)
for i, (title, body) in enumerate([
    ("Двигайся", "Клавиши меняют положение героя."),
    ("Собирай", "Предмет исчезает, счёт растёт."),
    ("Заверши и повтори", "Три кристалла → победа → перезапуск."),
]):
    yy = 363 + i * 137
    course.text(955, yy, 560, 43, f"{i+1:02d}  {title}", 32, PURPLE, True)
    course.text(1010, yy + 50, 500, 75, body, 27, MUTED)

course.slide("02 · что останется после работы", "Результат можно открыть и проверить.", "Каждый артефакт помогает показать, что сделано и как это работает.")
for i, args in enumerate([
    ("01 / ПРОЕКТ", "Сцена\nи исходники", "Понятные объекты, компоненты и небольшие C#-скрипты."),
    ("02 / ЗАПУСК", "Игровая\nсборка", "Версия для согласованной компьютерной платформы и инструкция запуска."),
    ("03 / ПРОВЕРКА", "Чек-лист\nи исправления", "Пять основных сценариев, найденные ошибки и повторная проверка."),
    ("04 / КЕЙС", "Короткий\nразбор", "Реальные кадры после запуска, собственный вклад и ограничения."),
]):
    course.card(80 + i * 365, 365, 345, 415, *args)

course.slide("03 · кому подойдёт", "Интерес к игре важнее опыта.", "Можно начать с нуля. Нужны компьютер, клавиатура и готовность пробовать.")
course.card(80, 370, 700, 370, "ТЕБЕ ПОДОЙДЁТ", "Хочется сделать свою игру", "Готов разбирать небольшие шаги, менять код и проверять последствия. Пока не знаешь C# — начнём с нужного минимума.")
course.card(810, 370, 710, 370, "ПЕРЕД СТАРТОМ", "Проверим рабочее место", "Доступ к Unity Hub, редактору и папке проекта. Подходящий компьютер и возможность установки уточним до начала; телефон не заменяет редактор.")
course.text(84, 765, 1420, 35, "Объём практики, расписание и формат поддержки обсуждаем заранее.", 24, PURPLE, True)

course.slide("04 · роль ИИ", "ИИ предлагает. Автор решает.", "Используем помощь там, где можем объяснить запрос и проверить ответ.")
course.card(80, 365, 450, 397, "ЗАПРОС", "Один небольшой шаг", "Описать сцену, компонент, версию Unity и ожидаемое действие. Попросить объяснение, а не огромный проект.")
course.card(575, 365, 450, 397, "ПРОВЕРКА", "Прочитать и запустить", "Разобрать код, поставить его на нужный объект, выполнить тест и прочитать Console.")
course.card(1070, 365, 450, 397, "РЕШЕНИЕ", "Оставить или исправить", "Сопоставить ожидание и результат. Уметь показать, что именно изменил человек и зачем.")
course.text(84, 782, 1420, 28, "Не отправляем ИИ пароли, личные данные и чужие материалы без права использования.", 21, MUTED)

course.slide("05 · маршрут курса", "8 этапов — один игровой цикл.", "Предлагаемый план: 8 недель и 8 встреч. Темп уточняем на старте.")
stages = [
    ("01", "Сцена", "Объекты и рабочее место"), ("02", "Управление", "Направление и движение"),
    ("03", "Взаимодействия", "Предметы и столкновения"), ("04", "Игровой цикл", "Счёт, победа, перезапуск"),
    ("05", "Интерфейс", "Состояние видно игроку"), ("06", "Звук и стиль", "Понятная обратная связь"),
    ("07", "Проверка", "Ошибки и повторные тесты"), ("08", "Сборка и кейс", "Запуск и объяснение результата"),
]
for i, (num, title, body) in enumerate(stages):
    x, y = 80 + (i % 4) * 365, 355 + (i // 4) * 220
    course.rect(x, y, 345, 194, WHITE, LINE, 17)
    course.pill(x + 20, y + 17, 65, num)
    course.text(x + 20, y + 80, 305, 45, title, 30, INK, True)
    course.text(x + 20, y + 132, 305, 58, body, 23, MUTED)

course.slide("06 · как проходит занятие", "Сначала действие. Потом — объяснение.", "У каждого шага есть наблюдаемый результат, который можно повторить.")
for i, (num, title, body) in enumerate([
    ("01", "Поставить задачу", "Что хотим увидеть в игре?"),
    ("02", "Собрать вместе", "Один компонент или кусок логики."),
    ("03", "Изменить самому", "Параметр, правило или состояние."),
    ("04", "Проверить", "Ожидание → действие → результат."),
]):
    course.card(80 + i * 365, 365, 345, 350, num, title, body)
course.rect(80, 744, 1440, 62, LAVENDER, radius=12)
course.text(105, 761, 1385, 38, "Между встречами — небольшой повторяемый шаг. Следующая встреча начинается с его разбора.", 25, PURPLE, True)

course.slide("07 · критерии готовности", "Не «выглядит готово». Можно пройти.", "Проверяем игровой результат, а не количество добавленных деталей.")
criteria = [
    ("Управление", "Герой движется и останавливается предсказуемо."),
    ("Предметы и счёт", "Каждый кристалл учитывается один раз; счёт совпадает с действиями."),
    ("Победа", "После трёх кристаллов появляется понятный финал."),
    ("Перезапуск", "Новая попытка возвращает исходное состояние."),
    ("Запуск и ошибки", "Сборка открывается в согласованном окружении; Console проверена."),
]
for i, (title, body) in enumerate(criteria):
    y = 355 + i * 86
    course.rect(82, y + 2, 38, 38, LIME, radius=7)
    course.text(90, y + 6, 25, 28, str(i + 1), 22, INK, True)
    course.text(145, y, 370, 40, title, 29, INK, True)
    course.text(520, y + 2, 990, 65, body, 26, MUTED)

course.slide("08 · честные границы", "Маленькая законченная игра.\nБез обещания большого продакшена.", dark=True)
course.card(80, 370, 700, 390, "В ПЕРВОЙ ВЕРСИИ", "Один 2D-уровень", "Движение, сбор предметов, счёт, победа и повтор. Простые собственные или разрешённые материалы.", True)
course.card(810, 370, 710, 390, "ОТДЕЛЬНО ОБСУЖДАЕМ", "Следующий масштаб", "Мультиплеер, большой мир, магазин, мобильный релиз, сервер и монетизация. Курс не гарантирует доход или трудоустройство.", True)
course.note("Не заявлять завершённые потоки, отзывы, продажи или измеренные результаты: подтверждений нет. Не обещать публикацию в магазине как автоматический итог.")

course.slide("09 · следующий шаг", "Начнём с твоей идеи.", "Сначала согласуем посильную первую версию и рабочее окружение.")
course.text(84, 374, 790, 205, "Напиши три вещи:\n1. Какую игру хочется сделать.\n2. Пробовал ли Unity или код.\n3. На каком компьютере будешь работать.", 32, INK)
course.rect(930, 365, 590, 265, PURPLE, radius=24)
course.text(965, 395, 520, 45, "ОБСУДИТЬ СТАРТ", 23, CREAM, True)
course.text(965, 469, 520, 55, "safal0645@gmail.com", 34, WHITE, True, link="mailto:safal0645@gmail.com")
course.text(965, 547, 520, 60, "План курса — повод для разговора,\nне оформленный заказ.", 24, "E3D6F4")
course.text(84, 670, 1420, 95, "Стоимость, календарь, состав работы и расходы на сервисы согласуем до начала.\nДля знакомства с первым уроком покупка сервиса ИИ не нужна.", 27, MUTED)


lesson = Deck("lesson-01-slides", "Урок 01 · Управляем спрайтом", 12)
lesson.slide("урок 01 · первый наблюдаемый результат", "Нажал клавишу —\nквадрат поехал.", dark=True)
lesson.text(84, 365, 720, 175, "Сегодня: движение спрайта\nпо WASD и стрелкам.\nОтпустил клавиши — остановка.", 35, CREAM)
lesson.pill(84, 581, 250, "Unity 6.3 LTS", True)
lesson.pill(350, 581, 275, "Input System", True)
lesson.text(84, 675, 730, 90, "Кристаллы, счёт и победа — следующие уроки.\nЭтот код ещё не запускался в Unity.", 25, "DECFEB")
lesson.rect(1010, 420, 170, 170, PURPLE, radius=18)
for x, y, text in [(1060, 340, "W / ↑"), (1060, 627, "S / ↓"), (824, 482, "A / ←"), (1245, 482, "D / →")]:
    lesson.text(x, y, 230, 60, text, 36, LIME, True)
lesson.text(923, 735, 540, 30, "Схема управления · не кадр из редактора", 18, "C7B7D9")

lesson.slide("01 · подготовь среду", "Hub → редактор → 2D-проект.", "Выбранная база урока — Unity 6.3 LTS. Другая версия может отличаться меню.", sources=("S1", "S2"))
lesson.card(80, 355, 450, 387, "1 / UNITY HUB", "Редактор на ПК", "Установи Unity Hub и Unity 6.3 LTS. Проверь доступное место и право установки. Не начинай с мобильного устройства.")
lesson.card(575, 355, 450, 387, "2 / ПРОЕКТ", "Новый 2D-проект", "Выбери доступный 2D-шаблон. Назови проект CrystalStart. Создай папки Scenes и Scripts внутри Assets.")
lesson.card(1070, 355, 450, 387, "3 / ВВОД", "Input System", "В Package Manager проверь пакет Input System. В Active Input Handling выбери Input System Package (New) и перезапусти редактор по запросу.")
lesson.source_line(["S1", "S2"])
lesson.note("Путь настройки: Edit → Project Settings → Player → Other Settings → Active Input Handling. Package Manager: Unity Registry → Input System. Совместимую версию выбирает редактор; ссылка S2 — справочник установки, не требование закрепить 1.14.2.")

lesson.slide("02 · карта редактора", "Пять областей. Пять вопросов.", "Схема расположения условная: панели в твоём редакторе могут стоять иначе.")
panels = [
    (80, 355, 320, 283, "Hierarchy", "Что есть в сцене?"),
    (420, 355, 650, 283, "Scene / Game", "Где настраиваю / что видит игрок?"),
    (1090, 355, 430, 425, "Inspector", "Какие параметры у объекта?"),
    (80, 658, 540, 122, "Project", "Где сохранены файлы?"),
    (640, 658, 430, 122, "Console", "Что сообщает код?"),
]
for x, y, w, h, title, body in panels:
    lesson.rect(x, y, w, h, LAVENDER if title == "Scene / Game" else WHITE, LINE, 16)
    lesson.text(x + 22, y + 20, w - 44, 45, title, 32, PURPLE, True)
    lesson.text(x + 22, y + 75, w - 44, 75, body, 26, MUTED)
lesson.note("Попросить ученика показать объект в Hierarchy, его компонент в Inspector и исходный файл в Project. Это авторская схема интерфейса, не скриншот Unity.")

lesson.slide("03 · создай сцену", "Lesson01: камера и один игрок.", "Сначала статичная сцена. Движение добавим отдельным шагом.")
lesson.text(84, 367, 790, 320, "1. Сохрани сцену: Assets/Scenes/Lesson01.\n2. Создай 2D Object → Sprites → Square.\n3. Переименуй объект в Player.\n4. Position: X = 0, Y = 0, Z = 0.\n5. У камеры: Orthographic, Z = −10.\n6. В Game должен быть виден квадрат.", 30, INK)
lesson.rect(970, 365, 550, 355, LAVENDER, LINE, 20)
lesson.text(1000, 392, 490, 34, "ОЖИДАЕМАЯ СЦЕНА", 18, PURPLE, True)
lesson.rect(1180, 486, 125, 125, PURPLE, radius=8)
lesson.text(1000, 659, 490, 32, "Схема: Player в кадре камеры", 21, MUTED)
lesson.text(84, 750, 1410, 44, "Проверка: выдели Player → найди Transform и Sprite Renderer в Inspector.", 27, PURPLE, True)

lesson.slide("04 · добавь компоненты", "Один объект — несколько обязанностей.", "Выдели Player и проверь каждый компонент до добавления кода.")
components = [
    ("Sprite Renderer", "Видимый квадрат", "Sprite: Square; цвет на твой выбор."),
    ("Rigidbody2D", "Движение через физику", "Body Type: Dynamic · Gravity Scale: 0\nLinear Damping: 0 · Freeze Rotation Z: ✓"),
    ("BoxCollider2D", "Граница объекта", "Оставь обычный коллайдер, Is Trigger выключен.\nСтолкновения разберём позже."),
]
for i, (title, sub, body) in enumerate(components):
    y = 355 + i * 145
    lesson.rect(80, y, 1440, 126, WHITE, LINE, 16)
    lesson.text(105, y + 22, 370, 43, title, 31, PURPLE, True)
    lesson.text(105, y + 72, 370, 34, sub, 22, MUTED)
    lesson.text(525, y + 25, 950, 80, body, 28, INK)

lesson.slide("05 · запрос к ИИ", "Попроси один проверяемый шаг.", "Пример запроса: версия, сцена, ограничения и способ проверить ответ.")
lesson.rect(80, 355, 1440, 316, INK, radius=20)
lesson.text(112, 382, 1374, 260, "Unity 6.3 LTS, 2D, Input System. Есть Player с Rigidbody2D.\nНужен PlayerMover: WASD и стрелки, без ускорения по диагонали.\nВ Update читаем Keyboard.current; при null направление равно нулю.\nВ FixedUpdate меняем linearVelocity. Противоположные клавиши\nвзаимно отменяются. Объясни Awake, Update и FixedUpdate.\nДай полный класс и пять проверок. Не добавляй другие механики.", 29, CREAM)
lesson.text(85, 708, 1410, 95, "После ответа: прочитай код → сопоставь с компонентами → запусти → проверь.\nЕсли видишь старый Input.GetAxis или другой API — уточни ограничения запроса.", 27, PURPLE, True)

lesson.slide("06 · подготовь скрипт", "Файл и класс: PlayerMover.", "Создай C#-скрипт в Assets/Scripts, замени содержимое полным кодом из раздатки.")
lesson.rect(80, 355, 880, 407, INK, radius=18)
lesson.text(108, 379, 820, 360, "using UnityEngine;\nusing UnityEngine.InputSystem;\n[RequireComponent(typeof(Rigidbody2D))]\npublic class PlayerMover : MonoBehaviour\n{\n    [SerializeField] private float speed = 4f;\n    private Rigidbody2D body;\n    private Vector2 direction;\n    private void Awake()\n    {\n        body = GetComponent<Rigidbody2D>();\n    }\n}", 23, CREAM, font="Consolas")
lesson.text(1005, 370, 505, 260, "Awake\nНаходит Rigidbody2D\nна том же объекте.\n\nSpeed = 4\nСкорость видна в Inspector.\nНе меняй её в Play Mode.", 29, INK)
lesson.text(1005, 685, 505, 95, "Здесь фрагмент. Полный PlayerMover.cs — рядом с презентацией.", 23, PURPLE, True)

lesson.slide("07 · прочитай направление", "Update: клавиши → вектор.", "Каждый кадр получаем новый ввод. Противоположные направления вычитаются.")
lesson.rect(80, 355, 1035, 407, INK, radius=18)
lesson.text(107, 378, 981, 365, "private void Update()\n{\n    Keyboard k = Keyboard.current;\n    if (k == null) { direction = Vector2.zero; return; }\n\n    float x = (k.dKey.isPressed || k.rightArrowKey.isPressed ? 1f : 0f)\n            - (k.aKey.isPressed || k.leftArrowKey.isPressed ? 1f : 0f);\n    float y = (k.wKey.isPressed || k.upArrowKey.isPressed ? 1f : 0f)\n            - (k.sKey.isPressed || k.downArrowKey.isPressed ? 1f : 0f);\n    direction = Vector2.ClampMagnitude(new Vector2(x, y), 1f);\n}", 23, CREAM, font="Consolas")
lesson.text(1160, 369, 350, 107, "D → (1, 0)\nA + D → (0, 0)", 30, PURPLE, True)
lesson.text(1160, 520, 350, 210, "W + D:\nдиагональ длиной 1.\n\nClampMagnitude\nне даёт ехать\nбыстрее по диагонали.", 27, INK)

lesson.slide("08 · примени движение", "FixedUpdate: вектор → скорость.", "Клавиши читаем в Update. Rigidbody2D меняем на шаге физики.", sources=("S3",))
lesson.rect(80, 355, 940, 265, INK, radius=18)
lesson.text(112, 394, 878, 175, "private void FixedUpdate()\n{\n    body.linearVelocity = direction * speed;\n}", 33, CREAM, font="Consolas")
lesson.text(1065, 363, 450, 235, "Отпустили клавиши?\ndirection = (0, 0)\n\nНа следующем шаге\nскорость станет нулевой.", 29, INK)
lesson.text(84, 674, 1410, 88, "Прикрепи PlayerMover к Player. Сохрани. Нажми Play и кликни в Game.\nЗдесь задаётся скорость: дополнительно умножать её на deltaTime не нужно.", 27, PURPLE, True)
lesson.source_line(["S3"])

lesson.slide("09 · проверка результата", "Пять тестов. Запиши факт.", "Ожидание — ниже. Фактический результат нужно получить в твоём Unity.")
tests = [
    ("Движение", "WASD и стрелки", "Нужное направление; квадрат виден в Game."),
    ("Остановка", "Нажать D → отпустить", "На следующем шаге физики скорость нулевая."),
    ("Диагональ", "D и W + D за одно время", "Модуль скорости одинаковый; диагональ не быстрее."),
    ("Противоречие", "A + D; W + S", "По соответствующей оси движения нет."),
    ("Console", "Очистить → Play → все действия", "Нет новых красных ошибок; результат зафиксирован."),
]
lesson.text(106, 350, 330, 30, "ЧТО ПРОВЕРЯЕМ", 18, PURPLE, True)
lesson.text(465, 350, 385, 30, "ДЕЙСТВИЕ", 18, PURPLE, True)
lesson.text(900, 350, 580, 30, "ОЖИДАЕМЫЙ РЕЗУЛЬТАТ", 18, PURPLE, True)
for i, (name, action, result) in enumerate(tests):
    y = 392 + i * 78
    lesson.rect(80, y, 1440, 67, WHITE if i % 2 == 0 else LAVENDER, radius=9)
    lesson.text(106, y + 17, 330, 40, f"0{i+1}  {name}", 25, INK, True)
    lesson.text(465, y + 17, 385, 46, action, 23, INK)
    lesson.text(900, y + 14, 580, 52, result, 23, MUTED)
lesson.note("Скорость по диагонали проверять по модулю вектора или пройденному расстоянию за равное время, а не по горизонтальному смещению. Статус заранее не ставить PASS: реальный Unity-запуск ещё не выполнен.")

lesson.slide("10 · если не работает", "Ищи первый нарушенный шаг.", "Меняй одну причину за раз и повторяй тот же тест.")
issues = [
    ("Не двигается", "Play включён? Game в фокусе?\nPlayerMover находится на Player?"),
    ("Красная ошибка", "Прочитай первую ошибку Console.\nФайл и класс называются PlayerMover?"),
    ("InputSystem не найден", "Проверь пакет и Active Input Handling.\nПосле смены настройки перезапусти редактор."),
    ("Падает или крутится", "Rigidbody2D: Gravity Scale = 0.\nConstraints: Freeze Rotation Z."),
]
for i, (title, body) in enumerate(issues):
    x, y = 80 + i % 2 * 730, 355 + i // 2 * 218
    lesson.rect(x, y, 710, 192, WHITE, LINE, 16)
    lesson.text(x + 24, y + 23, 662, 49, title, 32, PURPLE, True)
    lesson.text(x + 24, y + 88, 662, 90, body, 26, MUTED)

lesson.slide("11 · самостоятельный повтор", "Поменяй скорость. Докажи изменение.", "Останови Play Mode перед изменением параметров, чтобы они сохранились.")
for i, (value, title, body) in enumerate([
    ("4", "Исходный вариант", "Запусти пять тестов и сохрани наблюдения."),
    ("2", "Медленнее", "Измени Speed в Inspector. Повтори тест движения за то же время."),
    ("4", "Верни и перепроверь", "Восстанови Speed. Убедись, что поведение вернулось."),
]):
    lesson.card(80 + i * 495, 355, 450, 352, value, title, body)
lesson.text(84, 742, 1415, 66, "Сдай: сцену Lesson01, PlayerMover.cs и запись пяти проверок.\nСледующий шаг — первый собираемый предмет. Сегодня его ещё не делаем.", 26, PURPLE, True)


PLAYER_CODE = """using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(Rigidbody2D))]
public class PlayerMover : MonoBehaviour
{
    [SerializeField] private float speed = 4f;
    private Rigidbody2D body;
    private Vector2 direction;

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
    }

    private void Update()
    {
        Keyboard k = Keyboard.current;
        if (k == null)
        {
            direction = Vector2.zero;
            return;
        }

        float x = (k.dKey.isPressed || k.rightArrowKey.isPressed ? 1f : 0f)
                - (k.aKey.isPressed || k.leftArrowKey.isPressed ? 1f : 0f);
        float y = (k.wKey.isPressed || k.upArrowKey.isPressed ? 1f : 0f)
                - (k.sKey.isPressed || k.downArrowKey.isPressed ? 1f : 0f);

        direction = Vector2.ClampMagnitude(new Vector2(x, y), 1f);
    }

    private void FixedUpdate()
    {
        body.linearVelocity = direction * speed;
    }
}
"""

HANDOUT = """# Урок 01 — управление спрайтом в Unity

**Статус:** подготовленный учебный материал. Код сопоставлен с официальным API, но ещё не компилировался и не запускался в Unity. Ни один тест ниже заранее не считается пройденным.

**Результат урока:** квадрат движется по WASD и стрелкам, останавливается после отпускания клавиш и не получает прибавку скорости по диагонали. Предметы, счёт, победа и перезапуск относятся к следующим урокам.

## Подготовка

1. Нужны компьютер, клавиатура, Unity Hub, редактор и право установки. Требования компьютера и свободное место проверь до начала.
2. Рабочая версия этого материала — **Unity 6.3 LTS**, не утверждение о самой новой версии. Проверь поддержку на официальной странице [S1].
3. Создай проект `CrystalStart` с доступным 2D-шаблоном. Названия шаблонов могут различаться.
4. В `Window → Package Manager` открой Unity Registry, найди и установи совместимый пакет **Input System**. Документация [S2] объясняет процесс; номер 1.14 в ссылке не является требованием установить именно эту версию.
5. В `Edit → Project Settings → Player → Other Settings → Active Input Handling` выбери `Input System Package (New)`. Если редактор запросит перезапуск — согласись после сохранения проекта.
6. В `Assets` создай папки `Scenes` и `Scripts`.

## Сцена Lesson01

1. Сохрани сцену в `Assets/Scenes/Lesson01.unity`.
2. В Hierarchy создай `2D Object → Sprites → Square`, назови объект `Player`.
3. У Player установи Position `(0, 0, 0)`, Scale `(1, 1, 1)`. Убедись, что Sprite Renderer показывает Square.
4. У Main Camera выбери Orthographic, позицию `(0, 0, -10)`. Размер камеры около 5 достаточен для этого примера. В Game должен быть виден квадрат.
5. Добавь к Player `Rigidbody2D`: Body Type `Dynamic`, Gravity Scale `0`, Linear Damping `0`, Constraints → Freeze Rotation `Z`. Позиции X/Y не замораживать.
6. Добавь `BoxCollider2D`, оставь `Is Trigger` выключенным. В этом уроке нет стен: коллизии ещё не проверяются.
7. Создай `Assets/Scripts/PlayerMover.cs`. Имя файла и класса должны совпадать. Замени всё содержимое кодом ниже, сохрани и дождись окончания компиляции.
8. Добавь PlayerMover на Player перетаскиванием файла или через Add Component. В Inspector установи Speed `4`.
9. Сохрани сцену. Очисти Console, нажми Play, кликни в Game и проверь управление.

## Полный код

```csharp
{code}```

## Как читать код

- `Awake` один раз получает Rigidbody2D на том же объекте. Атрибут RequireComponent задаёт зависимость компонента.
- `Update` читает текущую клавиатуру. Если её нет, направление становится нулевым. Нажатие любой клавиши пары WASD/стрелка даёт одно направление: два одинаковых направления не складываются в ускорение.
- Правое направление минус левое даёт X, верхнее минус нижнее — Y. Одновременные противоположные клавиши отменяют движение по этой оси.
- `Vector2.ClampMagnitude(..., 1f)` ограничивает длину направления: диагональ не становится быстрее.
- `FixedUpdate` задаёт `linearVelocity` в единицах сцены за секунду. Не умножай уже заданную скорость на `deltaTime`. Движение вручную через Transform к этому скрипту не добавляем.
- После отпускания клавиш направление обнуляется в Update; на следующем FixedUpdate скорость становится нулевой. Это ожидаемое поведение, а не обещание мгновенного нулевого времени задержки.

## Пять проверок

Выполняй тесты в свободной области, пока квадрат остаётся в кадре. Для сравнения повторов возвращай Player в центр вне Play Mode или перезапускай сцену.

| № | Действие | Ожидание | Факт / статус |
|---|---|---|---|
| 1 | По очереди нажать W/A/S/D, затем стрелки | Каждая клавиша двигает квадрат в соответствующую сторону | Не выполнено |
| 2 | Удержать D и отпустить все клавиши | На следующем шаге физики скорость нулевая, самопроизвольного движения нет | Не выполнено |
| 3 | Сравнить D и W+D при Speed=4 за одинаковое время | Модуль скорости и полное пройденное расстояние совпадают; диагональ не быстрее | Не выполнено |
| 4 | Нажать A+D, затем W+S | X=0 в первом случае, Y=0 во втором; W+A+S+D даёт остановку | Не выполнено |
| 5 | Очистить Console, включить Play, повторить действия | Новых красных ошибок нет | Не выполнено |

Для теста 3 можно записать X/Y позиции в начале и конце одинакового интервала и сравнить расстояние `sqrt(dx² + dy²)`. Не сравнивай только X: горизонтальная часть диагонали закономерно меньше. Ручной секундомер даёт погрешность — укажи её вместо заявления о точном равенстве.

## Если результат отличается

| Симптом | Что проверить первым |
|---|---|
| Клавиши ничего не делают | Play включён, Game в фокусе, скрипт на Player и компонент включён |
| Не находится UnityEngine.InputSystem | Пакет установлен, Active Input Handling выбран, редактор перезапущен |
| Скрипт не добавляется | Первая красная ошибка Console; файл PlayerMover.cs и класс PlayerMover совпадают |
| Квадрат падает или вращается | Rigidbody2D: Gravity Scale=0, Freeze Rotation Z |
| Квадрат пропал | Позиция Player, кадр камеры и Z; он мог просто выйти за экран |
| Скорость «не сохранилась» | Изменение сделано в Play Mode; останови игру, задай Speed в Inspector и сохрани |

Не меняй сразу несколько настроек. Запиши симптом, исправь одну причину и повтори тот же тест. При обращении за помощью приложи текст первой ошибки и описание действий, без паролей и личных данных.

## Домашний повтор

1. Speed `4`: выполни пять тестов и запиши фактические наблюдения.
2. Останови Play. Поставь Speed `2`, сохрани и сравни движение за одинаковое время.
3. Останови Play. Верни Speed `4`, сохрани и перепроверь.
4. Подготовь `Lesson01.unity`, `PlayerMover.cs` и таблицу пяти результатов. Кадр редактора делай только после настоящего запуска; не заменяй его иллюстрацией.
5. Не добавляй кристаллы заранее: следующий урок вводит одно взаимодействие отдельно.

## Официальные источники

- [S1 — поддержка Unity 6](https://unity.com/releases/unity-6/support)
- [S2 — установка Input System](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/Installation.html)
- [S3 — Rigidbody2D.linearVelocity](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Rigidbody2D-linearVelocity.html)

Проверены 1 ноября 2026 года. S3 открыт для Unity 6.0; применимость к выбранной 6.3 требует компиляции и пяти реальных тестов. Меню, совместимую версию пакета и требования среды проверяют на установленном редакторе.
"""


def rgb(value):
    return RGBColor.from_string(value)


def build_pptx(deck):
    assert len(deck.slides) == deck.total
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13 + 1/3), Inches(7.5)
    prs.core_properties.title = deck.title
    prs.core_properties.author = "AI PATH"
    prs.core_properties.subject = "Авторский учебный материал. Схемы не являются кадрами Unity."
    shapes = {"rect": MSO_SHAPE.RECTANGLE, "diamond": MSO_SHAPE.DIAMOND}
    for page in deck.slides:
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        for item in page["elements"]:
            x, y, w, h = [Inches(item[k] / 120) for k in ("x", "y", "w", "h")]
            if item["type"] == "shape":
                kind = MSO_SHAPE.ROUNDED_RECTANGLE if item["radius"] else shapes[item["kind"]]
                if item["kind"] == "diamond":
                    kind = MSO_SHAPE.DIAMOND
                shape = slide.shapes.add_shape(kind, x, y, w, h)
                if item["radius"] and len(shape.adjustments):
                    shape.adjustments[0] = min(.5, item["radius"] / min(item["w"], item["h"]))
                shape.fill.solid()
                shape.fill.fore_color.rgb = rgb(item["fill"])
                if item["border"]:
                    shape.line.color.rgb = rgb(item["border"])
                    shape.line.width = Pt(.8)
                else:
                    shape.line.fill.background()
            else:
                box = slide.shapes.add_textbox(x, y, w, h)
                tf = box.text_frame
                tf.clear()
                tf.word_wrap = True
                tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                tf.vertical_anchor = MSO_ANCHOR.TOP
                for idx, line in enumerate(item["text"].split("\n")):
                    p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
                    p.alignment = PP_ALIGN.RIGHT if item["align"] == "right" else PP_ALIGN.LEFT
                    p.space_before = p.space_after = Pt(0)
                    p.line_spacing = 1.12
                    run = p.add_run()
                    run.text = line
                    run.font.name = item["font"]
                    run.font.size = Pt(item["size"] * .6)
                    run.font.bold = item["bold"]
                    run.font.color.rgb = rgb(item["color"])
                    if item["link"]:
                        run.hyperlink.address = item["link"]
        slide.notes_slide.notes_text_frame.text = "\n\n".join(page["notes"] or ["Авторская учебная схема. Не заявлять фактический запуск Unity без отдельного подтверждения."])
    path = OUT / f"{deck.name}.pptx"
    prs.save(path)
    # Re-open to check the package and editable text, without claiming visual/runtime validation.
    check = Presentation(path)
    assert len(check.slides) == deck.total
    assert all(sum(bool(s.has_text_frame and s.text.strip()) for s in page.shapes) >= 6 for page in check.slides)
    return path


def build_html(deck):
    pages = []
    for index, page in enumerate(deck.slides, 1):
        elements = []
        for item in page["elements"]:
            css = f"left:{item['x']}px;top:{item['y']}px;width:{item['w']}px;height:{item['h']}px;"
            if item["type"] == "shape":
                css += f"background:#{item['fill']};border-radius:{item['radius']}px;"
                if item["border"]:
                    css += f"border:1px solid #{item['border']};"
                if item["kind"] == "diamond":
                    css += "clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);"
                elements.append(f'<div class="shape" style="{css}" aria-hidden="true"></div>')
            else:
                css += f"font-size:{item['size']}px;color:#{item['color']};font-weight:{700 if item['bold'] else 400};font-family:'{item['font']}',sans-serif;text-align:{item['align']};"
                text = html.escape(item["text"])
                if item["link"]:
                    text = f'<a href="{html.escape(item["link"], quote=True)}">{text}</a>'
                elements.append(f'<div class="txt" style="{css}">{text}</div>')
        pages.append(f'<section class="slide" aria-label="Слайд {index} из {deck.total}">'+"\n".join(elements)+"</section>")
    doc = f'''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(deck.title)}</title>
<style>
*{{box-sizing:border-box}}html{{background:#DAD2E4}}body{{margin:0;font-family:'Segoe UI',Arial,sans-serif}}.toolbar{{position:sticky;top:0;z-index:5;background:#{INK};color:#{CREAM};padding:14px 24px;display:flex;justify-content:space-between;gap:16px;font-size:16px}}.toolbar a{{color:#{LIME}}}.slide{{width:1600px;height:900px;position:relative;margin:28px auto;overflow:hidden;box-shadow:0 4px 32px #24133f20}}.shape,.txt{{position:absolute}}.txt{{white-space:pre-wrap;line-height:1.12;overflow-wrap:normal}}.txt a{{color:inherit;text-underline-offset:4px}}@media screen and (max-width:1620px){{.slide{{zoom:calc((100vw - 24px) / 1600px)}}}}@media screen and (max-width:620px){{.toolbar{{position:static;flex-direction:column;font-size:14px}}.toolbar span{{overflow-wrap:anywhere}}}}@page{{size:16in 9in;margin:0}}@media print{{html,body{{background:white}}.toolbar{{display:none}}.slide{{zoom:1;width:1600px;height:900px;margin:0;box-shadow:none;break-after:page;page-break-after:always}}.slide:last-child{{break-after:auto;page-break-after:auto}}*{{print-color-adjust:exact;-webkit-print-color-adjust:exact}}}}
</style></head><body><nav class="toolbar" aria-label="Материалы"><span>{html.escape(deck.title)} · {deck.total} слайдов</span><span><a href="{deck.name}.pptx">Скачать PPTX</a> · <a href="lesson-01.md">Раздатка и код</a> · <a href="../../unity.html">К курсу</a></span></nav>
{''.join(pages)}
</body></html>'''
    # The print page matches the CSS canvas at 100 px/in, with no browser-fit clipping.
    doc = doc.replace("size:16in 9in", "size:1600px 900px")
    path = OUT / f"{deck.name}.html"
    path.write_text(doc, encoding="utf-8", newline="\n")
    return path


if __name__ == "__main__":
    manifest = []
    for deck, friendly in [(course, "AI-PATH-Unity-course"), (lesson, "AI-PATH-Unity-lesson-01")]:
        pptx_path = build_pptx(deck)
        html_path = build_html(deck)
        shutil.copy2(pptx_path, CHAT / f"{friendly}.pptx")
        manifest.append({"title": deck.title, "slides": deck.total, "pptx": str(pptx_path), "html": str(html_path), "chat": str(CHAT / f"{friendly}.pptx")})
    (OUT / "PlayerMover.cs").write_text(PLAYER_CODE, encoding="utf-8", newline="\n")
    (OUT / "lesson-01.md").write_text(HANDOUT.replace("{code}", PLAYER_CODE), encoding="utf-8", newline="\n")
    (REPO / "artifacts" / "unity-slides-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
    print(json.dumps({"built": manifest, "status": "PPTX structural checks passed; browser visual/PDF and Unity runtime checks separate"}, ensure_ascii=True, indent=2))
