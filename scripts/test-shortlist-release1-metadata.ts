import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {SHORTLIST_SEARCH_TITLE,SHORTLIST_SEARCH_DESCRIPTION} from '../src/lib/shortlist-search-metadata';
const {JSDOM}=createRequire(import.meta.url)('jsdom') as {JSDOM:new(html:string)=>{window:{document:Document}}};

const source=await readFile('src/app/(marketing)/shortlist/page.tsx','utf8');
assert(!source.includes('ProviderFirstEntrance'),'Release 2 must not enter the production route');
assert(!source.includes('provider-first.css'));
const baseline=JSON.parse(await readFile('docs/provider-first/2026-11-12-baseline/baseline.json','utf8'));
assert.equal(baseline.release_status,'not_released');
assert.equal(baseline.reports.search.totals.Clicks,'13');
assert.equal(baseline.reports.search.totals.Impressions,'4936');
assert.equal(baseline.reports.generative.totals.Impressions,'930');
const origin=process.env.METADATA_TEST_ORIGIN??'http://127.0.0.1:3018';
for(const agent of ['Mozilla/5.0','Googlebot','bingbot','GPTBot']){
 const response=await fetch(origin+'/sase/shortlist/',{headers:{'user-agent':agent,connection:'close'},signal:AbortSignal.timeout(180000)});
 assert.equal(response.status,200,agent);
 const document=new JSDOM(await response.text()).window.document;
 document.querySelectorAll('script').forEach(s=>s.remove());
 assert.equal(document.title,SHORTLIST_SEARCH_TITLE,agent);
 assert.equal(document.querySelector('meta[name=description]')?.getAttribute('content'),SHORTLIST_SEARCH_DESCRIPTION,agent);
 assert.equal(document.querySelector('link[rel=canonical]')?.getAttribute('href'),'https://netify.co.uk/sase/shortlist/');
 assert(!document.querySelector('#provider-first-entrance'));
 console.log('PASS: approved Release 1 metadata and unchanged canonical in actual HTML for '+agent);
}
