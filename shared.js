(function (root) {
  "use strict";
  const DEFAULT_PORT = 7897;
  function validPort(value) {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("代理端口必须为 1–65535 的整数。");
    return port;
  }
  function pac(port) {
    port = validPort(port);
    return `// BingOverseasGuard-v2\nfunction FindProxyForURL(url, host) {\n host = host.toLowerCase();\n if (host === "bing.com" || dnsDomainIs(host, ".bing.com") || host === "msn.com" || dnsDomainIs(host, ".msn.com") || host === "msn.cn" || dnsDomainIs(host, ".msn.cn")) return "PROXY 127.0.0.1:${port}";\n return "DIRECT";\n}`;
  }
  function normalize(input) {
    const url = new URL(input);
    if (url.hostname !== "bing.com" && !url.hostname.endsWith(".bing.com")) throw new Error("只允许必应网址。");
    url.protocol = "https:";
    url.hostname = "www.bing.com";
    for (const [key, value] of Object.entries({cc: "us", setmkt: "en-US", mkt: "en-US", setlang: "en-US", bg_overseas: "1"})) url.searchParams.set(key, value);
    url.searchParams.delete("ens");
    url.searchParams.delete("ensearch");
    return url.href;
  }
  function countryFromText(text) {
    if (/(?:你的国家\/地区已设置为|您的國家\/地區已設定為)\s*(?:中国|中國)/i.test(text) || /your country\s*\/\s*region is set to\s*(?:China|People['’]s Republic of China)/i.test(text)) return "CN";
    if (/(?:你的国家\/地区已设置为|您的國家\/地區已設定為)\s*(?:美国|美國)/i.test(text) || /your country\s*\/\s*region is set to\s*(?:United States|USA)\b/i.test(text)) return "US";
    return "UNKNOWN";
  }
  function inspectDocument(doc) {
    if (doc.querySelector("#est_switch, #ICPLicense, #ICPFiling, #MMAIS")) return "CN";
    const clone = doc.body ? doc.body.cloneNode(true) : doc.documentElement.cloneNode(true);
    clone.querySelectorAll("script,style,noscript,template").forEach(el => el.remove());
    return countryFromText(clone.textContent || "");
  }
  const api = {DEFAULT_PORT, validPort, pac, normalize, countryFromText, inspectDocument};
  root.BingGuard = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
