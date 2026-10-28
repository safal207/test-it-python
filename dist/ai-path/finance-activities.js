/* Original, browser-local learning tasks; numbers are fictional lesson settings. */
(() => {
  'use strict';
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const fmt = n => new Intl.NumberFormat('ru-RU').format(n);
  const basics = {
    '6-9': { budget:30, items:[['Карандаш',10,'✎'],['Наклейки',25,'✦']], name:'Лёва', signal:'В игре незнакомец обещает подарок: «Пришли код с телефона родителя прямо сейчас!»', signals:['Просит секретный код','Торопит с ответом','Использует красивую картинку'], offers:[['Один карандаш',['Цена: 12'],12],['Набор из трёх',['Цена набора: 30'],30]] },
    '10-13': { budget:500, items:[['Проезд на неделю',200,'↗'],['Игровой набор',450,'✦']], name:'Саша', signal:'«Ты выиграл приз! Сначала оплати выдачу по этой ссылке. Предложение действует пять минут».', signals:['Просит заплатить за приз','Не даёт времени проверить','Сообщение без опечаток'], offers:[['Магазин А',['Товар: 800','Скидка: 25%','Доставка: 100'],700],['Магазин Б',['Товар: 650','Доставка: 0'],650]] },
    '14-17': { budget:6000, items:[['Согласованный проезд',2400,'↗'],['Новые наушники',4500,'♫']], name:'Даня', signal:'«Гарантируем 40% за месяц без риска. Переведи деньги сегодня и никому не рассказывай».', signals:['Гарантирует огромный доход без риска','Торопит и просит скрыть перевод','У сообщения аккуратное оформление'], offers:[['Оплата сразу',['Цена: 10 000'],10000],['Четыре платежа',['Платёж: 2 700','Количество: 4','Комиссия: 200'],11000]] }
  };
  const hints = {
    choice:['Сначала найди покупку, которая закрывает условие задачи. Остальное можно отложить.','Сложи цены выбранного. После покупки должно хватить денег на обязательное.'],
    budget:['Сложи четыре части плана и сравни с поступлениями.','Если назначено лишнее, измени радости. Сохрани нужное, взнос на цель и запас по условию.'],
    goal:['Вычти уже накопленное из цены цели.','Сравни оставшуюся сумму со взносами. Если в последнем периоде не хватает даже одной монеты, нужен ещё один.'],
    shopping:['Сравни полные суммы, включая доставку и комиссии.','Скидка уменьшает цену товара, но не отменяет отдельные платежи. Большая упаковка тоже требует оплаты целиком.'],
    safety:['Ищи, какие действия от тебя требуют, а не насколько красиво написано сообщение.','Секретные данные, срочность, предварительная оплата или обещание огромной прибыли — повод остановиться.'],
    project:['Проверь бюджет и прогноз накоплений в двух тренажёрах ниже.','Изменение проверенных чисел снимает отметку практики: пересчитай и проверь план ещё раз.']
  };
  const quizHints = {
    '6-9': { project:['Если условия изменились, план можно пересмотреть.','Подумай, какое действие поможет понять причину ошибки и попросить поддержку.'] },
    '10-13': { choice:['Часть денег уже нужна на согласованный проезд.','Вычти обязательную сумму из имеющихся денег. Остаток можно распределять дальше.'], shopping:['Сначала найди цену товара после скидки.','25% — четверть цены. Вычти скидку, затем прибавь доставку.'], project:['Посчитай, сколько раз повторится платёж.','Умножь сумму одной оплаты на число недель из вопроса.'] },
    '14-17': { choice:['Раздели уже полученные и только ожидаемые деньги.','Доступная сейчас сумма опирается на полученные поступления. Обещанный доход учитывают отдельно.'], budget:['Сравни доступные поступления с прежними назначениями.','Изменившийся ресурс требует пересмотра приоритетов и срока цели. Резерв нельзя считать новым регулярным доходом.'], goal:['10% — это десятая часть суммы.','Найди прирост: исходная цена × 0,10. Затем прибавь его к исходной цене.'], shopping:['Нужны все платежи, а не размер одного.','Умножь один платёж на количество, затем прибавь обязательную комиссию.'], project:['Посмотри, какие условия приняты в расчёте.','Если цена или взносы меняются, прежний срок нужно проверить заново.'] }
  };
  function describe(age, id, group) {
    const b=basics[age], g=group.goal;
    const stories={
      choice:`У ${b.name === 'Лёва' ? 'Лёвы' : b.name === 'Саша' ? 'Саши' : 'Дани'} ${fmt(b.budget)} учебных монет. Нужен ${b.items[0][0].toLowerCase()}, а ещё хочется ${b.items[1][0].toLowerCase()}. Что выбрать сейчас?`,
      budget:`На ${group.period === 'неделя' ? 'неделю' : 'месяц'} есть ${fmt(group.budget.income)} монет. В план попали лишние траты. Сможешь найти нехватку и исправить её?`,
      goal:`Цель стоит ${fmt(g.target)}. Уже собрано ${fmt(g.saved)}. ${group.period === 'неделя' ? 'Каждую неделю' : 'Каждый месяц'} можно добавлять ${fmt(g.contribution)}. Какой минимальный срок нужен?`,
      shopping:age==='6-9'?'Нужен один карандаш. Есть 20 монет. В магазине можно купить один карандаш или целый набор. Сравни варианты.':age==='10-13'?'Одинаковый товар предлагают два магазина. В одном большая скидка, в другом бесплатная доставка. Где меньше итоговая сумма?':'Одна вещь доступна с оплатой сразу или четырьмя платежами и комиссией. Какой вариант требует меньшей общей суммы?',
      safety:b.signal,
      project:'Собери свой учебный план: бюджет без нехватки, понятный срок цели и правило безопасности. Ты можешь объяснить каждое решение?'
    };
    return { story:stories[id], hints:hints[id], quizHints:quizHints[age]?.[id] || hints[id], target:({choice:'Выбери нужную покупку и проверь остаток.',budget:'Исправь план, сохранив условия задания.',goal:'Выбери минимальное число периодов.',shopping:'Выбери меньшую полную стоимость.',safety:'Отметь два тревожных сигнала.',project:'Проверь два расчёта и объясни свой план.'})[id] };
  }
  function mount(host, age, id, group, getPlan) {
    host.replaceChildren();
    const spec=describe(age,id,group), base=basics[age];
    const title=make('h3',spec.target); host.append(title);
    const arena=make('div',undefined,'activity-arena'); host.append(arena);
    const controls=make('div',undefined,'activity-actions');
    const check=make('button','Проверить действие','primary'); check.type='button'; check.id='activity-check';
    const hint=make('button','Подсказка','quiet'); hint.type='button'; hint.id='activity-hint';
    const hintText=make('p',undefined,'activity-hint-text'); hintText.id='activity-hint-text'; hintText.setAttribute('role','status');
    const result=make('p',undefined,'feedback'); result.id='activity-feedback'; result.setAttribute('role','status');
    let hintLevel=0, evaluate=()=>({ok:false,text:'Попробуй выполнить действие.'}), cleanup=()=>{};
    const clear=()=>{ result.textContent=''; result.dataset.kind=''; };
    const showHint=()=>{ hintText.textContent=spec.hints[Math.min(hintLevel,1)]; hintLevel++; hint.textContent=hintLevel<2?'Ещё подсказка':'Обе подсказки открыты'; hint.disabled=hintLevel>=2; };
    hint.addEventListener('click',showHint);
    if(id==='choice') {
      const selected=new Set();
      const cards=make('div',undefined,'activity-options'); const live=make('p',undefined,'activity-live'); live.setAttribute('aria-live','polite');
      const update=()=>{ const spent=[...selected].reduce((sum,i)=>sum+base.items[i][1],0); live.textContent=`Было ${fmt(base.budget)} · Выбрано ${fmt(spent)} · Остаток ${fmt(base.budget-spent)}`; clear(); };
      base.items.forEach(([name,price,glyph],i)=>{ const button=make('button',undefined,'purchase-card'); button.type='button'; button.dataset.purchase=String(i); button.setAttribute('aria-pressed','false'); const icon=make('span',glyph,'purchase-icon'); icon.setAttribute('aria-hidden','true'); button.append(icon,make('strong',name),make('span',`${fmt(price)} монет`)); button.addEventListener('click',()=>{ selected.has(i)?selected.delete(i):selected.add(i); button.setAttribute('aria-pressed',String(selected.has(i))); update(); }); cards.append(button); });
      arena.append(make('p',`В кошельке: ${fmt(base.budget)} монет.`, 'wallet'),cards,live); update();
      evaluate=()=>{ const spent=[...selected].reduce((sum,i)=>sum+base.items[i][1],0); return {ok:selected.has(0)&&spent<=base.budget,text:spent>base.budget?'Покупки не помещаются в кошелёк. Убери одну и проверь снова.':!selected.has(0)?'Сначала выбери покупку, которая нужна по условию.':`Получилось! Нужная покупка выбрана, осталось ${fmt(base.budget-spent)} монет. Желание можно включить в следующий план.`}; };
    } else if(id==='budget') {
      const b=group.budget, values={needs:b.needs,fun:b.fun+b.income/10,save:b.save,reserve:b.reserve};
      arena.append(make('p',`Есть ${fmt(b.income)}. Нужное ≥ ${fmt(b.minNeeds)}, цель ≥ ${fmt(b.minSave)}, запас ≥ ${fmt(b.minReserve)}.`, 'activity-condition'));
      const jars=make('div',undefined,'money-jars'); const live=make('p',undefined,'activity-live'); live.setAttribute('aria-live','polite');
      const update=()=>{ const sum=Object.values(values).reduce((a,b)=>a+b,0); live.textContent=`Назначено ${fmt(sum)} · ${sum>b.income?'Не хватает':'Свободно'} ${fmt(Math.abs(b.income-sum))}`; clear(); };
      for(const [name,label] of [['needs','Нужное'],['fun','Радости'],['save','На цель'],['reserve','Запас']]) { const jar=make('div',undefined,'money-jar'); const input=document.createElement('input'); input.type='number'; input.min='0'; input.max=String(b.income); input.step='1'; input.value=String(values[name]); input.id='activity-'+name; input.inputMode='numeric'; const lab=make('label',label); lab.htmlFor=input.id; const fill=make('div',undefined,'jar-fill '+name); fill.setAttribute('aria-hidden','true'); input.addEventListener('input',()=>{ const n=Number(input.value); values[name]=input.value!==''&&Number.isInteger(n)&&n>=0&&n<=b.income?n:NaN; if(Object.values(values).every(Number.isFinite))update(); else {live.textContent='Заполни все четыре части целыми неотрицательными числами.';clear();} }); jar.append(fill,lab,input); jars.append(jar); }
      arena.append(jars,live); update();
      evaluate=()=>{ const valid=Object.values(values).every(Number.isFinite); const sum=Object.values(values).reduce((a,b)=>a+b,0); const ok=valid&&sum<=b.income&&values.needs>=b.minNeeds&&values.save>=b.minSave&&values.reserve>=b.minReserve; return {ok,text:ok?`План помещается в бюджет. Свободно ${fmt(b.income-sum)}. Назначения и запас сохранены.`:!valid?'Сначала проверь числа в четырёх коробках.':sum>b.income?'В плане всё ещё есть нехватка. Пересмотри радости или другие назначения с учётом условий.':'Сумма подходит, но проверь минимумы для нужного, цели и запаса.'}; };
    } else if(id==='goal') {
      const g=group.goal, remaining=g.target-g.saved, needed=Math.ceil(remaining/g.contribution);
      arena.append(make('p',`Цель ${fmt(g.target)} · Есть ${fmt(g.saved)} · Взнос ${fmt(g.contribution)} за ${group.period === 'неделя'?'неделю':'месяц'}`, 'activity-condition'));
      const label=make('label','Число периодов'); label.htmlFor='activity-periods'; const range=document.createElement('input'); range.id='activity-periods'; range.type='range'; range.min='0'; range.max='12'; range.step='1'; range.value='0';
      const ticks=make('div',undefined,'period-pills'); ticks.setAttribute('aria-hidden','true'); for(let i=1;i<=12;i++)ticks.append(make('span',String(i)));
      const live=make('p',undefined,'activity-live'); live.setAttribute('aria-live','polite'); const update=()=>{ const n=Number(range.value); live.textContent=`Периодов: ${n}. Будет собрано ${fmt(g.saved+n*g.contribution)} из ${fmt(g.target)}.`; [...ticks.children].forEach((tick,i)=>tick.classList.toggle('filled',i<n)); clear(); };
      range.addEventListener('input',update); arena.append(label,range,ticks,live); update();
      evaluate=()=>{ const n=Number(range.value); return {ok:n===needed,text:n<needed?'За это время цель ещё не достигнута. Добавь период и сравни сумму.':n>needed?'Цель уже достигнута, но можно раньше. Найди минимальное число периодов.':`Да! ${fmt(g.saved)} + ${needed} × ${fmt(g.contribution)} = ${fmt(g.saved+needed*g.contribution)}. Это первый подходящий период.`}; };
    } else if(id==='shopping') {
      let selected=-1; const options=make('div',undefined,'activity-options');
      base.offers.forEach(([name,parts],i)=>{ const button=make('button',undefined,'offer-card'); button.type='button'; button.dataset.offer=String(i); button.setAttribute('aria-pressed','false'); button.append(make('strong',name)); parts.forEach(part=>button.append(make('span',part))); button.addEventListener('click',()=>{selected=i; [...options.children].forEach((b,n)=>b.setAttribute('aria-pressed',String(n===i)));clear();}); options.append(button); });
      arena.append(options,make('p',age==='6-9'?'Нужен один карандаш, в кошельке 20.':'Сравниваем одинаковый товар только по полной сумме оплаты.', 'hint'));
      const best=base.offers[0][2]<=base.offers[1][2]?0:1;
      evaluate=()=>({ok:selected===best,text:selected<0?'Сначала выбери один из вариантов.':selected!==best?'Здесь итоговая сумма больше. Пересчитай все части стоимости.':`Верно: ${base.offers[best][0]} — ${fmt(base.offers[best][2])}. Другой вариант — ${fmt(base.offers[1-best][2])}.`});
    } else if(id==='safety') {
      arena.append(make('blockquote',base.signal)); const signals=make('div',undefined,'signal-list');
      base.signals.forEach((text,i)=>{const label=make('label',undefined,'signal-choice');const input=document.createElement('input');input.type='checkbox';input.value=String(i);input.name='activity-signal'; input.addEventListener('change',clear);label.append(input,make('span',text));signals.append(label);});arena.append(signals);
      evaluate=()=>{const picked=[...signals.querySelectorAll('input:checked')].map(n=>Number(n.value));const ok=picked.length===2&&picked.includes(0)&&picked.includes(1);return {ok,text:ok?'Верно. Опасны требования и давление. Остановись, проверь просьбу независимо и обсуди со взрослым.':'Выбери два признака, связанные с тем, что от тебя требуют. Аккуратный вид сообщения сам по себе ничего не доказывает.'};};
    } else {
      const list=make('ul',undefined,'plan-checklist'); arena.append(list,make('a','Открыть тренажёры ↓','quiet'));arena.lastChild.href='#practice';
      const refresh=()=>{const plan=getPlan();list.replaceChildren(make('li',`${plan.budgetDone?'✓':'○'} Бюджет ${plan.budgetDone?'проверен':'нужно проверить'}`),make('li',`${plan.goalDone?'✓':'○'} Прогноз накоплений ${plan.goalDone?'проверен':'нужно проверить'}`));}; refresh();
      window.addEventListener('finance-plan-updated',refresh);cleanup=()=>window.removeEventListener('finance-plan-updated',refresh);
      evaluate=()=>{refresh();const plan=getPlan();return {ok:plan.budgetDone&&plan.goalDone,text:plan.budgetDone&&plan.goalDone?'Оба расчёта проверены. Теперь объясни свой выбор и пройди итоговую проверку урока.':'Открой тренажёры ниже: проверь бюджет и свой прогноз. Отметки появятся после успешных проверок.'};};
    }
    check.addEventListener('click',()=>{const answer=evaluate();result.textContent=answer.text;result.dataset.kind=answer.ok?'success':'error';if(!answer.ok&&hintLevel===0)showHint();});
    controls.append(check,hint);host.append(controls,hintText,result);
    return cleanup;
  }
  window.AIPathFinanceActivities={describe,mount};
})();
