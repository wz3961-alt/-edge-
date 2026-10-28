(function () {
  "use strict";
  // Only top-level search/navigation pages need the display gate.
  if (window.top !== window || !/^\/(?:$|search(?:\/|$)|images(?:\/|$)|videos(?:\/|$)|news(?:\/|$)|copilotsearch(?:\/|$)|account\/general(?:\/|$))/.test(location.pathname)) {
    if (document.documentElement) document.documentElement.setAttribute("data-bing-overseas-visible", "true");
    else new MutationObserver((_, obs) => {if (document.documentElement) {document.documentElement.setAttribute("data-bing-overseas-visible", "true"); obs.disconnect();}}).observe(document, {childList: true});
    return;
  }
  let stopped = false;
  let observer;
  const send = message => new Promise((resolve, reject) => chrome.runtime.sendMessage(message, response => {
    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
    else if (!response?.ok) reject(new Error(response?.error || "扩展未就绪。"));
    else resolve(response);
  }));
  function stop(reason) {
    if (stopped) return;
    stopped = true;
    observer?.disconnect();
    clearTimeout(deadline);
    const root = document.documentElement || document.appendChild(document.createElement("html"));
    const head = document.createElement("head");
    const title = document.createElement("title"); title.textContent = "已停止：未确认海外版必应"; head.append(title);
    const style = document.createElement("style");
    style.textContent = "body{margin:0;background:#f3f6fa;color:#172536;font:16px/1.8 system-ui,sans-serif}main{max-width:680px;margin:12vh auto;padding:36px;background:white;border-radius:16px;box-shadow:0 8px 36px #132b5010}h1{font-size:26px}p{white-space:pre-wrap}button{font:inherit;padding:9px 18px;margin:12px 12px 0 0;border:1px solid #c5d0dc;border-radius:8px;background:#fff;cursor:pointer}button:first-of-type{background:#155bc1;color:white;border-color:#155bc1}";
    head.append(style);
    const body = document.createElement("body"), main = document.createElement("main");
    const h = document.createElement("h1"); h.textContent = "未确认海外版，已停止展示";
    const p = document.createElement("p"); p.textContent = reason;
    const note = document.createElement("p"); note.textContent = "本扩展不会自动回退到国内版。请检查扩展状态及本地代理是否提供可用的海外线路。扩展只改变浏览器，无法凭空提供海外出口。";
    const retry = document.createElement("button"); retry.textContent = "重新验证"; retry.onclick = () => location.replace(BingGuard.normalize(location.href));
    const options = document.createElement("button"); options.textContent = "打开扩展设置"; options.onclick = () => send({type: "OPTIONS"}).catch(error => {p.textContent = error.message;});
    main.append(h, p, note, retry, options); body.append(main); root.replaceChildren(head, body);
    root.setAttribute("data-bing-overseas-visible", "true");
  }
  const deadline = setTimeout(() => stop("地区验证超时，未展示必应原页面。"), 16000);
  async function verify() {
    try {
      const status = await send({type: "STATUS"});
      if (!status.active) throw new Error(status.error || "浏览器专用线路未启用，或已被其他扩展/策略接管。");
      await BingGuard.ensureUSRegion();
      if (stopped) return;
      if (BingGuard.inspectDocument(document) === "CN") {
        // The cookie may now be US while this already-loaded document is CN.
        // Give it one fresh navigation, with a bounded retry to avoid loops.
        const oldAttempt = Number(sessionStorage.getItem("bingGuardRepairAt") || 0);
        if (Date.now() - oldAttempt < 60000) throw new Error("重设地区后页面仍包含国内版标识，已停止自动重试。");
        sessionStorage.setItem("bingGuardRepairAt", String(Date.now()));
        location.replace(BingGuard.normalize(location.href));
        return;
      }
      sessionStorage.removeItem("bingGuardRepairAt");
      clearTimeout(deadline);
      document.documentElement.setAttribute("data-bing-overseas-visible", "true");
      observer = new MutationObserver(() => {
        if (document.querySelector("#est_switch, #ICPLicense, #ICPFiling, #MMAIS")) stop("页面稍后出现国内版标识，已停止展示。");
      });
      observer.observe(document.documentElement, {subtree: true, childList: true});
    } catch (error) { stop(error.message || "验证失败。"); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", verify, {once: true}); else verify();
})();
