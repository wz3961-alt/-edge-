(function (root) {
  'use strict';
  const names = new Set(['ntps', 'sptmarket']);
  const roots = ['msn.com', 'msn.cn'];
  const managed = domain => roots.some(base => { const h = String(domain).replace(/^\./, '').toLowerCase(); return h === base || h.endsWith('.' + base); });
  function valueFor(name, old) {
    if (name === 'sptmarket') return 'en-US||us|en-us|en-us|en||';
    let data; try { data = JSON.parse(old || '{}'); } catch (_) { try { data = JSON.parse(decodeURIComponent(old || '{}')); } catch (_) { data = {}; } }
    if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
    return JSON.stringify({...data, m:'en-us'});
  }
  const call = start => new Promise((resolve,reject) => start(value => {const e=chrome.runtime.lastError; if(e) reject(new Error(e.message)); else resolve(value);}));
  async function setExisting(cookie) {
    const value=valueFor(cookie.name,cookie.value); if (cookie.value === value) return;
    const o={url:'https://'+cookie.domain.replace(/^\./,'')+(cookie.path||'/'),name:cookie.name,value,path:cookie.path||'/',secure:true,httpOnly:!!cookie.httpOnly};
    if(!cookie.hostOnly) o.domain=cookie.domain; if(cookie.storeId) o.storeId=cookie.storeId; if(cookie.partitionKey) o.partitionKey=cookie.partitionKey;
    if(['no_restriction','lax','strict'].includes(cookie.sameSite)) o.sameSite=cookie.sameSite;
    if(!cookie.session && cookie.expirationDate) o.expirationDate=cookie.expirationDate;
    await call(cb=>chrome.cookies.set(o,cb));
  }
  async function apply() {
    for(const domain of roots) for(const name of names) {
      const existing=await call(cb=>chrome.cookies.getAll({domain,name},cb));
      for(const cookie of existing) if(managed(cookie.domain)) await setExisting(cookie);
      if(!existing.some(c=>c.domain === '.'+domain && c.path === '/' && !c.partitionKey)) {
        await call(cb=>chrome.cookies.set({url:'https://'+domain+'/',domain:'.'+domain,path:'/',name,value:valueFor(name,''),secure:true,expirationDate:Math.floor(Date.now()/1000)+31536000},cb));
      }
    }
    await call(cb=>chrome.storage.local.set({ntpError:''},cb));
  }
  chrome.cookies.onChanged.addListener(({cookie,removed,cause})=>{
    if(removed || !names.has(cookie.name) || !managed(cookie.domain) || cookie.value===valueFor(cookie.name,cookie.value)) return;
    call(cb=>chrome.storage.local.get(['enabled'],cb)).then(s=>s.enabled ? setExisting(cookie) : null).catch(e=>call(cb=>chrome.storage.local.set({ntpError:e.message},cb)));
  });
  root.NtpLock={apply,managed,valueFor};
})(globalThis);
