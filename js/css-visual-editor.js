/* =====================================================
   html-gui - 可视化 CSS 编辑器模块
   通过属性面板控件（颜色选择器/滑块/下拉/开关/文本）调整样式，
   自动生成 CSS 文本；支持选择器管理、源码模式回填、实时生效。
   ===================================================== */
"use strict";

window.WUIS_CSS_VISUAL = (function () {
  const $ = (s) => document.querySelector(s);

  /* ---------- 属性元数据 ---------- */
  const PROP_META = [
    // 字体
    { group: "字体", key: "font-family", type: "select", label: "字体", options: ["", "Arial, sans-serif", "\"Helvetica Neue\", Arial, sans-serif", "Georgia, serif", "\"Times New Roman\", serif", "\"Microsoft YaHei\", \"PingFang SC\", sans-serif", "\"Courier New\", monospace", "Impact, fantasy"] },
    { group: "字体", key: "font-size", type: "slider", label: "字号", min: 8, max: 96, step: 1, unit: "px" },
    { group: "字体", key: "font-weight", type: "select", label: "字重", options: ["", "normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900", "lighter", "bolder"] },
    { group: "字体", key: "font-style", type: "select", label: "斜体", options: ["", "normal", "italic", "oblique"] },
    { group: "字体", key: "text-align", type: "select", label: "对齐", options: ["", "left", "center", "right", "justify"] },
    { group: "字体", key: "line-height", type: "slider", label: "行高", min: 0.8, max: 3, step: 0.1, unit: "" },
    { group: "字体", key: "letter-spacing", type: "slider", label: "字距", min: 0, max: 12, step: 1, unit: "px" },
    { group: "字体", key: "text-decoration", type: "select", label: "装饰", options: ["", "none", "underline", "line-through", "overline"] },
    { group: "字体", key: "color", type: "color", label: "文字颜色" },
    // 背景
    { group: "背景", key: "background-color", type: "color", label: "背景色" },
    { group: "背景", key: "background-image", type: "text", label: "背景图", placeholder: "url(...) 或渐变" },
    { group: "背景", key: "background-size", type: "select", label: "背景尺寸", options: ["", "auto", "cover", "contain", "100% 100%"] },
    { group: "背景", key: "background-repeat", type: "select", label: "背景重复", options: ["", "no-repeat", "repeat", "repeat-x", "repeat-y"] },
    { group: "背景", key: "background-position", type: "select", label: "背景位置", options: ["", "center", "top", "left", "right", "bottom", "top left", "top right", "bottom left", "bottom right"] },
    // 边框与圆角
    { group: "边框", key: "border-width", type: "slider", label: "边框粗细", min: 0, max: 20, step: 1, unit: "px" },
    { group: "边框", key: "border-style", type: "select", label: "边框样式", options: ["", "none", "solid", "dashed", "dotted", "double", "ridge"] },
    { group: "边框", key: "border-color", type: "color", label: "边框颜色" },
    { group: "边框", key: "border-radius", type: "slider", label: "圆角", min: 0, max: 100, step: 1, unit: "px" },
    // 间距
    { group: "间距", key: "margin-top", type: "slider", label: "外边距 上", min: 0, max: 200, step: 1, unit: "px" },
    { group: "间距", key: "margin-right", type: "slider", label: "外边距 右", min: 0, max: 200, step: 1, unit: "px" },
    { group: "间距", key: "margin-bottom", type: "slider", label: "外边距 下", min: 0, max: 200, step: 1, unit: "px" },
    { group: "间距", key: "margin-left", type: "slider", label: "外边距 左", min: 0, max: 200, step: 1, unit: "px" },
    { group: "间距", key: "padding-top", type: "slider", label: "内边距 上", min: 0, max: 200, step: 1, unit: "px" },
    { group: "间距", key: "padding-right", type: "slider", label: "内边距 右", min: 0, max: 200, step: 1, unit: "px" },
    { group: "间距", key: "padding-bottom", type: "slider", label: "内边距 下", min: 0, max: 200, step: 1, unit: "px" },
    { group: "间距", key: "padding-left", type: "slider", label: "内边距 左", min: 0, max: 200, step: 1, unit: "px" },
    // 尺寸与布局
    { group: "尺寸与布局", key: "width", type: "slider", label: "宽度", min: 0, max: 1200, step: 10, unit: "px" },
    { group: "尺寸与布局", key: "height", type: "slider", label: "高度", min: 0, max: 1200, step: 10, unit: "px" },
    { group: "尺寸与布局", key: "display", type: "select", label: "显示", options: ["", "block", "inline", "inline-block", "flex", "grid", "none"] },
    { group: "尺寸与布局", key: "overflow", type: "select", label: "溢出", options: ["", "visible", "hidden", "scroll", "auto"] },
    // 效果
    { group: "效果", key: "opacity", type: "slider", label: "不透明度", min: 0, max: 1, step: 0.05, unit: "" },
    { group: "效果", key: "cursor", type: "select", label: "鼠标样式", options: ["", "default", "pointer", "text", "move", "crosshair", "not-allowed"] }
  ];
  const PROP_KEYS = {};
  PROP_META.forEach(p => { PROP_KEYS[p.key] = true; });
  PROP_KEYS["box-shadow"] = true;

  /* ---------- 状态 ---------- */
  let rules = [];
  let currentSelector = "body";
  let initialized = false;

  function getState() {
    return (window.App && window.App.getScriptState) ? window.App.getScriptState() : { css: "" };
  }

  /* ---------- CSS 解析 / 序列化 ---------- */
  /* M6: 改用浏览器 CSSOM 解析（style.sheet.cssRules），无效声明交给引擎处理，保留正则兜底 */
  function parseCss(css) {
    const result = [];
    if (css && css.trim()) {
      try {
        const styleEl = document.createElement("style");
        styleEl.setAttribute("data-hgui-cssom", "1");
        styleEl.textContent = css;
        (document.head || document.documentElement).appendChild(styleEl);
        const sheet = styleEl.sheet;
        const list = (sheet && sheet.cssRules) ? sheet.cssRules : [];
        for (let i = 0; i < list.length; i++) {
          const r = list[i];
          if (!r || r.type !== CSSRule.STYLE_RULE) continue; // 跳过 @media/@import 等非样式规则
          const props = {};
          const extra = [];
          const st = r.style;
          for (let j = 0; j < st.length; j++) {
            const k = st[j];
            const v = st.getPropertyValue(k);
            if (PROP_KEYS[k]) props[k] = v;
            else extra.push(k + ": " + v + ";");
          }
          const selector = (r.selectorText || "").trim().replace(/\s+/g, " ");
          if (selector) result.push({ selector: selector, props: props, extra: extra });
        }
        styleEl.remove();
      } catch (e) {
        // CSSOM 不可用时退化到正则解析
      }
    }
    if (!result.length && css && css.trim()) {
      const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
      let m;
      while ((m = ruleRe.exec(css))) {
        const selector = m[1].trim().replace(/\s+/g, " ");
        const body = m[2];
        const props = {};
        const extra = [];
        const declRe = /([\w-]+)\s*:\s*([^;]+);/g;
        let d;
        while ((d = declRe.exec(body))) {
          const k = d[1].trim().toLowerCase();
          const v = d[2].trim();
          if (PROP_KEYS[k]) props[k] = v;
          else extra.push(k + ": " + v + ";");
        }
        if (selector) result.push({ selector: selector, props: props, extra: extra });
      }
    }
    if (!result.length) result.push({ selector: "body", props: {}, extra: [] });
    return result;
  }

  function serializeRules() {
    const out = [];
    rules.forEach(r => {
      let body = "";
      PROP_META.forEach(p => {
        const v = r.props[p.key];
        if (v !== undefined && v !== null && v !== "") body += "  " + p.key + ": " + v + ";\n";
      });
      if (r.props["box-shadow"]) body += "  box-shadow: " + r.props["box-shadow"] + ";\n";
      r.extra.forEach(e => { body += "  " + e + "\n"; });
      if (body.trim()) out.push(r.selector + " {\n" + body + "}");
    });
    return out.join("\n\n");
  }

  /* ---------- 提交变更 ---------- */
  function regen() {
    const css = serializeRules();
    if (window.App && window.App.setCss) window.App.setCss(css);
    const preview = $("#code-css-textarea");
    if (preview) preview.value = css;
    const src = $("#css-source-textarea");
    if (src && src.value !== css) src.value = css;
  }

  /* ---------- 控件渲染 ---------- */
  function groupHeader(name) {
    const h = document.createElement("div");
    h.className = "css-group";
    h.textContent = name;
    return h;
  }

  function controlRow(label, innerHtml) {
    const row = document.createElement("div");
    row.className = "css-prop";
    const lb = document.createElement("label");
    lb.textContent = label;
    row.appendChild(lb);
    const ctl = document.createElement("div");
    ctl.className = "css-ctl";
    ctl.innerHTML = innerHtml;
    row.appendChild(ctl);
    return row;
  }

  function buildControl(p, rule) {
    const val = rule.props[p.key] || "";
    if (p.type === "select") {
      const opts = p.options.map(o => {
        const sel = (o === val) ? " selected" : "";
        return '<option value="' + o.replace(/"/g, "&quot;") + '"' + sel + '>' + (o || "（默认）") + "</option>";
      }).join("");
      return controlRow(p.label, '<select data-k="' + p.key + '">' + opts + "</select>");
    }
    if (p.type === "color") {
      const hex = /^#[0-9a-fA-F]{3,8}$/.test(val) ? val : "#000000";
      return controlRow(p.label, '<input type="color" data-k="' + p.key + '" class="css-color" value="' + hex + '"><input type="text" data-k="' + p.key + '" data-hex="1" class="css-hex" value="' + (val || "") + '" placeholder="#000000">');
    }
    if (p.type === "slider") {
      const step = p.step !== undefined ? p.step : 1;
      const numVal = val ? parseFloat(val) : p.min;
      const shown = (numVal % 1 !== 0) ? numVal.toFixed(1) : numVal;
      return controlRow(p.label,
        '<input type="range" data-k="' + p.key + '" data-slider="1" min="' + p.min + '" max="' + p.max + '" step="' + step + '" value="' + numVal + '">' +
        '<input type="number" data-k="' + p.key + '" data-num="1" min="' + p.min + '" max="' + p.max + '" step="' + step + '" value="' + shown + '">' +
        '<span class="css-val" data-unit="' + (p.unit || "") + '">' + (val ? (shown + p.unit) : "") + "</span>");
    }
    if (p.type === "text") {
      return controlRow(p.label, '<input type="text" data-k="' + p.key + '" class="css-text" value="' + val.replace(/"/g, "&quot;") + '" placeholder="' + (p.placeholder || "") + '">');
    }
    return controlRow(p.label, "<span></span>");
  }

  function buildShadowControl(rule) {
    const v = rule.props["box-shadow"];
    let enabled = !!v;
    let color = "#000000", x = 0, y = 0, blur = 8;
    if (v) {
      const m = v.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))\s*(-?\d+)px\s+(-?\d+)px\s+(-?\d+)px/);
      if (m) { color = m[1]; x = parseInt(m[2], 10); y = parseInt(m[3], 10); blur = parseInt(m[4], 10); }
    }
    return controlRow("阴影",
      '<label class="mini-switch"><input type="checkbox" data-shadow-on="1"' + (enabled ? " checked" : "") + "><span></span></label>" +
      '<input type="color" data-shadow="color" class="css-color" value="' + color + '">' +
      '<input type="range" data-shadow="x" min="-60" max="60" step="1" value="' + x + '" title="水平偏移">' +
      '<input type="range" data-shadow="y" min="-60" max="60" step="1" value="' + y + '" title="垂直偏移">' +
      '<input type="range" data-shadow="blur" min="0" max="100" step="1" value="' + blur + '" title="模糊">' +
      '<span class="css-val css-shadow-val"></span>');
  }

  function renderControls() {
    const ctl = $("#css-controls");
    if (!ctl) return;
    ctl.innerHTML = "";
    const rule = getRule(currentSelector);
    if (!rule) return;
    let group = null;
    PROP_META.forEach(p => {
      if (p.group !== group) {
        group = p.group;
        ctl.appendChild(groupHeader(group));
      }
      ctl.appendChild(buildControl(p, rule));
    });
    ctl.appendChild(groupHeader("效果"));
    ctl.appendChild(buildShadowControl(rule));
  }

  function renderSelectorList() {
    const list = $("#css-selector-list");
    if (!list) return;
    list.innerHTML = "";
    rules.forEach(r => {
      const item = document.createElement("div");
      item.className = "css-sel-item" + (r.selector === currentSelector ? " on" : "");
      item.textContent = r.selector;
      item.dataset.selector = r.selector;
      item.addEventListener("click", () => {
        currentSelector = r.selector;
        renderSelectorList();
        renderControls();
        $("#css-sel-title").textContent = r.selector;
      });
      list.appendChild(item);
    });
  }

  function getRule(sel) {
    for (let i = 0; i < rules.length; i++) {
      if (rules[i].selector === sel) return rules[i];
    }
    const r = { selector: sel, props: {}, extra: [] };
    rules.push(r);
    return r;
  }

  /* ---------- 控件事件 ---------- */
  function bindControls() {
    const ctl = $("#css-controls");
    if (!ctl || ctl.dataset.bound) return;
    ctl.dataset.bound = "1";
    ctl.addEventListener("input", (e) => {
      const rule = getRule(currentSelector);
      if (!rule) return;
      const t = e.target;
      const k = t.dataset.k;
      if (!k) return;
      if (t.dataset.slider === "1" || t.dataset.num === "1") {
        const p = PROP_META.find(x => x.key === k);
        const raw = t.value;
        if (p && p.unit) rule.props[k] = raw + p.unit;
        else rule.props[k] = raw;
        // 联动滑块与数字框
        const pair = (t.dataset.slider === "1") ? ctl.querySelector('[data-num="1"][data-k="' + k + '"]') : ctl.querySelector('[data-slider="1"][data-k="' + k + '"]');
        if (pair && pair.value !== raw) pair.value = raw;
        const span = t.parentElement.querySelector(".css-val");
        if (span) span.textContent = rule.props[k];
      } else if (t.dataset.hex === "1") {
        if (/^#[0-9a-fA-F]{3,8}$/.test(t.value)) {
          rule.props[k] = t.value;
          const color = ctl.querySelector('input[type="color"][data-k="' + k + '"]');
          if (color) color.value = t.value;
        } else if (!t.value) {
          delete rule.props[k];
        }
      } else {
        if (t.value) rule.props[k] = t.value;
        else delete rule.props[k];
        if (t.type === "color") {
          const hex = ctl.querySelector('[data-hex="1"][data-k="' + k + '"]');
          if (hex) hex.value = t.value;
        }
      }
      renderSelectorList();
      regen();
    });
    ctl.addEventListener("change", (e) => {
      const rule = getRule(currentSelector);
      if (!rule) return;
      const t = e.target;
      if (t.dataset.shadowOn === "1") {
        if (t.checked) applyShadow(rule);
        else delete rule.props["box-shadow"];
        regen();
        return;
      }
      if (t.dataset.shadow) {
        applyShadow(rule);
        regen();
        return;
      }
      const k = t.dataset.k;
      if (!k) return;
      if (t.type === "color") {
        rule.props[k] = t.value;
        const hex = ctl.querySelector('[data-hex="1"][data-k="' + k + '"]');
        if (hex) hex.value = t.value;
        regen();
      }
    });
  }

  function applyShadow(rule) {
    const on = $("#css-controls [data-shadow-on='1']");
    if (!on || !on.checked) { delete rule.props["box-shadow"]; return; }
    const color = ($("#css-controls [data-shadow='color']") || {}).value || "#000000";
    const x = parseInt(($("#css-controls [data-shadow='x']") || {}).value || "0", 10);
    const y = parseInt(($("#css-controls [data-shadow='y']") || {}).value || "0", 10);
    const blur = parseInt(($("#css-controls [data-shadow='blur']") || {}).value || "0", 10);
    rule.props["box-shadow"] = color + " " + x + "px " + y + "px " + blur + "px";
    const span = $("#css-controls .css-shadow-val");
    if (span) span.textContent = rule.props["box-shadow"];
  }

  /* ---------- 对外接口 ---------- */
  function init() {
    if (initialized) return;
    initialized = true;
    const css = getState().css || "";
    rules = parseCss(css);
    currentSelector = rules[0] ? rules[0].selector : "body";
    bindControls();
    renderSelectorList();
    renderControls();
    $("#css-sel-title").textContent = currentSelector;
    const preview = $("#code-css-textarea");
    if (preview) preview.value = serializeRules();
  }

  function loadFromSource(css) {
    rules = parseCss(css || "");
    if (!rules.length) rules.push({ selector: "body", props: {}, extra: [] });
    if (!rules.some(r => r.selector === currentSelector)) currentSelector = rules[0].selector;
    renderSelectorList();
    renderControls();
    $("#css-sel-title").textContent = currentSelector;
  }

  function addSelector(sel) {
    const s = (sel || "").trim();
    if (!s) return false;
    if (rules.some(r => r.selector === s)) { currentSelector = s; }
    else { rules.push({ selector: s, props: {}, extra: [] }); currentSelector = s; }
    renderSelectorList();
    renderControls();
    $("#css-sel-title").textContent = s;
    return true;
  }

  return { init: init, loadFromSource: loadFromSource, addSelector: addSelector, serialize: serializeRules, regen: regen };
})();
