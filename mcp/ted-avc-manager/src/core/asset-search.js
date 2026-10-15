// Local lexical selection. Discovery, applicability and adoption remain separate.
export function normalizeQuery(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[_\-‐‑–—/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
}
export function searchMetadata(meta = {}) {
  return Object.fromEntries(['aliases','keywords','tags'].map(key=>[key,Array.isArray(meta[key])?meta[key].filter(v=>typeof v==='string'&&v.trim()):[]]));
}
const stop=new Set('the a an to for and with from this before after when is are of in on please help me want use how can could would should do does i my it just only not 不 不是 不要 无需 请 请问 帮我 我 要 想 如何 怎么 一下 这个 这些 的 了 和 与 在 将 把 让 能 是否 进行 使用'.split(' '));
const segmenter=new Intl.Segmenter('zh',{granularity:'word'});
export function queryTerms(query) {
  const positive=String(query).split(/(?:只想|只需要|而是|but\s+(?:only\s+)?(?:want|explain|need)\s+)/i).at(-1);
  const terms=[],text=normalizeQuery(positive);
  for(const item of segmenter.segment(text))if(item.isWordLike&&!stop.has(item.segment)) {
    const word=item.segment;
    if(/\p{Script=Han}/u.test(word)) {if(word.length>1){terms.push(word);if(word.length>2)for(let i=0;i<word.length-1;i++)terms.push(word.slice(i,i+2));}}
    else if(/[\p{L}\p{N}]/u.test(word))terms.push(word);
  }
  // ICU dictionaries sometimes split an unknown Chinese term into characters.
  // Keep bounded adjacent character evidence rather than dropping that query.
  for(const [run]of text.matchAll(/\p{Script=Han}{2,}/gu)){
    if(run.length<=12&&!stop.has(run))terms.push(run);
    for(let i=0;i<run.length-1;i++){const pair=run.slice(i,i+2);if(!stop.has(pair))terms.push(pair);}
  }
  return [...new Set(terms)].slice(0,64);
}
const fields=[['name',100],['displayName',95],['aliases',85],['keywords',70],['tags',70],['heading',65],['description',40],['summaryZh',40],['summaryEn',40],['searchText',10]];
function includes(value,term) {
  if(/\p{Script=Han}/u.test(term))return value.includes(term);
  return value.split(/[^\p{L}\p{N}]+/u).includes(term);
}
function evidence(asset,terms) {
  const found=[];
  for(const term of terms)for(const [field,weight]of fields){
    const values=[asset[field]].flat().filter(v=>typeof v==='string');
    if(values.some(value=>includes(normalizeQuery(value),term))){found.push({term,field,weight,kind:field==='aliases'?'declared-alias':field.startsWith('summary')?'source-bound-bilingual':'literal'});break;}
  }
  return found;
}
export function matchAsset(asset,query,options={}) {
  const terms=queryTerms(query);if(!terms.length)return null;
  const matches=evidence(asset,terms);if(!matches.length)return null;
  const phrase=normalizeQuery(query),exact=fields.some(([field])=>[asset[field]].flat().some(v=>typeof v==='string'&&normalizeQuery(v)===phrase));
  const relevance=matches.reduce((n,m)=>n+m.weight*(options.idf?.get(m.term)||1),0)/Math.sqrt(terms.length)*(0.4+0.6*matches.length/terms.length)+(exact?150:0);
  return {score:relevance,relevance,matches:matches.slice(0,8).map(({weight,...m})=>m)};
}
export function searchAssets(assets,query='',options={}) {
  if(!normalizeQuery(query))return assets;
  const terms=queryTerms(query),idf=new Map(terms.map(term=>[term,1+Math.log(1+assets.length/(1+assets.filter(a=>evidence(a,[term]).length).length))]));
  return assets.flatMap(asset=>{
    const match=matchAsset(asset,query,{idf});if(!match)return [];
    const demand=options.demand?.[asset.id],age=(options.now??Date.now())-Date.parse(demand?.at||'');
    const recent=Number.isFinite(age)&&age>=0?Math.exp(-age/(7*86400000))*Math.min(0.08,(demand.strength||0)*0.08):0;
    return [{...asset,...match,score:match.score*(1+recent),selection:{relevance:match.relevance,recencyBoost:recent,evidence:demand?.evidence||'none',activation:'unchanged'}}];
  }).sort((a,b)=>b.score-a.score||String(a.id||a.name).localeCompare(String(b.id||b.name)));
}
