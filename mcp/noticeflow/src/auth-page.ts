const escape = (value: string) =>
  value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );

const paths = {
  flow: '<path d="M5 8h9a4 4 0 0 1 0 8H9M19 24h-9a4 4 0 0 1 0-8h5"/><circle cx="5" cy="8" r="2"/><circle cx="19" cy="24" r="2"/>',
  code: '<path d="m10 7-5 5 5 5m4-10 5 5-5 5"/>',
  send: '<path d="m21 3-7 18-4-7-7-4 18-7Zm-11 11 5-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
};
const icon = (name: keyof typeof paths) =>
  `<svg viewBox="0 0 ${name === "flow" ? "32 32" : "24 24"}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;

const styles = `
  :root {
    --fog: #f1f5f5; --paper: #fff; --ink: #20383f; --muted: #5b6e74;
    --green: #176c64; --blue: #495db3; --red: #b43c37; --line: #dce5e5; --soft: #edf5f2;
    font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
    color: var(--ink); background: var(--fog); font-synthesis: none;
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-width: 320px; min-height: 100vh; }
  button, input { font: inherit; }
  button, summary { -webkit-tap-highlight-color: transparent; cursor: pointer; }
  button:disabled { cursor: wait; }
  button:focus-visible, summary:focus-visible { outline: 3px solid var(--blue); outline-offset: 4px; }
  svg { display: block; flex-shrink: 0; }
  bdi { overflow-wrap: anywhere; }
  #status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .brand { display: flex; align-items: center; gap: 10px; padding: 38px 48px; font-size: 22px; font-weight: 650; letter-spacing: -.7px; }
  .brand svg { width: 29px; height: 29px; color: var(--green); }
  .brand-note { margin-left: 18px; padding-left: 18px; border-left: 1px solid var(--line); font-size: 13px; font-weight: 500; letter-spacing: 0; color: var(--muted); }
  main { padding: 26px 24px 48px; }
  .panel { width: min(100%, 476px); margin: 0 auto; }
  .card { background: var(--paper); border: 1px solid var(--line); border-radius: 18px; padding: 38px; box-shadow: 0 12px 44px #20383f08; }
  .identity { display: flex; align-items: center; gap: 12px; margin-bottom: 25px; }
  .app-glyph, .service-glyph { display: grid; place-items: center; height: 49px; width: 49px; border-radius: 13px; flex-shrink: 0; }
  .app-glyph { background: #253c43; color: white; }
  .app-glyph svg { width: 27px; height: 27px; }
  .service-glyph { background: var(--soft); color: var(--green); border: 1px solid #d1e6df; }
  .service-glyph svg { width: 29px; height: 29px; }
  .bridge { width: 39px; height: 20px; color: #71878c; }
  .identity-name { margin-left: auto; font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
  h1 { margin: 0; font-size: 28px; line-height: 1.4; font-weight: 650; letter-spacing: -1.1px; overflow-wrap: anywhere; }
  h1 bdi { display: inline-block; max-width: 100%; vertical-align: bottom; }
  .intro { margin: 10px 0 25px; font-size: 14px; line-height: 1.8; color: var(--muted); }
  .permission { display: flex; align-items: flex-start; gap: 12px; padding: 18px 0; margin-bottom: 23px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .permission-icon { padding: 7px; background: var(--soft); color: var(--green); border-radius: 8px; }
  .permission-icon svg { height: 19px; width: 19px; }
  .permission strong { display: block; font-size: 14px; font-weight: 600; margin: 1px 0 5px; }
  .permission p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.75; }
  label { display: block; margin-bottom: 9px; font-size: 14px; font-weight: 600; }
  .password-field { display: flex; align-items: center; border: 1px solid #71878c; border-radius: 9px; background: white; }
  .password-field:focus-within { border-color: var(--green); box-shadow: 0 0 0 3px #176c6420; }
  .password-field.invalid { border-color: var(--red); }
  input[type="password"], input[type="text"] { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; padding: 13px 14px; line-height: 22px; font-size: 16px; color: var(--ink); }
  input::placeholder { color: var(--muted); font-size: 13px; }
  .reveal { border: 0; background: transparent; color: var(--muted); font-size: 12px; padding: 12px 14px; flex-shrink: 0; }
  .hint, .field-error { font-size: 12px; line-height: 1.7; margin: 9px 0 0; }
  .hint { color: var(--muted); }
  .field-error { color: var(--red); }
  .actions { margin-top: 24px; }
  .primary { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 48px; padding: 12px 20px; border: 1px solid transparent; border-radius: 9px; background: var(--green); color: white; font-size: 14px; font-weight: 600; }
  .primary:hover { filter: brightness(.94); }
  button:disabled { opacity: .75; }
  .secondary { display: block; margin: 13px auto 0; border: 0; background: transparent; color: var(--muted); padding: 10px 14px; font-size: 13px; }
  .secondary:hover { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
  .verified { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--green); }
  .verified svg { width: 17px; height: 17px; }
  .session-note { margin: 18px 0 0; color: var(--muted); font-size: 13px; line-height: 1.8; }
  details { margin-top: 24px; padding-top: 19px; border-top: 1px solid var(--line); }
  summary { list-style: none; display: flex; align-items: center; gap: 7px; width: fit-content; color: var(--muted); font-size: 12px; }
  summary::-webkit-details-marker { display: none; }
  summary svg { width: 13px; height: 13px; }
  details[open] summary svg { transform: rotate(90deg); }
  dl { margin: 17px 0 0; font-size: 12px; line-height: 1.7; }
  dt { color: var(--muted); margin-top: 11px; }
  dd { margin: 3px 0 0; overflow-wrap: anywhere; }
  .page-note { margin: 20px auto 0; text-align: center; font-size: 12px; line-height: 1.9; color: var(--muted); }
  .page-note svg { display: inline-block; vertical-align: -2px; width: 13px; height: 13px; margin-right: 4px; }
  .pending::before { content: ""; width: 16px; height: 16px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (min-width: 1500px) { main { padding-top: 7vh; } }
  @media (max-width: 650px) {
    .brand { padding: 25px 24px; }
    .brand-note { margin-left: 12px; padding-left: 12px; }
    main { padding: 16px 18px 32px; }
    .card { padding: 27px 25px; border-radius: 14px; }
    h1 { font-size: 25px; }
  }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
`;

const script = `
  const form = document.querySelector('form');
  const password = document.querySelector('#password');
  const reveal = document.querySelector('#reveal');
  if (reveal) {
    reveal.hidden = false;
    reveal.addEventListener('click', () => {
      const visible = password.type === 'password';
      password.type = visible ? 'text' : 'password';
      reveal.textContent = visible ? '隐藏' : '显示';
      reveal.setAttribute('aria-label', visible ? '隐藏密码' : '显示密码');
      reveal.setAttribute('aria-pressed', String(visible));
    });
  }
  if (form) form.addEventListener('submit', (event) => {
    if (form.getAttribute('aria-busy') === 'true') { event.preventDefault(); return; }
    const button = event.submitter || form.querySelector('[value="yes"]');
    const choice = button.value;
    // Disabled submit buttons are omitted from native form serialization.
    const decision = document.createElement('input');
    decision.type = 'hidden'; decision.name = 'approve'; decision.value = choice;
    form.append(decision);
    form.setAttribute('aria-busy', 'true');
    form.querySelectorAll('button').forEach((item) => { item.disabled = true; });
    button.classList.add('pending');
    button.textContent = choice === 'no' ? '正在取消…' : password ? '正在验证…' : '正在授权…';
    document.querySelector('#status').textContent = button.textContent;
  });
`;

function page(nonce: string, content: string) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Noticeflow 授权连接</title><style nonce="${nonce}">${styles}</style></head>
<body><header class="brand">${icon("flow")}<span>Noticeflow</span><span class="brand-note">授权连接</span></header>
<main><div class="panel"><section class="card" aria-labelledby="heading">${content}</section><p class="page-note">${icon("lock")}管理员密码仅用于 Noticeflow 身份验证。</p></div></main>
<script nonce="${nonce}">${script}</script></body></html>`;
}

export function renderInteractionPage(options: {
  nonce: string;
  csrf: string;
  action: string;
  clientName: string;
  clientId: string;
  callback: string;
  resource: string;
  scope: string;
  prompt: string;
  error?: "password" | "limited";
}) {
  const { nonce, csrf, error } = options;
  const client = `<bdi>${escape(options.clientName)}</bdi>`;
  const consent = options.prompt === "consent";
  const limited = error === "limited";
  const title = limited ? "请稍后再试" : consent ? `允许 ${client} 发送通知？` : `连接 ${client} 与 Noticeflow`;
  const intro = limited ? "密码尝试次数过多，登录已暂时受限。请等待 15 分钟后，从发起连接的应用重新连接。" : consent ? "请确认这次连接可以执行的操作。" : "先验证管理员身份，再确认发送权限。";
  const password = `<label for="password">管理员密码</label><div class="password-field${error === "password" ? " invalid" : ""}"><input id="password" name="password" type="password" required autocomplete="current-password" placeholder="输入管理员密码" aria-describedby="password-help"${error === "password" ? ' aria-invalid="true"' : ""}><button type="button" id="reveal" class="reveal" hidden aria-controls="password" aria-pressed="false" aria-label="显示密码">显示</button></div>
<p id="password-help" class="${error === "password" ? "field-error" : "hint"}"${error === "password" ? ' role="alert"' : ""}>${error === "password" ? "密码不正确，请重新输入。" : "使用此 Noticeflow 实例的管理员密码。"}</p>`;
  return page(nonce, `
<div class="identity"><span class="app-glyph">${icon("code")}</span><svg class="bridge" viewBox="0 0 39 20" fill="none" aria-hidden="true"><path d="M3 10h30m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.3"/></svg><span class="service-glyph">${icon("flow")}</span><span class="identity-name">${client} 连接请求</span></div>
<h1 id="heading">${title}</h1><p class="intro">${intro}</p>
${limited ? "" : `<section class="permission" aria-label="请求的权限"><span class="permission-icon">${icon("send")}</span><div><strong>发送通知</strong><p>向 Noticeflow 已配置的企业微信群机器人提交通知。</p></div></section>`}
<form method="post" action="${escape(options.action)}"><input type="hidden" name="csrf" value="${escape(csrf)}">
${limited ? "" : consent ? `<div class="verified">${icon("check")}管理员身份已验证</div><p class="session-note">允许后，${client} 可以通过此服务发送通知。管理员密码不会提供给 ${client}。</p>` : password}
<div class="actions">${limited ? "" : `<button type="submit" class="primary" name="approve" value="yes">${consent ? "允许发送通知" : "验证身份"}</button>`}<button type="submit" class="secondary" name="approve" value="no" formnovalidate>取消连接</button></div></form><span id="status" role="status"></span>
<details><summary>${icon("right")}查看连接详情</summary><dl><dt>请求应用</dt><dd>${client}</dd><dt>应用标识</dt><dd>${escape(options.clientId)}</dd><dt>Noticeflow 服务</dt><dd>${escape(options.resource)}</dd><dt>授权后返回</dt><dd>${escape(options.callback)}</dd><dt>权限标识</dt><dd>${escape(options.scope)}</dd></dl></details>`);
}

export function renderExpiredPage(nonce: string) {
  return page(nonce, '<h1 id="heading">这次授权请求已过期</h1><p class="intro">请返回发起连接的应用重新发起，再使用新打开的授权页面。</p>');
}
