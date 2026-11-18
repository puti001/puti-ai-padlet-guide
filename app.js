const $ = (selector, root = document) => root.querySelector(selector);
const cardContainer = $('#cards');
const categoryList = $('#category-list');
const detailDialog = $('#detail-dialog');
const imageDialog = $('#image-dialog');
const search = $('#search');
const favoriteFilter = $('#favorites-filter');
const PAGE_SIZE = 12;
const icons = {all:'◈',cases:'✦',create:'⊞',post:'✎',collab:'♧',present:'▣',organize:'☷',other:'✳'};
const colors = {cases:'#ec987a',create:'#dc987f',post:'#8baeca',collab:'#8ab69a',present:'#d4b56f',organize:'#ac9dc9',other:'#e5a889'};
let library = {categories:[],items:[]};
let state = {category:'all',query:'',page:1,favoritesOnly:false,active:null};
let favorites = new Set();
try { favorites = new Set(JSON.parse(localStorage.getItem('puti-padlet-favorites-v1') || '[]')); } catch (_) { favorites = new Set(); }

function esc(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function saveFavorites(){ try { localStorage.setItem('puti-padlet-favorites-v1',JSON.stringify([...favorites])); } catch (_) {} }
function categoryFor(id){ return library.categories.find(c=>c.id===id); }
function searchText(item){ return [item.title,item.english,item.summary,categoryFor(item.category)?.name,...item.groups.flatMap(g=>g.steps)].join(' ').toLocaleLowerCase(); }
function filteredItems(){
  const q=state.query.trim().toLocaleLowerCase();
  return library.items.filter(item => (state.category==='all' || item.category===state.category)
    && (!state.favoritesOnly || favorites.has(item.id))
    && (!q || q.split(/\s+/).every(term=>searchText(item).includes(term))));
}
function drawCategories(){
  let cats=[{id:'all',name:'全部教學'},...library.categories];
  categoryList.innerHTML=cats.map(c=>{
    const count=c.id==='all'?library.items.length:library.items.filter(i=>i.category===c.id).length;
    return `<button type="button" class="cat-btn ${state.category===c.id?'active':''}" data-category="${esc(c.id)}" aria-pressed="${state.category===c.id}"><span class="cat-icon" aria-hidden="true">${icons[c.id]||'✦'}</span><span>${esc(c.name)}</span><span class="cat-count">${count}</span></button>`;
  }).join('');
}
function thumbnail(group, title){
  return `<div class="thumb ${group.videoCrop?'video':''} ${group.videoOld?'old':''}"><img loading="lazy" src="${esc(group.image)}" alt="${esc(title)}的影片截圖"></div>`;
}
function drawCards(){
  const results=filteredItems();
  const pages=Math.max(1,Math.ceil(results.length/PAGE_SIZE));
  state.page=Math.min(state.page,pages);
  let current=results.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE);
  let cat=categoryFor(state.category);
  $('#results-title').textContent=state.favoritesOnly?'我的收藏':(cat?.name||'全部教學');
  $('#current-label').textContent=state.query?'SEARCH RESULTS':state.favoritesOnly?'SAVED LESSONS':cat?'EXPLORE BY TOPIC':'ALL LESSONS';
  $('#result-count').textContent=`${results.length} 個項目`;
  $('#favorites-count').textContent=favorites.size;
  favoriteFilter.setAttribute('aria-pressed',String(state.favoritesOnly));
  cardContainer.innerHTML=current.map(item=>{
    let c=categoryFor(item.category), saved=favorites.has(item.id), group=item.groups[0];
    return `<article class="lesson-card" style="--card-accent:${colors[item.category]}">
      <button type="button" class="card-main" data-open="${esc(item.id)}" aria-label="開啟${esc(item.title)}教學">
      ${thumbnail(group,item.title)}<div class="card-body"><div class="card-topline"><span class="card-bullet"></span>${esc(c?.name||'教學')}</div><h4 class="card-title">${esc(item.title)}</h4><p class="card-desc">${esc(item.summary)}</p><span class="card-arrow" aria-hidden="true">↗</span></div></button>
      <button type="button" class="bookmark ${saved?'saved':''}" data-favorite="${esc(item.id)}" aria-label="${saved?'取消收藏':'收藏'} ${esc(item.title)}" aria-pressed="${saved}">${saved?'♥':'♡'}</button></article>`;
  }).join('');
  $('#empty').hidden=results.length!==0;
  drawPages(pages);
}
function drawPages(pages){
  const container=$('#pagination');
  if(pages<=1){container.innerHTML='';return;}
  let visible=new Set([1,pages,state.page-1,state.page,state.page+1]);
  visible=[...visible].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b);
  let last=0, html=`<button type="button" data-page="${state.page-1}" ${state.page===1?'disabled':''} aria-label="上一頁">←</button>`;
  for(const n of visible){if(n-last>1)html+='<span>…</span>';html+=`<button type="button" data-page="${n}" class="${n===state.page?'current':''}" ${n===state.page?'aria-current="page"':''}>${n}</button>`;last=n;}
  html+=`<button type="button" data-page="${state.page+1}" ${state.page===pages?'disabled':''} aria-label="下一頁">→</button>`;
  container.innerHTML=html;
}
function draw(){drawCategories();drawCards();}
function stepList(group){
  return `<ol class="steps">${group.steps.map((step,i)=>`<li><span class="step-number">${String(i+1).padStart(2,'0')}</span><div>${group.labels?.[i]?`<b>${esc(group.labels[i])}</b>`:''}${esc(step)}</div></li>`).join('')}</ol>`;
}
function renderDetail(item){
  const cat=categoryFor(item.category), saved=favorites.has(item.id);
  $('#detail-content').innerHTML=`<div class="detail-head"><div class="detail-kicker"><span>${esc(cat.name)}</span><span>${item.category==='cases'?'課堂案例':'功能教學'}</span></div><h2 id="detail-title">${esc(item.title)}</h2><p>${esc(item.summary)}</p>${item.prep?`<p><strong>事前準備：</strong>${esc(item.prep)}</p>`:''}<p class="source-context">步驟依 Padlet 教學影片與講義整理；實際選單可能隨版本或帳號不同。</p><div class="detail-actions"><button type="button" data-detail-favorite="${esc(item.id)}" class="${saved?'saved':''}" aria-pressed="${saved}">${saved?'♥ 已收藏':'♡ 收藏這個教學'}</button><a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceLabel)} ↗</a><button type="button" id="copy-link">複製此頁連結</button></div></div>
  <div class="detail-sections">${item.groups.map((group,index)=>`<section class="detail-section"><h3>${item.groups.length>1?`${String(index+1).padStart(2,'0')}　`:''}${esc(group.title)}</h3><div class="detail-layout"><div>${stepList(group)}${(group.notes||[]).map(note=>`<p class="detail-note"><strong>教學提醒：</strong>${esc(note)}</p>`).join('')}${group.practice?`<p class="practice"><strong>課堂練習：</strong>${esc(group.practice)}</p>`:''}</div><div class="detail-visual"><button type="button" class="shot-button" data-image="${esc(group.image)}" data-caption="${esc(group.caption||item.title)}" data-video-crop="${group.videoCrop?'true':'false'}" data-video-old="${group.videoOld?'true':'false'}" aria-label="放大${esc(item.title)}操作截圖">${thumbnail(group,item.title)}</button><p class="shot-caption">${esc(group.caption||'Padlet 官方影片示範畫面')} <span>點擊放大 ⤢</span></p></div></div></section>`).join('')}</div>`;
}
function openDetail(id, updateHash=true){
  const item=library.items.find(i=>i.id===id); if(!item)return;
  state.active=id; renderDetail(item);
  if(!detailDialog.open)detailDialog.showModal();
  if(updateHash)history.replaceState(null,'',`#lesson=${encodeURIComponent(id)}`);
}
function toggleFavorite(id){
  favorites.has(id)?favorites.delete(id):favorites.add(id);saveFavorites();draw();
  if(detailDialog.open && state.active===id)renderDetail(library.items.find(i=>i.id===id));
}
categoryList.addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;state.category=button.dataset.category;state.page=1;state.favoritesOnly=false;draw();});
cardContainer.addEventListener('click',event=>{const fav=event.target.closest('[data-favorite]');if(fav){toggleFavorite(fav.dataset.favorite);return;}const button=event.target.closest('[data-open]');if(button)openDetail(button.dataset.open);});
search.addEventListener('input',()=>{state.query=search.value;state.page=1;drawCards();});
favoriteFilter.addEventListener('click',()=>{state.favoritesOnly=!state.favoritesOnly;state.page=1;drawCards();});
$('#clear-filters').addEventListener('click',()=>{state={...state,category:'all',query:'',page:1,favoritesOnly:false};search.value='';draw();});
$('#pagination').addEventListener('click',event=>{const b=event.target.closest('[data-page]');if(!b || b.disabled)return;state.page=Number(b.dataset.page);drawCards();$('.results-heading').scrollIntoView({behavior:'smooth',block:'start'});});
$('#close-dialog').addEventListener('click',()=>detailDialog.close());
detailDialog.addEventListener('close',()=>{state.active=null;if(location.hash.startsWith('#lesson='))history.replaceState(null,'','#library');});
detailDialog.addEventListener('click',async event=>{
  if(event.target===detailDialog){detailDialog.close();return;}
  const fav=event.target.closest('[data-detail-favorite]');if(fav){toggleFavorite(fav.dataset.detailFavorite);return;}
  const shot=event.target.closest('[data-image]');if(shot){const frame=$('#zoom-frame');frame.className=`thumb ${shot.dataset.videoCrop==='true'?'video':''} ${shot.dataset.videoOld==='true'?'old':''}`;const img=$('img',frame);img.src=shot.dataset.image;img.alt=shot.dataset.caption;imageDialog.querySelector('p').textContent=shot.dataset.caption;imageDialog.showModal();return;}
  if(event.target.closest('#copy-link')){try{await navigator.clipboard.writeText(location.href);event.target.textContent='連結已複製';}catch(_){event.target.textContent='請複製瀏覽器網址';}}
});
$('.image-close').addEventListener('click',()=>imageDialog.close());
imageDialog.addEventListener('click',event=>{if(event.target===imageDialog)imageDialog.close();});
document.addEventListener('keydown',event=>{if(event.key==='/' && !detailDialog.open && !imageDialog.open && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){event.preventDefault();search.focus();}});
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#lesson='))openDetail(decodeURIComponent(location.hash.slice(8)),false);});

fetch('data.json').then(response=>{if(!response.ok)throw new Error('資料無法載入');return response.json();}).then(data=>{
  library=data;draw();if(location.hash.startsWith('#lesson='))openDetail(decodeURIComponent(location.hash.slice(8)),false);
}).catch(()=>{cardContainer.innerHTML='<div class="load-error">教學資料暫時無法載入，請重新整理頁面。</div>';});
