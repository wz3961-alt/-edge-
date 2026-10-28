"use strict";
const statusEl = document.getElementById("status"), resultEl = document.getElementById("result"), portEl = document.getElementById("port");
const send = message => new Promise((resolve, reject) => chrome.runtime.sendMessage(message, response => {
  if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
  else if (!response?.ok) reject(new Error(response?.error || "扩展未返回状态。"));
  else resolve(response);
}));
function display(status) {
  portEl.value = status.port;
  document.getElementById("ntp-status").textContent = !status.active ? "线路未启用，MSN 地区 Cookie 不持续维护。" : status.ntpError ? "MSN 地区 Cookie 设置失败：" + status.ntpError : "MSN 地区偏好已尝试设置；新标签页实际内容尚需验证。";
  statusEl.textContent = status.active ? `浏览器专用线路已配置：127.0.0.1:${status.port}\n尚需验证美国地区。` : `线路未启用。\n${status.error || "守卫将停止展示必应页面。"}`;
}
async function run(operation) {
  document.querySelectorAll("button").forEach(button => {button.disabled = true;});
  resultEl.textContent = "正在检查…";
  try {await operation();} catch (error) {resultEl.textContent = error.message;}
  finally {document.querySelectorAll("button").forEach(button => {button.disabled = false;});}
}
document.getElementById("enable").addEventListener("click", () => run(async () => {
  display(await send({type: "ENABLE", port: BingGuard.validPort(portEl.value)}));
  resultEl.textContent = "已配置。请点击“验证必应地区”检查当前线路。";
}));
document.getElementById("disable").addEventListener("click", () => run(async () => {
  display(await send({type: "DISABLE"})); resultEl.textContent = "已清除本扩展设置的浏览器代理。其他守卫规则仍存在；要全部恢复，请停用整个扩展。";
}));
document.getElementById("verify").addEventListener("click", () => run(async () => {
  const status = await send({type: "STATUS"}); display(status);
  if (!status.active) throw new Error("请先启用浏览器专用线路。");
  const result = await BingGuard.ensureUSRegion();
  resultEl.textContent = `本次验证通过：必应设置页识别为美国。${result.repaired ? "已通过官方设置入口重设地区。" : ""}每次搜索展示前仍会重新检查。`;
}));
send({type: "STATUS"}).then(display).catch(error => {statusEl.textContent = error.message;});
