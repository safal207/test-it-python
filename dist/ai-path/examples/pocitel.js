(() => {
  'use strict';
  const cards = [...document.querySelectorAll('.pairing')];
  const selected = new Set();
  const clear = document.getElementById('clear-selection');
  const list = document.getElementById('selection-list');
  function render() {
    const chosen = cards.filter(card => selected.has(card.dataset.id));
    list.replaceChildren(...chosen.map(card => {
      const item = document.createElement('li');
      item.textContent = `${card.dataset.name} · ${card.dataset.price} TL`;
      return item;
    }));
    list.hidden = chosen.length === 0;
    document.getElementById('selection-empty').hidden = chosen.length > 0;
    document.getElementById('selection-total').textContent = `${chosen.reduce((sum, card) => sum + Number(card.dataset.price), 0)} TL`;
    document.getElementById('selection-saving').textContent = `Выгода: ${chosen.reduce((sum, card) => sum + Number(card.dataset.base) - Number(card.dataset.price), 0)} TL`;
    clear.disabled = chosen.length === 0;
    cards.forEach(card => {
      const active = selected.has(card.dataset.id);
      const button = card.querySelector('[data-pairing]');
      card.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', `${active ? 'Убрать' : 'Добавить'}: ${card.dataset.name}`);
      button.querySelector('span').textContent = active ? 'Убрать из выбора' : 'Добавить к выбору';
      button.querySelector('b').textContent = active ? '−' : '+';
    });
  }
  cards.forEach(card => card.querySelector('[data-pairing]').addEventListener('click', () => {
    const id = card.dataset.id;
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    render();
  }));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; });
  }));
  clear.addEventListener('click', () => {
    selected.clear();
    render();
    // The clear action becomes disabled; move focus to a visible, usable choice.
    cards.find(card => !card.hidden)?.querySelector('[data-pairing]').focus();
  });
})();
