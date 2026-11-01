(() => {
  'use strict';
  const cards = [...document.querySelectorAll('.pairing')];
  const selected = new Map();
  const $ = id => document.getElementById(id);
  const clear = $('clear-selection');
  const list = $('selection-list');
  const maxQuantity = 12;
  const total = () => cards.reduce((sum, card) => sum + Number(card.dataset.price) * (selected.get(card.dataset.id) || 0), 0);
  const saving = () => cards.reduce((sum, card) => sum + (Number(card.dataset.base) - Number(card.dataset.price)) * (selected.get(card.dataset.id) || 0), 0);
  function renderBudget() {
    const budgetInput = $('selection-budget');
    const budget = budgetInput.valueAsNumber;
    const status = $('budget-status');
    status.classList.remove('over-budget');
    if (!budgetInput.validity.valid || !Number.isFinite(budget)) {
      status.textContent = 'Укажите бюджет от 0 до 100 000 TL.';
      return;
    }
    if (!selected.size) {
      status.textContent = 'Выберите завтрак, чтобы сравнить с бюджетом.';
      return;
    }
    const remainder = budget - total();
    status.classList.toggle('over-budget', remainder < 0);
    status.textContent = remainder >= 0 ? `В рамках бюджета · осталось ${remainder} TL` : `Выше бюджета на ${-remainder} TL · уменьшите количество или измените выбор.`;
  }
  function changeQuantity(id, delta, action) {
    const next = (selected.get(id) || 0) + delta;
    if (next > 0) selected.set(id, Math.min(maxQuantity, next)); else selected.delete(id);
    render();
    // Receipt controls are rebuilt; keep the keyboard at the same item.
    const target = list.querySelector(`[data-quantity-id="${id}"][data-action="${action}"]:not(:disabled)`)
      || list.querySelector(`[data-quantity-id="${id}"]:not(:disabled)`)
      || list.querySelector('button:not(:disabled)')
      || cards.find(card => !card.hidden)?.querySelector('[data-pairing]');
    target?.focus();
  }
  function render() {
    const chosen = cards.filter(card => selected.has(card.dataset.id));
    list.replaceChildren(...chosen.map(card => {
      const id = card.dataset.id;
      const quantity = selected.get(id);
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = card.dataset.name;
      const amount = document.createElement('span');
      amount.className = 'receipt-amount';
      amount.textContent = `${card.dataset.price} TL × ${quantity} = ${Number(card.dataset.price) * quantity} TL`;
      const controls = document.createElement('div');
      controls.className = 'quantity-controls';
      for (const [action, delta, label, symbol] of [['less', -1, 'Уменьшить количество', '−'], ['more', 1, 'Увеличить количество', '+']]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.quantityId = id;
        button.dataset.action = action;
        button.textContent = symbol;
        button.setAttribute('aria-label', `${label}: ${card.dataset.name}`);
        button.disabled = action === 'more' && quantity >= maxQuantity;
        button.addEventListener('click', () => changeQuantity(id, delta, action));
        controls.append(button);
        if (action === 'less') {
          const count = document.createElement('span');
          count.textContent = `${quantity} шт.`;
          controls.append(count);
        }
      }
      item.append(title, amount, controls);
      return item;
    }));
    list.hidden = chosen.length === 0;
    $('selection-empty').hidden = chosen.length > 0;
    $('selection-total').textContent = `${total()} TL`;
    $('selection-saving').textContent = `Выгода: ${saving()} TL`;
    $('selection-count').textContent = `Сочетаний: ${[...selected.values()].reduce((sum, quantity) => sum + quantity, 0)}`;
    $('save-selection').disabled = clear.disabled = chosen.length === 0;
    $('selection-download').textContent = '';
    cards.forEach(card => {
      const active = selected.has(card.dataset.id);
      const button = card.querySelector('[data-pairing]');
      card.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
      const action = active ? 'Убрать из выбора' : 'Добавить к выбору';
      button.setAttribute('aria-label', `${action}: ${card.dataset.name}`);
      button.querySelector('span').textContent = action;
      button.querySelector('b').textContent = active ? '−' : '+';
    });
    renderBudget();
  }
  cards.forEach(card => card.querySelector('[data-pairing]').addEventListener('click', () => {
    const id = card.dataset.id;
    if (selected.has(id)) selected.delete(id); else selected.set(id, 1);
    render();
  }));
  function filterCards(button) {
    document.querySelectorAll('[data-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; });
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => filterCards(button)));
  $('selection-budget').addEventListener('input', () => { renderBudget(); $('selection-download').textContent = ''; });
  $('try-breakfast').addEventListener('click', () => {
    selected.clear(); selected.set('classic', 1); selected.set('sweet', 1);
    $('selection-budget').value = '900';
    filterCards(document.querySelector('[data-filter="all"]'));
    render();
    list.querySelector('button').focus();
  });
  $('save-selection').addEventListener('click', () => {
    if (!selected.size) return;
    const lines = ['POCITEL · МОЙ ЗАВТРАК', 'Учебный список AI PATH — заказ не отправлен.', '',
      ...cards.filter(card => selected.has(card.dataset.id)).map(card => `${card.dataset.name}: ${selected.get(card.dataset.id)} × ${card.dataset.price} TL = ${selected.get(card.dataset.id) * Number(card.dataset.price)} TL`),
      '', `Итого: ${total()} TL`, `Выгода по предоставленному меню: ${saving()} TL`, $('budget-status').textContent,
      '', 'Цены перенесены из предоставленного меню. Актуальные цены, состав и наличие уточняются в кафе.'];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'pocitel-breakfast.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('selection-download').textContent = 'Список подготовлен к скачиванию. Заказ не отправлен.';
  });
  clear.addEventListener('click', () => {
    selected.clear(); render();
    cards.find(card => !card.hidden)?.querySelector('[data-pairing]').focus();
  });
  render();
})();
