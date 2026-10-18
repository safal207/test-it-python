#!/usr/bin/env node
// Non-mutating PR inventory. It never comments, closes, merges or changes labels.
import {mkdir,writeFile} from 'node:fs/promises';
const owner=process.env.PR_AUDIT_OWNER||'safal207';
const token=process.env.GITHUB_TOKEN||'';
const dir=process.env.PR_AUDIT_OUTPUT||'artifacts/pr-triage';
const query='is:pr is:open user:'+owner;
const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'ai-path-pr-inventory'};
if(token)headers.Authorization='Bearer '+token;
async function getPage(n){
  const url='https://api.github.com/search/issues?q='+encodeURIComponent(query)+'&sort=updated&order=desc&per_page=100&page='+n;
  const res=await fetch(url,{headers});
  if(!res.ok)throw Error('GitHub search HTTP '+res.status+' '+(await res.text()).slice(0,150));
  return res.json();
}
const first=await getPage(1);
if(!Number.isInteger(first.total_count)||!Array.isArray(first.items))throw Error('Malformed PR search response');
const expected=first.total_count, pages=Math.ceil(Math.min(expected,1000)/100),items=[...first.items];
for(let page=2;page<=pages;page++){
  const result=await getPage(page);
  if(!Array.isArray(result.items))throw Error('Missing PR search page '+page);
  items.push(...result.items);
}
const seen=new Set(),publicEntries=[];
for(const issue of items){
  const repo=(issue.repository_url||'').split('/repos/')[1];
  if(!repo||!repo.startsWith(owner+'/')||!issue.html_url||!Number.isInteger(issue.number)||seen.has(issue.html_url))continue;
  seen.add(issue.html_url);
  publicEntries.push({repo,number:issue.number,title:issue.title||'',url:issue.html_url,author:issue.user?.login||'',updated:issue.updated_at||null});
}
const summary=new Map();
for(const x of publicEntries){if(!summary.has(x.repo))summary.set(x.repo,[]);summary.get(x.repo).push(x)}
const sorted=[...summary].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
const dependencyCount=publicEntries.filter(x=>/^(build|chore)\(deps/.test(x.title)||x.author.includes('dependabot')).length;
const memoryCount=publicEntries.filter(x=>/^memory: learn from merged PR/.test(x.title)).length;
const lines=[
 '# Open PR inventory, '+new Date().toISOString().slice(0,10),
 '',
 'GitHub Search: https://github.com/pulls?q='+encodeURIComponent(query),
 'Reported open: '+expected+'; fetched: '+publicEntries.length+'; repos: '+sorted.length+'.',
 'Only visible repositories are included. Search API supports up to 1000 results.',
 'No PRs merged, closed, commented on or relabeled.',
 '',
 'Dependency titles: '+dependencyCount+'; proposed memory titles: '+memoryCount+'. Neither category is safe to mass-close.',
 '',
 '## Repositories','',
 '| Repository | Open PRs | Review priority |','| --- | ---: | --- |'
];
for(const [name,list] of sorted){
  lines.push('| '+name+' | '+list.length+' | '+(list.length>=20?'Large batch':list.length>=8?'Medium batch':'Inspect individually')+' |');
}
lines.push('','## Recent updates','','| PR | Title | Last updated |','| --- | --- | --- |');
for(const x of publicEntries.slice(0,30)){
  const title=x.title.replaceAll('|','/').replaceAll('\n',' ').slice(0,120);
  lines.push('| '+x.url+' | '+title+' | '+(x.updated?.slice(0,10)||'unknown')+' |');
}
lines.push('','## Non-destructive policy','',
'- Draft memory proposals can contain private data; closing them may reject a pending lesson.',
'- High-risk security/authority PRs need exact-head validation and human sign-off.',
'- Mark superseded only after comparison with the merged replacement and a link to it.',
'- Avoid activating paid bot reviews across all repositories without permission.',
'');
await mkdir(dir,{recursive:true});
const incomplete=first.incomplete_results===true||publicEntries.length<Math.min(expected,1000);
await writeFile(dir+'/open-prs.md',lines.join('\n'));
await writeFile(dir+'/open-prs.json',JSON.stringify({query,expected,fetched:publicEntries.length,incomplete,byRepo:Object.fromEntries(sorted.map(([k,v])=>[k,v.length])),items:publicEntries},null,2));
console.log('Read-only inventory: '+publicEntries.length+'/'+expected+' open PRs, '+sorted.length+' repositories');
if(incomplete)throw Error('Incomplete GitHub search inventory');
