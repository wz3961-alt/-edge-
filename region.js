(function (root) {
  "use strict";
  const SETTINGS = "https://www.bing.com/account/general?cc=us&setmkt=en-US&setlang=en-US&bg_overseas=1";
  function usAction(doc) {
    for (const link of doc.querySelectorAll("a[href]")) {
      const label = (link.textContent || "").trim();
      if (!/^(美国|美國|United States(?: - English)?)$/i.test(label)) continue;
      const url = new URL(link.getAttribute("href"), SETTINGS);
      if (url.protocol === "https:" && url.hostname === "www.bing.com" && url.pathname === "/account/action" && url.searchParams.get("cc") === "us") return url.href;
    }
    throw new Error("无法找到必应官方的美国地区设置入口；未尝试猜测地址。");
  }
  async function readSettings() {
    const response = await fetch(SETTINGS, {credentials: "include", cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(12000)});
    if (!response.ok || new URL(response.url).hostname !== "www.bing.com") throw new Error("必应地区检查失败或跳转到非预期地址。");
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    return {doc, country: root.BingGuard.inspectDocument(doc)};
  }
  async function ensureUSRegion() {
    let settings = await readSettings();
    if (settings.country === "US") return {country: "US", repaired: false};
    // Follow only the official US option actually present in the settings page.
    // Tokens stay within Bing; they are never logged or saved by the extension.
    const action = usAction(settings.doc);
    const response = await fetch(action, {credentials: "include", cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(12000)});
    if (!response.ok || new URL(response.url).hostname !== "www.bing.com") throw new Error("保存美国地区失败或发生非预期跳转。");
    settings = await readSettings();
    if (settings.country !== "US") throw new Error(settings.country === "CN" ? "必应仍识别为中国，未展示国内版结果。" : "无法确认美国地区，未展示结果。");
    return {country: "US", repaired: true};
  }
  Object.assign(root.BingGuard, {usAction, ensureUSRegion});
})(globalThis);
