// Deterministic metadata search; declared aliases are not machine translation.
export function normalizeQuery(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[_\-‐‑–—/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
}
export function searchMetadata(meta = {}) {
  return Object.fromEntries(['aliases', 'keywords'].map(key => [key, Array.isArray(meta[key]) ? meta[key].filter(v => typeof v === 'string' && v.trim()) : []]));
}
export function matchAsset(asset, query) {
  const term = normalizeQuery(query);
  if (!term) return { score: 0, matches: [] };
  const terms = [...new Set(term.split(' '))];
  const fields = [['name', 100], ['displayName', 95], ['aliases', 80], ['keywords', 60], ['description', 30], ['source', 5], ['pathLabel', 1]];
  const matches = [];
  for (const [field, weight] of fields) {
    for (const value of [asset[field]].flat().filter(v => typeof v === 'string')) {
      const normalized = normalizeQuery(value);
      const matchedTerms = normalized.includes(term) ? [term] : terms.filter(t => normalized.includes(t));
      if (matchedTerms.length) matches.push({ field, value, terms: matchedTerms, kind: field === 'aliases' ? 'declared-alias' : 'literal', weight: weight + (normalized === term ? 100 : normalized.includes(term) ? 20 : 0) });
    }
  }
  // Every query token must have evidence; mixed Chinese/English may match different fields.
  if (!terms.every(t => matches.some(m => normalizeQuery(m.value).includes(t)))) return null;
  return { score: Math.max(...matches.map(m => m.weight)), matches: matches.map(({ weight, ...m }) => m) };
}
export function searchAssets(assets, query = '') {
  if (!normalizeQuery(query)) return assets;
  return assets.flatMap(asset => { const match = matchAsset(asset, query); return match ? [{ ...asset, ...match }] : []; })
    .sort((a, b) => b.score - a.score || String(a.id || a.name).localeCompare(String(b.id || b.name)));
}
