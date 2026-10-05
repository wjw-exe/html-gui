/* =====================================================
   html-gui - 公共工具模块
   编辑器 (app.js) 与导出器 (exporter.js) 共用，避免行为漂移
   挂载到 window.HGUI_UTILS
   ===================================================== */
"use strict";

window.HGUI_UTILS = (function () {
  /* HTML 属性/文本转义 */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  /* 背景色（渐变优先） */
  function bgc(st) {
    return (st && (st.bgGradient || st.bgColor)) || "";
  }

  /* 导出器图标（按钮/徽章/文字前缀） */
  function iconSVG(name) {
    const I = {
      none: "",
      arrow: '<path d="M4 12h14M13 6l6 6-6 6"/>',
      star: '<path d="M12 3l2.7 5.9 6.3.7-4.7 4.3 1.3 6.1L12 16.9 6.4 20l1.3-6.1L3 9.6l6.3-.7Z"/>',
      heart: '<path d="M12 20s-7-4.3-7-9.5A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7 3.5C19 15.7 12 20 12 20Z"/>',
      check: '<path d="m5 12 5 5 9-10"/>',
      cross: '<path d="M6 6l12 12M18 6 6 18"/>',
      search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/>',
      gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19"/>',
      download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
      upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
      play: '<path d="M7 4.5v15l13-7.5Z"/>',
      pause: '<path d="M7 4v16M17 4v16"/>',
      cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/><path d="M3 4h2l2.6 11.5h10.2L21 7H6"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.6-6 8-6s6.8 2 8 6"/>',
      home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
      warn: '<path d="M12 3 2.5 20h19Z"/><path d="M12 10v4M12 17h.01"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      minus: '<path d="M5 12h14"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'
    };
    const d = I[name] || "";
    return '<span class="wuis-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg></span>';
  }

  /* 桥接回调 JSON 容错（H4） */
  function safeParse(s, fallback) {
    if (s == null) return fallback;
    try {
      return JSON.parse(s);
    } catch (e) {
      return fallback;
    }
  }

  /* 打开外部项目时剥离危险标签/事件属性（H1 加固） */
  function sanitizeHtml(html) {
    if (html == null) return "";
    const src = String(html);
    if (!src) return "";
    try {
      if (typeof document === "undefined") return src.replace(/<script[\s\S]*?<\/script>/gi, "");
      const d = document.createElement("div");
      d.innerHTML = src;
      d.querySelectorAll("script,iframe,object,embed,link,meta,style").forEach(n => n.remove());
      d.querySelectorAll("*").forEach(n => {
        Array.prototype.slice.call(n.attributes).forEach(a => {
          const name = a.name.toLowerCase();
          const val = (a.value || "").trim().toLowerCase();
          if (name.startsWith("on") || val.startsWith("javascript:") || name === "srcdoc") n.removeAttribute(a.name);
        });
      });
      return d.innerHTML;
    } catch (e) {
      return src.replace(/<script[\s\S]*?<\/script>/gi, "");
    }
  }

  return { esc: esc, clamp: clamp, bgc: bgc, iconSVG: iconSVG, safeParse: safeParse, sanitizeHtml: sanitizeHtml };
})();
