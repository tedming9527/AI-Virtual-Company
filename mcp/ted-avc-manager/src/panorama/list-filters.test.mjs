import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeListFilters} from './list-filters.js';
test('defaults to local, independently switches each list and combines source with search',t=>{
 const field=value=>({value,addEventListener(name,fn){this[name]=fn;}});
 const row=(origin,text)=>({dataset:{origin,search:''},textContent:text,hidden:false});
 const list=(rows,source='personal')=>{const select=source?field(source):null,empty={},count={};return {rows,select,empty,count,querySelectorAll:()=>rows,querySelector:q=>({'[data-source-filter]':select,'[data-filter-empty]':empty,'[data-filter-count]':count})[q]};};
 const first=list([row('general','guide'),row('personal','local guide')]),second=list([row('personal','other')]),search=field('');
 const old=globalThis.document;t.after(()=>{globalThis.document=old;});globalThis.document={getElementById:()=>search,querySelectorAll:q=>q==='[data-filter-list]'?[first,second]:[]};
 initializeListFilters(v=>v.toLowerCase());assert.equal(first.rows[0].hidden,true);assert.equal(first.rows[1].hidden,false);
 first.select.value='general';first.select.change();assert.equal(first.rows[0].hidden,false);assert.equal(first.rows[1].hidden,true);assert.equal(second.rows[0].hidden,false);
 search.value='missing';search.input();assert.equal(first.empty.hidden,false);assert.match(first.empty.textContent,/匹配/);
 search.value='';first.select.value='all';search.input();assert.equal(first.count.textContent,'显示 2 / 2 条');
 // Public lists have no source selector and retain all rows.
 first.select=null;initializeListFilters(v=>v);assert.equal(first.rows[0].hidden,false);assert.equal(first.rows[1].hidden,false);
});
