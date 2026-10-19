(function(){
    const root=document.getElementById('nn-readable-board');
    const ref='d848e04c8f8d6e3e8e42ce15fbd98c00612e0e17';
    const projects=[
      {id:'start',icon:'network',title:'Понять, как сеть учится',tag:'Начать здесь',sample:'Точки на плоскости → два класса',model:'MLP · NumPy',level:'Первый эксперимент после основ Python',inputTitle:'Координаты точек',inputDetail:'Небольшой искусственный набор. Правильные ответы известны заранее.',modelDetail:'Небольшая полносвязная сеть: 2 входа, скрытый слой из 16 нейронов и 1 выход.',outputTitle:'Вероятность класса',outputDetail:'Сравниваем ответы сети с правильными метками и простым способом без нейросети.',steps:[['Посмотреть данные','Создадим точки и поймём, какое правило должен выучить алгоритм.'],['Отделить данные для проверки','Часть примеров оставим для обучения, часть — для настройки, часть — только для финального теста.'],['Обучить маленькую сеть','Запустим обучение, посмотрим ошибку по шагам и изменим один параметр.'],['Проверить и объяснить','Проверим на отложенных точках и опишем, где модель ошибается.']],artifacts:['Файл с кодом маленькой модели','История ошибки и результаты отдельной проверки','Свой вывод о влиянии одного изменения'],limit:'Это учебные искусственные данные. Результат не показывает качество на реальных фотографиях или текстах.',readiness:'Новый стартовый пример: успешно выполнен в CI. Нужны Python и NumPy; данные создаются в коде, GPU и ключи не требуются.',path:'ML/reproducible_mlp_xor_numpy.ipynb'},
      {id:'photo',icon:'hand',title:'Различать жесты на фото',tag:'Фото · после первой модели',sample:'Фотография → камень, ножницы или бумага',model:'CNN · Conv2D',level:'После основ Python и первой классификации',inputTitle:'Фото трёх жестов',inputDetail:'Берём размеченные изображения из учебного набора Rock Paper Scissors.',modelDetail:'Свёрточная сеть учится выделять зрительные признаки изображения и выбирать один из трёх классов.',outputTitle:'Название жеста',outputDetail:'Классифицируем отдельное фото и смотрим удачные ответы и ошибки.',steps:[['Разобрать три класса','Посмотрим изображения и проверим, одинаково ли мы понимаем подписи.'],['Подготовить фотографии','Приведём размеры к одному виду и выделим независимые обучающие, проверочные и тестовые примеры.'],['Обучить CNN','Обучим сеть на примерах и проверим, помогают ли небольшие изменения изображений.'],['Разобрать ошибки','Проверим незнакомые фотографии, сохраним примеры и выводы.']],artifacts:['Файл с кодом классификатора фото','Галерея верных и ошибочных ответов','Описание данных, модели и проверки'],limit:'Три учебных класса. Это не готовая игра с веб-камерой и не распознаватель любых жестов.',readiness:'Архивный пример для разбора: перед уроками обновим окружение, проверим загрузку данных и исправим разделение выборок. Повторный запуск пока не подтверждён.',path:'CV/Сафонов_"rock_paper_scissors_cnn_ipynb".ipynb'},
      {id:'text',icon:'message-circle',title:'Определять настроение отзыва',tag:'Тексты · после первой модели',sample:'Отзыв → положительный или отрицательный',model:'Embedding + LSTM',level:'После Python, массивов и основ классификации',inputTitle:'Отзывы о фильмах',inputDetail:'Размеченные англоязычные отзывы IMDb, а не произвольная русская переписка.',modelDetail:'Сначала превращаем слова в числовые представления, затем LSTM обрабатывает их последовательность.',outputTitle:'Категория отзыва',outputDetail:'Предсказываем положительную или отрицательную оценку и проверяем ошибки.',steps:[['Понять задачу','Прочитаем примеры отзывов и посмотрим, как им назначены категории.'],['Подготовить тексты','Разделим данные, соберём словарь на обучающей части и приведём длины к общему формату.'],['Обучить модель','Обучим небольшую сеть и сравним её с простым базовым вариантом.'],['Проверить отдельные отзывы','Посмотрим финальный тест, разберём неверные ответы и оформим результат.']],artifacts:['Файл с кодом классификатора отзывов','Примеры текстов, на которых сеть ошибается','Сравнение с простым базовым решением'],limit:'Модель различает две категории изученной базы; понимание любого текста и любого языка не обещаем.',readiness:'Архивный пример для разбора: нужно проверить совместимость TensorFlow/Keras и загрузку IMDb. Исторические проценты точности повторно не подтверждены.',path:'NLP/NLP_Анализ_тональности_Решение_через_Embedding_+_LSTM(accuracy_0_86).ipynb'},
      {id:'objects',icon:'scan',title:'Находить предметы на фото',tag:'Фото · готовая нейросеть',sample:'Фотография → рамки и названия объектов',model:'SSDLite MobileNetV2',level:'Применение готовой сети после работы с изображениями',inputTitle:'Фотография',inputDetail:'Берём разрешённые изображения и классы, которые поддерживает готовая модель.',modelDetail:'Подключаем уже обученный детектор. В этом примере не обучаем собственную сеть с нуля.',outputTitle:'Рамки и названия',outputDetail:'Модель показывает расположение найденных объектов и свои оценки.',steps:[['Выбрать фотографии','Подготовим изображения с правом использования и посмотрим доступные классы.'],['Подключить модель','Восстановим окружение, загрузим готовые веса и подписи классов.'],['Получить рамки','Запустим распознавание и посмотрим, как меняется результат при выборе порога.'],['Проверить находки','Разберём пропуски и ложные объекты, сохраним размеченные картинки.']],artifacts:['Файл с кодом применения детектора','Фотографии с рамками и подписями','Разбор пропущенных и ошибочных объектов'],limit:'Оценка модели не означает, что найденный объект определён верно. Проверяем результаты вручную.',readiness:'Архивный пример применения готовой модели: требуются восстановление вспомогательных модулей, фотографий и проверка совместимости старых весов.',path:'CV/Сафонов"objects_detection_ssdlite_mobilenet_v2_ipynb".ipynb'},
      {id:'audio',icon:'audio-lines',title:'Узнавать птицу по пению',tag:'Звук · после подготовки базы',sample:'Аудиозапись → один из изученных видов',model:'Звуковые признаки + Dense',level:'После основ классификации; сначала подготовим данные',inputTitle:'Записи пения',inputDetail:'Нужен доступный набор аудио с подписями видов. В репозитории этих записей нет.',modelDetail:'Выделяем звуковые признаки MFCC/chroma и передаём их в полносвязную сеть. В архиве также есть отдельный вариант Conv1D.',outputTitle:'Предполагаемый вид',outputDetail:'Выбираем один из видов обучающей базы и исследуем ошибки на новых записях.',steps:[['Найти и проверить данные','Подготовим разрешённые записи и подписи, послушаем примеры.'],['Выделить звуковые признаки','Разделим исходные записи до нарезки, затем получим фрагменты и числовые признаки.'],['Обучить базовую модель','Начнём с Dense по звуковым признакам, затем при необходимости сравним Conv1D.'],['Проверить новые записи','Разберём ошибки на отложенных записях и оформим выводы.']],artifacts:['Файл с кодом обработки звука','Примеры аудио и предполагаемых классов','Отчёт об ошибках на новых записях'],limit:'Распознаём виды конкретного набора. Универсальное определение всех птиц по любому шумному звуку не обещаем.',readiness:'Архив требует восстановления: аудиобаза, ZIP и CSV отсутствуют. Сначала подтвердим доступность данных, затем подготовим рабочее окружение.',path:'AudioNet/Сафонов"Аудио_Распознавание_птиц_по_пению_ipynb".ipynb'},
      {id:'tuning',icon:'sliders-horizontal',title:'Сравнивать настройки моделей',tag:'Следующий уровень',sample:'Несколько конфигураций → таблица экспериментов',model:'MLP + Keras Tuner',level:'После одного завершённого нейросетевого проекта',inputTitle:'Изображения одежды',inputDetail:'Один учебный набор Fashion-MNIST и несколько согласованных вариантов настроек.',modelDetail:'Полносвязная сеть и поиск RandomSearch: сравниваем число нейронов, активации и оптимизатор.',outputTitle:'Обоснованный выбор',outputDetail:'Сравним результат и время обучения, выберем конфигурацию до финального теста.',steps:[['Подготовить базовый эксперимент','Отделим итоговый тест и получим результат простой начальной модели.'],['Ограничить поиск','Зададим небольшой бюджет запусков и понятные варианты настроек.'],['Сравнить конфигурации','Сравним модели на проверочной части и запишем время и результаты.'],['Проверить выбранную модель','Один раз оценим выбранный вариант на финальном тесте и объясним компромиссы.']],artifacts:['Таблица проведённых экспериментов','Выбранная конфигурация и её исходники','Вывод о качестве и затратах обучения'],limit:'Больше запусков не гарантирует лучшую модель. Финальный тест не используем для выбора настроек.',readiness:'Продвинутый архивный пример: обновим Keras Tuner, исправим описание параметров и сократим исходный поиск. Повторный запуск пока не подтверждён.',path:'SeletNetAI/Оптимизация_гиперпараметров_нейросети_с_помощью_Keras_Tuner_"fashion_mnist_keras_tuner_ipynb".ipynb'}
    ];
    const byId=id=>root.querySelector('#'+id);
    const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const architecture={
      start:{summary:'Полносвязная сеть: каждый нейрон слоя получает числа от всех нейронов предыдущего слоя.',stages:[
        ['Вход','points','2 координаты','Два числа описывают положение точки. Это исходные признаки, которые получает сеть.'],
        ['Скрытый слой','layer','16 нейронов · tanh','Слой преобразует входные числа. Все 16 кружков здесь — нейроны одного слоя, сетка нужна только для размещения. Нелинейная функция tanh помогает выучить более сложное правило, чем одна прямая.'],
        ['Ответ','single','1 выход · sigmoid','Один выход даёт вероятность класса 1. По порогу 0,5 различаем два класса — это не сеть с одним классом.']
      ]},
      photo:{summary:'CNN сохраняет пространственную структуру картинки: ищет локальные признаки, затем собирает из них ответ.',stages:[
        ['Фотография','pixels','Пиксели изображения','Сеть получает изображение жеста. В отличие от списка чисел, соседство пикселей здесь важно.'],
        ['Свёртки + Pool','conv','64 → 64 → 128 → 128','Четыре блока Conv2D с объединением MaxPool выделяют признаки. Числа 64 и 128 — количество фильтров, а не размер картинки.'],
        ['Классификатор','layer','Flatten → Dense 512','Признаки превращаются в список, а полносвязный слой собирает их для выбора жеста. Здесь показана часть нейронов одного слоя из 512.'],
        ['Ответ','triple','Softmax · 3 класса','Получаем три оценки: камень, ножницы или бумага. Выбираем класс с наибольшей оценкой. Рамки вокруг объектов эта модель не рисует.']
      ]},
      text:{summary:'LSTM обрабатывает последовательность: один и тот же слой читает слова по шагам и передаёт своё состояние дальше.',stages:[
        ['Текст','tokens','Индексы слов','Сначала текст разбивается на токены. В исходном примере используется последовательность до 200 индексов слов.'],
        ['Embedding','embedding','8 чисел на слово','Каждому индексу сопоставляется обучаемый вектор из восьми чисел. Это представление слова для модели.'],
        ['LSTM','lstm','32 элемента · память h/c','Здесь нарисованы разные шаги одного слоя с общими весами, а не несколько слоёв. Между шагами передаются скрытое состояние h и состояние памяти c.'],
        ['Ответ','single','Dense 1 · sigmoid','После чтения последовательности итоговое состояние идёт в один выход: положительный или отрицательный англоязычный отзыв. Это классификатор, не генератор текста.']
      ]},
      objects:{summary:'Готовый детектор одновременно определяет класс объекта и его расположение. Мы подключаем уже обученную сеть.',stages:[
        ['Фотография','pixels','Фото на входе','Берём фотографию с правом использования и подаём её готовой модели. Классы ограничены теми, которые сеть уже изучила.'],
        ['Признаки','pyramid','MobileNetV2','Базовая свёрточная сеть извлекает признаки изображения. Схема показывает её роль, а не все внутренние блоки MobileNetV2.'],
        ['Детектор','detector','SSDLite · классы и рамки','Детектор использует признаки для оценки классов и координат рамок. Это отличается от выбора одного класса для всей фотографии.'],
        ['Ответ','boxes','Рамки и классы','На изображении появляются рамки, названия и оценки уверенности. Эти оценки не являются проверенной точностью: пропуски и ложные находки разбираем отдельно.']
      ]},
      audio:{summary:'В этом примере звук сначала переводится в признаки. Две ветки признаков объединяются перед общей полносвязной сетью.',stages:[
        ['Звук','wave','Фрагмент аудиозаписи','На вход подготовке данных приходит запись пения. Сама Dense-сеть из этого примера не получает сырую звуковую волну.'],
        ['Две ветки','features','Chroma и MFCC','Вычисляем Chroma и MFCC. Каждая ветка проходит нормализацию и превращение в список, затем списки объединяются.'],
        ['Общая сеть','merged','Dense 256 → Dense 128','Полносвязные слои стоят после объединения признаков. Это одна общая сеть, а не отдельный Dense 256 для каждой ветки.'],
        ['Ответ','many','Softmax · 88 классов','В исходном примере выход содержит 88 оценок видов. Это виды конкретной базы, а не все птицы мира.']
      ]},
      tuning:{summary:'Подбор настроек — процесс вокруг нейросети. Архитектура остаётся Dense/MLP, а мы сравниваем несколько её конфигураций.',extra:'Предлагаемый порядок: выбор на проверочной части, затем отдельный финальный тест.',stages:[
        ['Варианты','variants','Несколько Dense-сетей','Задаём ограниченный набор конфигураций: число нейронов, активации и оптимизатор. Три рисунка — условные варианты, не проведённые эксперименты.'],
        ['Сравнение','compare','RandomSearch · validation','Кандидаты сравниваются на проверочной части данных. Набор окончательного теста в поиске не участвует.'],
        ['Выбор','choice','Одна конфигурация','Выбираем вариант по заранее определённому правилу. На схеме нет выдуманных процентов и подтверждённого победителя.'],
        ['Финальный тест','test','Отдельные данные','Только после выбора один раз проверяем итоговую модель на отложенном test и объясняем качество и ограничения.']
      ]}
    };
    const svgLine=(x1,y1,x2,y2,opacity=1)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="currentColor" stroke-width="1.3" opacity="'+opacity+'"/>';
    const svgRect=(x,y,w,h,fill='none',radius=3)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+radius+'" fill="'+fill+'" stroke="currentColor" stroke-width="1.3"/>';
    const svgCircle=(x,y,r,filled=false)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+(filled?'currentColor':'var(--nn-surface)')+'" stroke="currentColor" stroke-width="1.3"/>';
    function denseGlyph(counts=[2,4,1],startX=12,spread=96){
      const columns=counts.map((count,index)=>Array.from({length:count},(_,j)=>[startX+index*spread/(counts.length-1),count===1?35:10+j*50/(count-1)]));
      let parts='';columns.slice(0,-1).forEach((column,index)=>column.forEach(a=>columns[index+1].forEach(b=>{parts+=svgLine(a[0]+4,a[1],b[0]-4,b[1],.35);})));columns.forEach((column,index)=>column.forEach(point=>{parts+=svgCircle(point[0],point[1],index===columns.length-1?6:4,index===columns.length-1);}));return parts;
    }
    function pixelGlyph(){let s='';for(let row=0;row<5;row++)for(let col=0;col<5;col++){const on=((row*3+col*2)%5<2);s+='<rect x="'+(27+col*12)+'" y="'+(5+row*12)+'" width="10" height="10" rx="1" fill="'+(on?'currentColor':'var(--nn-soft)')+'" opacity="'+(on?.65:1)+'"/>';}return s+svgRect(37,16,25,25,'none',2);}
    function architectureGlyph(kind){
      if(kind==='dense')return denseGlyph();
      if(kind==='layer'){let s=svgLine(4,20,24,35,.5)+svgLine(4,50,24,35,.5)+svgLine(24,35,32,35,.5)+svgLine(89,35,116,35,.65);for(let col=0;col<4;col++)for(let row=0;row<4;row++)s+=svgCircle(39+col*14,11+row*16,3.5);return s;}
      if(kind==='points'){let s=svgLine(10,35,110,35,.3)+svgLine(60,5,60,65,.3);[[23,18,0],[38,24,0],[80,52,0],[93,43,0],[28,48,1],[41,57,1],[75,15,1],[96,24,1]].forEach(p=>{s+=svgCircle(p[0],p[1],3.6,!!p[2]);});return s;}
      if(kind==='pixels')return pixelGlyph();
      if(kind==='conv'){let s='';[27,23,19,15].forEach((size,index)=>{const x=3+index*29;for(let depth=2;depth>=0;depth--)s+=svgRect(x+depth*2,31-size/2-depth*2,size,size,depth===0?'var(--nn-soft)':'var(--nn-surface)',2);if(index<3)s+=svgLine(x+size+4,35,x+29,35,.5);});return s;}
      if(kind==='single')return svgLine(8,20,44,35,.45)+svgLine(8,50,44,35,.45)+svgCircle(58,35,12,true)+svgLine(72,35,112,35,.7);
      if(kind==='triple'||kind==='many'){const count=kind==='triple'?3:6;let s=svgCircle(18,35,6);for(let i=0;i<count;i++){const y=count===3?13+i*22:8+i*10;s+=svgLine(25,35,64,y,.4)+svgRect(67,y-3,31,6,'var(--nn-soft)',2);}return s;}
      if(kind==='tokens'){let s='';[0,1,2].forEach(i=>{s+=svgRect(5+i*39,20,33,29,'var(--nn-soft)',4);for(let j=0;j<2;j++)s+=svgLine(10+i*39,30+j*8,29+i*39,30+j*8,.7);if(i<2)s+=svgLine(38+i*39,35,44+i*39,35);});return s;}
      if(kind==='embedding'){let s='';for(let i=0;i<3;i++)for(let j=0;j<8;j++)s+='<rect x="'+(17+i*31)+'" y="'+(3+j*8)+'" width="24" height="5" rx="1" fill="currentColor" opacity="'+(.18+((i+j)%4)*.2)+'"/>';return s;}
      if(kind==='lstm'){let s='';[5,46,87].forEach((x,i)=>{s+=svgRect(x,23,28,27,'var(--nn-soft)',5)+svgCircle(x+14,61,3)+svgLine(x+14,57,x+14,50,.5);if(i<2)s+=svgLine(x+28,31,x+41,31)+svgLine(x+28,42,x+41,42,.6);});s+='<path d="M19 18V9H101V18" fill="none" stroke="currentColor" stroke-width="1.1" opacity=".45"/>';return s;}
      if(kind==='pyramid'){let s='';[76,58,40].forEach((w,i)=>{s+=svgRect((120-w)/2,9+i*19,w,13,'var(--nn-soft)',2);if(i<2)s+=svgLine(60,22+i*19,60,28+i*19,.6);});return s;}
      if(kind==='detector'){return svgRect(5,22,26,26,'var(--nn-soft)',4)+svgLine(31,35,52,35)+svgLine(52,35,72,17)+svgLine(52,35,72,53)+svgRect(73,6,39,22,'var(--nn-soft)',4)+svgRect(73,42,39,22,'var(--nn-soft)',4)+svgCircle(86,17,3)+svgCircle(99,17,3)+svgRect(84,48,16,9,'none',1);}
      if(kind==='boxes'){return svgRect(5,5,110,60,'var(--nn-soft)',4)+svgRect(18,16,27,40,'none',2)+svgRect(64,29,35,23,'none',2)+svgLine(18,11,36,11)+svgLine(64,24,84,24);}
      if(kind==='wave'){let d='M3 35';for(let x=3;x<118;x+=3){const amp=8+16*Math.sin((x-3)*Math.PI/115);d+=' L'+x+' '+(35+amp*Math.sin(x*.55)).toFixed(2);}return '<path d="'+d+'" stroke="currentColor" stroke-width="1.5" fill="none"/>';}
      if(kind==='features'){let s='';[6,42].forEach((y,row)=>{for(let i=0;i<5;i++)for(let j=0;j<3;j++)s+='<rect x="'+(5+i*9)+'" y="'+(y+j*7)+'" width="7" height="5" rx="1" fill="currentColor" opacity="'+(.2+((i+j+row)%4)*.19)+'"/>';});return s+svgLine(53,17,82,35)+svgLine(53,53,82,35)+svgLine(82,35,112,35);}
      if(kind==='merged'){let s=svgLine(4,17,26,35)+svgLine(4,53,26,35)+svgLine(26,35,38,35);return s+'<g transform="translate(34 7) scale(.69 .8)">'+denseGlyph([3,3,2])+'</g>';}
      if(kind==='variants'){return [0,1,2].map(i=>'<g transform="translate('+(i*40)+' 17) scale(.3 .54)">'+denseGlyph([2,i+2,1])+'</g>').join('');}
      if(kind==='compare'){let s=svgRect(10,7,100,56,'none',3);for(let i=0;i<3;i++)s+=svgLine(10,21+i*14,110,21+i*14,.4);s+=svgLine(49,7,49,63,.4)+svgLine(79,7,79,63,.4);return s;}
      if(kind==='choice'){return '<path d="M9 9H111L77 37V57L44 64V37Z" fill="var(--nn-soft)" stroke="currentColor" stroke-width="1.3"/>'+svgLine(36,18,84,18,.4)+svgLine(46,26,74,26,.4);}
      if(kind==='test'){let s=svgRect(5,11,43,48,'var(--nn-soft)',4)+svgLine(63,5,63,65,.35);[[78,18],[96,18],[78,35],[96,35],[78,52],[96,52]].forEach(p=>{s+=svgCircle(p[0],p[1],3.5);});return s+svgLine(16,25,38,25,.6)+svgLine(16,35,38,35,.6)+svgLine(16,45,32,45,.6);}
      return '';
    }
    function miniArchitecture(id){
      const kinds={start:['points','layer','single'],photo:['pixels','conv','triple'],text:['tokens','lstm','single'],objects:['pixels','pyramid','boxes'],audio:['wave','features','merged'],tuning:['variants','compare','test']}[id];
      let shapes='';kinds.forEach((kind,index)=>{shapes+='<g transform="translate('+(4+index*96)+' 24) scale(.67 .9)">'+architectureGlyph(kind)+'</g>';if(index<kinds.length-1)shapes+=svgLine(86+index*96,57,99+index*96,57,.6)+'<path d="M'+(95+index*96)+' 53L'+(99+index*96)+' 57L'+(95+index*96)+' 61" fill="none" stroke="currentColor" stroke-width="1.3"/>';});
      return '<span class="nn-mini-arch" aria-hidden="true"><svg viewBox="0 0 280 112" xmlns="http://www.w3.org/2000/svg">'+shapes+'</svg></span>';
    }
    let activeArchitecture='start',architectureStep=0,lastArchitectureWidth=0;
    function drawArchitecture(){
      const host=byId('nn-arch-scene');
      const spec=architecture[activeArchitecture];
      const width=Math.max(240,Math.round(host.getBoundingClientRect().width||root.getBoundingClientRect().width-52||680));
      const horizontal=width>=630;
      const gap=horizontal?16:30;
      const nodeWidth=horizontal?(width-4-gap*(spec.stages.length-1))/spec.stages.length:Math.min(width-4,400);
      const nodeHeight=140;
      const height=horizontal?144:spec.stages.length*nodeHeight+(spec.stages.length-1)*gap+4;
      const boxes=spec.stages.map((stage,index)=>({stage,x:horizontal?2+index*(nodeWidth+gap):(width-nodeWidth)/2,y:horizontal?2:2+index*(nodeHeight+gap)}));
      let svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" role="img" aria-labelledby="nn-arch-svg-title"><title id="nn-arch-svg-title">'+escape(projects.find(p=>p.id===activeArchitecture).model)+': '+spec.stages.map(s=>escape(s[0]+' — '+s[2])).join('; ')+'</title>';
      boxes.slice(0,-1).forEach((box,index)=>{const next=boxes[index+1];if(horizontal){const x=box.x+nodeWidth+2,y=box.y+nodeHeight/2;svg+=svgLine(x,y,next.x-3,y,.65)+'<path d="M'+(next.x-8)+' '+(y-4)+'L'+(next.x-3)+' '+y+'L'+(next.x-8)+' '+(y+4)+'" fill="none" stroke="currentColor" stroke-width="1.5"/>';}else{const x=width/2,y=box.y+nodeHeight+3;svg+=svgLine(x,y,x,next.y-4,.65)+'<path d="M'+(x-4)+' '+(next.y-9)+'L'+x+' '+(next.y-4)+'L'+(x+4)+' '+(next.y-9)+'" fill="none" stroke="currentColor" stroke-width="1.5"/>';}});
      boxes.forEach((box,index)=>{const selected=index===architectureStep;
        svg+='<g data-arch-stage="'+index+'"><rect x="'+box.x+'" y="'+box.y+'" width="'+nodeWidth+'" height="'+nodeHeight+'" rx="13" fill="'+(selected?'var(--nn-soft)':'var(--nn-surface)')+'" stroke="'+(selected?'var(--nn-accent)':'var(--nn-line)')+'" stroke-width="'+(selected?1.3:1)+'"/>';
        const cx=box.x+nodeWidth/2;
        svg+='<text x="'+cx+'" y="'+(box.y+24)+'" text-anchor="middle" fill="var(--nn-text)" font-size="13" font-weight="500">'+escape(box.stage[0])+'</text>';
        svg+='<g transform="translate('+(cx-54)+' '+(box.y+34)+') scale(.9 .85)" style="color:var(--nn-accent)">'+architectureGlyph(box.stage[1])+'</g>';
        const label=box.stage[2];const lines=label.length>23?label.split(' · '):[label];
        if(lines.length===1&&label.length>26&&label.includes('→')){const pieces=label.split(' → ');lines.splice(0,1,pieces.slice(0,2).join(' → '),'→ '+pieces.slice(2).join(' → '));}
        lines.slice(0,2).forEach((line,j)=>{svg+='<text x="'+cx+'" y="'+(box.y+113+j*15)+'" text-anchor="middle" fill="var(--nn-muted)" font-size="12">'+escape(line)+'</text>';});
        svg+='</g>';
      });
      host.innerHTML=svg+'</svg>';
      byId('nn-arch-caption').textContent=(architectureStep+1)+'. '+spec.stages[architectureStep][3];
      byId('nn-arch-controls').querySelectorAll('[data-arch-step]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.archStep)===architectureStep)));
      lastArchitectureWidth=width;
    }
    function setArchitecture(id){
      activeArchitecture=id;architectureStep=0;
      const spec=architecture[id];byId('nn-arch-summary').textContent=spec.summary;
      byId('nn-arch-controls').innerHTML=spec.stages.map((stage,index)=>'<button class="cursor-interaction" type="button" data-arch-step="'+index+'" aria-pressed="'+(index===0)+'">'+(index+1)+' · '+escape(stage[0])+'</button>').join('');
      byId('nn-arch-note').textContent='Упрощённая схема: часть нейронов, связей и служебных слоёв не показана. Размеры блоков не означают объём вычислений. Это разбор устройства, не запуск нейросети.'+(spec.extra?' '+spec.extra:'');
      drawArchitecture();
    }
    byId('nn-arch-controls').addEventListener('click',event=>{const button=event.target.closest('[data-arch-step]');if(!button)return;architectureStep=Number(button.dataset.archStep);drawArchitecture();});
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{const width=Math.round(byId('nn-arch-scene').getBoundingClientRect().width);if(width>0&&width!==lastArchitectureWidth)drawArchitecture();}).observe(byId('nn-arch-scene'));

    const grid=byId('nn-choice-grid');
    grid.innerHTML=projects.map(p=>'<button class="nn-project" type="button" data-nn-project="'+p.id+'" aria-pressed="false" aria-controls="nn-selected-project"><span class="nn-project-top"><span>'+escape(p.tag)+'</span></span>'+miniArchitecture(p.id)+'<span class="nn-project-title">'+escape(p.title)+'</span><span class="nn-sample">'+escape(p.sample)+'</span><span class="nn-model-label">'+escape(p.model)+'</span><span class="nn-open-label">Модель и шаги ↓</span></button>').join('');
    function selectProject(id){
      const p=projects.find(item=>item.id===id);if(!p)return;
      grid.querySelectorAll('[data-nn-project]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.nnProject===id)));
      const fields={'nn-selected-title':p.title,'nn-selected-level':p.level,'nn-input-title':p.inputTitle,'nn-input-detail':p.inputDetail,'nn-model-title':p.model,'nn-model-detail':p.modelDetail,'nn-output-title':p.outputTitle,'nn-output-detail':p.outputDetail,'nn-limit':p.limit,'nn-readiness':p.readiness};
      Object.entries(fields).forEach(([key,value])=>{byId(key).textContent=value;});
      byId('nn-steps').innerHTML=p.steps.map(step=>'<li class="nn-step"><div><strong>'+escape(step[0])+'</strong><p>'+escape(step[1])+'</p></div></li>').join('');
      byId('nn-artifacts').innerHTML=p.artifacts.map(text=>'<li>'+escape(text)+'</li>').join('');
      byId('nn-source-link').href='https://github.com/safal207/students/blob/'+ref+'/'+p.path.split('/').map(encodeURIComponent).join('/');
      byId('nn-selection-status').textContent='Выбран проект: '+p.title+'. '+p.model+'.';
      byId('nn-selected-project').dataset.selectedProject=id;
      const course={start:'ml',photo:'ml-vision',objects:'ml-vision',text:'ml-text',audio:'ml-audio',tuning:'ml-tuning'}[id];
      const query=new URLSearchParams(location.search),startURL=new URL('./',location.href);
      startURL.searchParams.set('program',course);
      startURL.searchParams.set('level',['zero','basic','project'].includes(query.get('level'))?query.get('level'):'zero');
      startURL.searchParams.set('pace',['light','balanced','deep'].includes(query.get('pace'))?query.get('pace'):'balanced');
      startURL.hash='selected';
      document.querySelector('[data-nn-start]').href=startURL.href;
      setArchitecture(id);
    }
    grid.addEventListener('click',event=>{const button=event.target.closest('[data-nn-project]');if(!button||!grid.contains(button))return;selectProject(button.dataset.nnProject);byId('nn-selected-project').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});});
    const requestedTask=new URLSearchParams(location.search).get('task');
    selectProject(projects.some(p=>p.id===requestedTask)?requestedTask:'start');
  })();
