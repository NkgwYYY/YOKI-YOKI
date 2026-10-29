const wordmark = require('../assets/brand/wordmark.json');
exports.css = `
html,body{background:#211137;color:#F4EAFF}
#yoki-boot{position:fixed;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 32%,#36204F 0%,#211137 65%);font-family:system-ui,sans-serif}
#yoki-boot .brand{width:min(310px,calc(100vw - 64px));height:64px;margin-bottom:44px}
#yoki-boot .track{width:152px;height:2px;overflow:hidden;border-radius:2px;background:#70538F66}
#yoki-boot .line{height:2px;width:52px;background:#D7BAF7;animation:yoki-load 1.8s linear infinite}
#yoki-boot p{margin:24px 0 0;font-size:12px;line-height:20px;letter-spacing:1px;color:#C2ACD6}
#root:not(:empty)~#yoki-boot{display:none}
[role=button]:focus-visible,[role=tab]:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #9D77CA;outline-offset:3px}
@keyframes yoki-load{from{transform:translateX(-52px)}to{transform:translateX(152px)}}
@media(prefers-reduced-motion:reduce){#yoki-boot .line{animation:none;transform:translateX(30px);width:90px}}
`;
exports.contents = `<svg class="brand" viewBox="${wordmark.viewBox}" role="img" aria-label="YOKIYOKI" xmlns="http://www.w3.org/2000/svg">${wordmark.paths.map(d=>`<path d="${d}" fill="none" stroke="#F4EAFF" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg><div class="track" aria-hidden="true"><div class="line"></div></div><p>読み込み中…</p>`;

// Both the standalone web export and the full release build use this boot shell.
exports.inject = html => html
  .replace(/<style id="yoki-boot-style">[\s\S]*?<\/style>/g, '')
  .replace(/<div id="yoki-boot"[\s\S]*?<\/p><\/div>/g, '')
  .replace('</head>', `<style id="yoki-boot-style">${exports.css}</style></head>`)
  .replace('</body>', `<div id="yoki-boot" role="status">${exports.contents}</div></body>`);
