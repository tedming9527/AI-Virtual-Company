// Runs in the generated document. Each list owns its source selection.
export function initializeListFilters(normalizeQuery) {
  const search = document.getElementById('search');
  const lists = Array.from(document.querySelectorAll('[data-filter-list]'));
  const apply = () => {
    const terms = normalizeQuery(search.value).split(' ').filter(Boolean);
    for (const list of lists) {
      const origin = list.querySelector('[data-source-filter]')?.value || 'all';
      const rows = Array.from(list.querySelectorAll('tbody tr[data-origin]'));
      let visible = 0;
      for (const row of rows) {
        const matches = (origin === 'all' || row.dataset.origin === origin) && terms.every(term => normalizeQuery(row.textContent + ' ' + row.dataset.search).includes(term));
        row.hidden = !matches;
        if (matches) visible++;
      }
      const empty = list.querySelector('[data-filter-empty]');
      if (empty) {
        empty.hidden = visible > 0 || rows.length === 0;
        empty.textContent = terms.length ? '当前来源下没有匹配搜索的条目。' : '当前来源下暂无条目，可切换为“全部”查看。';
      }
      const count = list.querySelector('[data-filter-count]');
      if (count) count.textContent = `显示 ${visible} / ${rows.length} 条`;
    }
    if (terms.length) document.querySelectorAll('.area').forEach(area => {
      area.open = Array.from(area.querySelectorAll('tr[data-origin]')).some(row => !row.hidden);
    });
  };
  search.addEventListener('input', apply);
  lists.forEach(list => list.querySelector('[data-source-filter]')?.addEventListener('change', apply));
  apply();
}
