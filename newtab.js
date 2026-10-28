'use strict';
const $ = id => document.getElementById(id);
const defaults = [{name:'new bing',url:'https://www.bing.com/'},{name:'bilibili',url:'https://www.bilibili.com/'},{name:'ChatGPT',url:'https://chatgpt.com/'},{name:'GitHub',url:'https://github.com/'}];
const DEFAULT_CITY = {name:'长春', latitude:43.8171, longitude:125.3235};
const gradients=['linear-gradient(140deg,#253e58,#7593a2,#203849)','linear-gradient(140deg,#2c5267,#a5b8ac,#263b53)','linear-gradient(140deg,#263c5c,#bd9a83,#31394a)','linear-gradient(140deg,#203f4c,#6b9992,#152d40)'];
// Extension pages use extension storage; ordinary file previews use localStorage.
const memoryStore = {};
const extStorage = globalThis.chrome?.storage?.local;
const read = async keys => {
  if (extStorage) return extStorage.get(keys);
  const result = {};
  for (const key of keys) { try { const value = localStorage.getItem('bingntp.' + key); if (value !== null) result[key] = JSON.parse(value); else if (key in memoryStore) result[key] = memoryStore[key]; } catch (_) { if (key in memoryStore) result[key] = memoryStore[key]; } }
  return result;
};
const save = async data => {
  if (extStorage) return extStorage.set(data);
  Object.assign(memoryStore, data);
  for (const [key, value] of Object.entries(data)) { try { localStorage.setItem('bingntp.' + key, JSON.stringify(value)); } catch (_) {} }
};
let shortcuts=[], selected=-1, suggestions=[], timer, activeController, currentCity=DEFAULT_CITY;
function safeUrl(raw) {const v=raw.trim();const u=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v)?v:'https://'+v);if(!['https:','http:'].includes(u.protocol))throw Error('只支持 HTTP 或 HTTPS 网址。');return u.href;}
function buildShortcuts(){const root=$('shortcuts');root.replaceChildren();shortcuts.forEach((item,index)=>{let wrapper=document.createElement('div');wrapper.className='shortcut';let a=document.createElement('a');a.href=item.url;a.title=item.name;let icon=document.createElement('span');icon.className='icon';let fallback=document.createTextNode(item.name.trim().slice(0,1).toUpperCase()||'•');icon.append(fallback);let img=document.createElement('img');img.alt='';img.src=new URL('/favicon.ico',item.url).href;img.onload=()=>icon.replaceChildren(img);let name=document.createElement('span');name.className='name';name.textContent=item.name;a.append(icon,name);let remove=document.createElement('button');remove.className='remove';remove.type='button';remove.title='删除 '+item.name;remove.setAttribute('aria-label','删除 '+item.name);remove.textContent='×';remove.onclick=async()=>{shortcuts.splice(index,1);await save({ntpShortcuts:shortcuts});buildShortcuts();};wrapper.append(a,remove);root.append(wrapper);});let wrap=document.createElement('div');wrap.className='shortcut';let add=document.createElement('button');add.className='add';add.type='button';add.innerHTML='<span class="icon">+</span><span class="name">添加快捷方式</span>';add.onclick=()=>{$('shortcut-error').textContent='';$('shortcut-form').reset();$('shortcut-dialog').showModal();};wrap.append(add);root.append(wrap);}
function doSearch(q){q=q.trim();if(!q)return;let u=new URL('https://www.bing.com/search');u.searchParams.set('q',q);u.searchParams.set('cc','us');u.searchParams.set('setmkt','en-US');u.searchParams.set('mkt','en-US');u.searchParams.set('setlang','en-US');location.assign(u.href);}
function showSuggestions(){const box=$('suggestions');box.replaceChildren();suggestions.forEach((s,i)=>{const li=document.createElement('li');li.setAttribute('role','option');li.textContent=s;li.classList.toggle('selected',i===selected);li.addEventListener('mousedown',e=>{e.preventDefault();doSearch(s);});box.append(li);});box.hidden=!suggestions.length;}
$('search').onsubmit=e=>{e.preventDefault();doSearch(selected>=0?suggestions[selected]:$('query').value);};
$('query').addEventListener('input',()=>{clearTimeout(timer);activeController?.abort();selected=-1;let q=$('query').value.trim();if(!q){suggestions=[];showSuggestions();return;}timer=setTimeout(async()=>{const c=new AbortController();activeController=c;try{const url=new URL('https://api.bing.com/osjson.aspx');url.searchParams.set('query',q);url.searchParams.set('market','en-US');const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error();const data=await r.json();if($('query').value.trim()!==q)return;suggestions=Array.isArray(data[1])?data[1].filter(v=>typeof v==='string').slice(0,8):[];showSuggestions();}catch(e){if(e.name!=='AbortError'){suggestions=[];showSuggestions();}}},220);});
$('query').addEventListener('keydown',e=>{if(e.key==='Escape'){suggestions=[];selected=-1;showSuggestions();return;}if(!suggestions.length)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();selected=(selected+(e.key==='ArrowDown'?1:-1)+suggestions.length)%suggestions.length;showSuggestions();}});document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap')){$('suggestions').hidden=true;selected=-1;}});
$('shortcut-form').onsubmit=async e=>{e.preventDefault();try{const name=$('shortcut-name').value.trim();if(!name)throw Error('请输入名称。');const url=safeUrl($('shortcut-url').value);shortcuts.push({name,url});await save({ntpShortcuts:shortcuts});buildShortcuts();$('shortcut-dialog').close();}catch(error){$('shortcut-error').textContent=error.message||'网址不正确。';}};
document.querySelectorAll('dialog .cancel').forEach(b=>b.onclick=()=>b.closest('dialog').close());
const landscapes = [
  {title:'挪威 · 罗弗敦群岛',description:'霍克兰海滩被山峦与北大西洋环抱。',author:'Paal Svendsen',license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',source:'https://commons.wikimedia.org/wiki/File:Hauklandsanden,_Vestv%C3%A5g%C3%B8y,_Lofoten.JPG',image:'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Hauklandsanden%2C_Vestv%C3%A5g%C3%B8y%2C_Lofoten.JPG/1280px-Hauklandsanden%2C_Vestv%C3%A5g%C3%B8y%2C_Lofoten.JPG'},
  {title:'纳米比亚 · 苏丝斯黎',description:'纳米布沙漠中起伏的沙丘。',author:'Christoph Strässler',license:'CC BY-SA 2.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/2.0/',source:'https://commons.wikimedia.org/wiki/File:Dune_near_Sossusvlei,_Namibia.jpg',image:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Dune_near_Sossusvlei%2C_Namibia.jpg/1280px-Dune_near_Sossusvlei%2C_Namibia.jpg'},
  {title:'美国 · 优胜美地山谷',description:'加利福尼亚州优胜美地国家公园的山谷景观。',author:'Joel Olives',license:'CC BY 2.0',licenseUrl:'https://creativecommons.org/licenses/by/2.0/',source:'https://commons.wikimedia.org/wiki/File:Yosemite_Valley_View.jpg',image:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Yosemite_Valley_View.jpg/1280px-Yosemite_Valley_View.jpg'},
  {title:'瑞士 · 勒奇山谷',description:'阿尔卑斯山倒映在清晨的山间湖面。',author:'Sabrina Schreiber',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',source:'https://commons.wikimedia.org/wiki/File:Mountain_Reflection_on_Alpine_Lake.jpg',image:'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Mountain_Reflection_on_Alpine_Lake.jpg/1280px-Mountain_Reflection_on_Alpine_Lake.jpg'},
  {title:'日本 · 山中湖与富士山',description:'山中湖湖面映出富士山的轮廓。',author:'Alpsdake',license:'详见原图授权',licenseUrl:'https://commons.wikimedia.org/wiki/File:01_Fujisan_from_Yamanakako_2004-2-7.jpg',source:'https://commons.wikimedia.org/wiki/File:01_Fujisan_from_Yamanakako_2004-2-7.jpg',image:'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/01_Fujisan_from_Yamanakako_2004-2-7.jpg/1280px-01_Fujisan_from_Yamanakako_2004-2-7.jpg'},
  {title:'智利 · 巴塔哥尼亚',description:'巴塔哥尼亚国家公园的冰川与雪山。',author:'Natalia Reyes Escobar',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',source:'https://commons.wikimedia.org/wiki/File:Glaciares_Parque_Nacional_Patagonia.jpg',image:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Glaciares_Parque_Nacional_Patagonia.jpg/1280px-Glaciares_Parque_Nacional_Patagonia.jpg'}
];
function preloadImage(src) { return new Promise(resolve => {const img = new Image(); let done = false; const finish = ok => {if(done)return;done=true;clearTimeout(timeout);resolve(ok);}; const timeout=setTimeout(()=>finish(false),6000); img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=src;}); }
function showPhotoCredit(photo) {
  const box=$('photo-credit'); box.replaceChildren();
  const title=document.createElement('strong');title.textContent=photo.title;
  const desc=document.createElement('span');desc.textContent=photo.description;
  const credits=document.createElement('span');credits.textContent='摄影：'+photo.author+' · ';
  const source=document.createElement('a');source.href=photo.source;source.target='_blank';source.rel='noopener noreferrer';source.textContent='图片来源';
  const license=document.createElement('a');license.href=photo.licenseUrl;license.target='_blank';license.rel='noopener noreferrer';license.textContent=photo.license;
  credits.append(source,document.createTextNode(' · '),license);box.append(title,desc,credits);
}
async function setBackground() {
  const saved=await read(['ntpLastLandscape','ntpLastBackground']);
  const prev=Number.isInteger(saved.ntpLastBackground)?saved.ntpLastBackground:-1;
  const next=(prev+1+Math.floor(Math.random()*(gradients.length-1)))%gradients.length;
  $('background').style.backgroundImage=gradients[next];await save({ntpLastBackground:next});
  const choices=landscapes.filter(x=>x.image!==saved.ntpLastLandscape).sort(()=>Math.random()-.5);
  const previous=landscapes.find(x=>x.image===saved.ntpLastLandscape); if(previous) choices.push(previous);
  for(const photo of choices) {if(await preloadImage(photo.image)){ $('background').style.backgroundImage='url("'+photo.image+'")'; showPhotoCredit(photo);await save({ntpLastLandscape:photo.image});return; }}
  $('photo-credit').textContent='风景照片暂时无法加载，请检查网络。';
}
function weatherSymbol(code){if(code===0)return '☀';if(code<=3)return '⛅';if(code===45||code===48)return '🌫';if(code>=51&&code<=67)return '🌧';if(code>=71&&code<=77)return '❄';if(code>=80&&code<=82)return '🌦';if(code>=95)return '⛈';return '☁';}
async function loadWeather(city){currentCity=city;$('weather-city').textContent=city.name;$('weather-temp').textContent='--°';try{let u=new URL('https://api.open-meteo.com/v1/forecast');u.searchParams.set('latitude',city.latitude);u.searchParams.set('longitude',city.longitude);u.searchParams.set('current','temperature_2m,weather_code');u.searchParams.set('timezone','auto');let r=await fetch(u,{signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error();let data=await r.json();if(!Number.isFinite(data.current?.temperature_2m))throw Error();$('weather-temp').textContent=Math.round(data.current.temperature_2m)+'°C';$('weather-icon').textContent=weatherSymbol(data.current.weather_code);}catch(_){$('weather-icon').textContent='☁';$('weather-temp').textContent='天气不可用';}}
function openCity(){$('city-query').value='';$('city-error').textContent='';$('city-results').replaceChildren();$('city-dialog').showModal();}$('weather').onclick=()=>{const url=new URL('https://open-meteo.com/en/docs');url.searchParams.set('latitude',currentCity.latitude);url.searchParams.set('longitude',currentCity.longitude);url.searchParams.set('current','temperature_2m,weather_code');url.searchParams.set('timezone','auto');location.assign(url.href);};$('settings').onclick=openCity;
$('open-extensions').onclick=async()=>{
  const error=$('extensions-error'); error.textContent='';
  if (!globalThis.chrome?.tabs?.create) { error.textContent='请在地址栏输入 edge://extensions/ 打开扩展管理。'; return; }
  try { await chrome.tabs.create({url:'edge://extensions/'}); } catch (_) { error.textContent='无法自动打开，请在地址栏输入 edge://extensions/。'; }
};
$('city-form').onsubmit=async e=>{e.preventDefault();let q=$('city-query').value.trim();if(!q)return;$('city-error').textContent='正在查找…';$('city-results').replaceChildren();try{let u=new URL('https://geocoding-api.open-meteo.com/v1/search');u.searchParams.set('name',q);u.searchParams.set('count','5');u.searchParams.set('language','zh');u.searchParams.set('format','json');let r=await fetch(u,{signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error();let result=(await r.json()).results||[];if(!result.length)throw Error('未找到城市，试试英文名称。');$('city-error').textContent='请选择城市';for(const item of result){let button=document.createElement('button');button.type='button';button.textContent=[item.name,item.admin1,item.country].filter(Boolean).join(' · ');button.onclick=async()=>{let city={name:item.name,latitude:item.latitude,longitude:item.longitude};await save({ntpWeatherCity:city});$('city-dialog').close();loadWeather(city);};$('city-results').append(button);}}catch(error){$('city-error').textContent=error.message||'查找失败，请检查网络。';}};
(async()=>{let data=await read(['ntpShortcuts','ntpWeatherCity']);shortcuts=Array.isArray(data.ntpShortcuts)?data.ntpShortcuts:defaults;buildShortcuts();loadWeather(data.ntpWeatherCity||DEFAULT_CITY);setBackground();})();
