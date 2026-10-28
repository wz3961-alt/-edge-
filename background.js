"use strict";
importScripts("shared.js", "ntp-lock.js");
function callChrome(start) {
  return new Promise((resolve, reject) => start(value => {
    const error = chrome.runtime.lastError;
    if (error) reject(new Error(error.message)); else resolve(value);
  }));
}
const proxyGet = () => callChrome(cb => chrome.proxy.settings.get({incognito: false}, cb));
const proxySet = value => callChrome(cb => chrome.proxy.settings.set({value, scope: "regular_only"}, cb));
const storageGet = keys => callChrome(cb => chrome.storage.local.get(keys, cb));
const storageSet = data => callChrome(cb => chrome.storage.local.set(data, cb));
async function enable(port) {
  port = BingGuard.validPort(port);
  const current = await proxyGet();
  if (!["controllable_by_this_extension", "controlled_by_this_extension"].includes(current.levelOfControl)) throw new Error("浏览器代理被其他扩展或策略控制，守卫未接管。请先在 Edge 中处理冲突。");
  // Do not silently overwrite an existing custom browser proxy or PAC.
  if (current.levelOfControl !== "controlled_by_this_extension" && !["direct", "system"].includes(current.value?.mode)) throw new Error("检测到浏览器已有专用代理/PAC。为避免覆盖，未启用本扩展的线路。");
  await proxySet({mode: "pac_script", pacScript: {data: BingGuard.pac(port), mandatory: true}});
  await storageSet({port, enabled: true, error: ""});
  try { await NtpLock.apply(); } catch (error) { await storageSet({ntpError: error.message}); }
  await chrome.action.setBadgeText({text: "US"});
  await chrome.action.setBadgeBackgroundColor({color: "#146c43"});
  return status();
}
async function status() {
  const saved = await storageGet(["port", "enabled", "error", "ntpError"]);
  const current = await proxyGet();
  const active = saved.enabled === true && current.levelOfControl === "controlled_by_this_extension" && current.value?.mode === "pac_script" && current.value?.pacScript?.data === BingGuard.pac(saved.port || BingGuard.DEFAULT_PORT);
  return {active, port: saved.port || BingGuard.DEFAULT_PORT, error: saved.error || "", ntpError: saved.ntpError || "", note: "已配置不等于已验证美国出口；页面还会逐次检查必应地区。"};
}
async function disable() {
  await callChrome(cb => chrome.proxy.settings.clear({scope: "regular_only"}, cb));
  await storageSet({enabled: false, error: ""});
  await chrome.action.setBadgeText({text: "OFF"});
  return status();
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const fromOwnPage = sender.id === chrome.runtime.id && (!sender.url || sender.url.startsWith(chrome.runtime.getURL("")));
  let operation;
  if (message?.type === "STATUS") operation = status();
  else if (message?.type === "OPTIONS") operation = chrome.runtime.openOptionsPage().then(() => ({}));
  else if (message?.type === "ENABLE" && fromOwnPage) operation = enable(message.port);
  else if (message?.type === "DISABLE" && fromOwnPage) operation = disable();
  else return false;
  operation.then(data => sendResponse({ok: true, ...data})).catch(error => sendResponse({ok: false, error: error.message}));
  return true;
});
async function initialize() {
  const saved = await storageGet(["port", "enabled"]);
  if (saved.enabled === false) return;
  try { await enable(saved.port || BingGuard.DEFAULT_PORT); }
  catch (error) {
    await storageSet({error: error.message, enabled: false});
    await chrome.action.setBadgeText({text: "!"});
  }
}
chrome.runtime.onInstalled.addListener(() => { initialize().then(() => chrome.runtime.openOptionsPage()); });
chrome.runtime.onStartup.addListener(() => { initialize(); });
