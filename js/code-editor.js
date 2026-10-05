/* =====================================================
   html-gui - 代码编辑器模块
   CSS 编辑器（CodeMirror 5，代码式）+ JS 编辑器（Blockly 积木式）
   ===================================================== */
"use strict";

window.WUIS_CODE_EDITOR = (function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

  let cssSourceEditor = null; // CodeMirror 实例（CSS 源码模式）
  let cssMode = "visual";     // CSS 编辑模式：'visual' | 'source'
  let jsViewer = null;       // CodeMirror 实例（JS 预览，只读）
  let blocklyWorkspace = null;
  let blocklyReady = false;

  const TOOLBOX_XML = `
<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display:none">
  <category name="事件" colour="#a05a2c">
    <block type="wuis_log"></block>
    <block type="wuis_alert"></block>
    <block type="wuis_delay"></block>
    <block type="wuis_print"></block>
  </category>
  <category name="逻辑" colour="#5b80a5">
    <block type="controls_if"></block>
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_negate"></block>
    <block type="logic_boolean"></block>
  </category>
  <category name="循环" colour="#5ba55b">
    <block type="controls_repeat_ext"></block>
    <block type="controls_whileUntil"></block>
    <block type="controls_for"></block>
    <block type="controls_flow_statements"></block>
  </category>
  <category name="数学" colour="#5b67a5">
    <block type="math_number"></block>
    <block type="math_arithmetic"></block>
    <block type="math_single"></block>
    <block type="math_round"></block>
    <block type="math_number_property"></block>
  </category>
  <category name="文本" colour="#a55b80">
    <block type="text"></block>
    <block type="text_join"></block>
    <block type="text_length"></block>
    <block type="text_isEmpty"></block>
    <block type="text_print"></block>
  </category>
  <category name="变量" colour="#a5925b" custom="VARIABLE"></category>
  <category name="函数" colour="#995ba5" custom="PROCEDURE"></category>
</xml>`;

  const SAMPLE_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="wuis_log" id="smp1" x="40" y="40">
    <value name="TEXT">
      <block type="text" id="smp2"><field name="TEXT">页面加载完成</field></block>
    </value>
  </block>
  <block type="wuis_alert" id="smp3" x="40" y="90">
    <value name="TEXT">
      <block type="text" id="smp4"><field name="TEXT">欢迎使用 html-gui！</field></block>
    </value>
  </block>
  <block type="wuis_delay" id="smp5" x="40" y="150">
    <value name="MS">
      <block type="math_number" id="smp6"><field name="NUM">2000</field></block>
    </value>
    <statement name="DO">
      <block type="wuis_log" id="smp7">
        <value name="TEXT">
          <block type="text" id="smp8"><field name="TEXT">2 秒后执行</field></block>
        </value>
      </block>
    </statement>
  </block>
</xml>`;

  /* ---------- 自定义积木 ---------- */
  function defineCustomBlocks() {
    if (!window.Blockly || blocklyReady) return;
    const B = Blockly.Blocks;
    // Blockly 11 生成器注册表在 JavaScript.forBlock（兼容旧版直接挂在 JavaScript 上）
    const J = (Blockly.JavaScript.forBlock) || Blockly.JavaScript;

    B["wuis_log"] = {
      init: function () {
        this.appendValueInput("TEXT").setCheck("String").appendField("输出日志");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip("向浏览器控制台输出一条日志");
      }
    };
    J["wuis_log"] = function (block) {
      const v = Blockly.JavaScript.valueToCode(block, "TEXT", Blockly.JavaScript.ORDER_NONE) || "''";
      return "console.log(" + v + ");\n";
    };

    B["wuis_alert"] = {
      init: function () {
        this.appendValueInput("TEXT").setCheck("String").appendField("弹出提示");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip("弹出一个提示对话框");
      }
    };
    J["wuis_alert"] = function (block) {
      const v = Blockly.JavaScript.valueToCode(block, "TEXT", Blockly.JavaScript.ORDER_NONE) || "''";
      return "alert(" + v + ");\n";
    };

    B["wuis_print"] = {
      init: function () {
        this.appendValueInput("TEXT").setCheck("String").appendField("写入页面");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip("将文本追加写入页面底部（document.write 会在导出页面生效）");
      }
    };
    J["wuis_print"] = function (block) {
      const v = Blockly.JavaScript.valueToCode(block, "TEXT", Blockly.JavaScript.ORDER_NONE) || "''";
      return "document.write(" + v + ");\n";
    };

    B["wuis_delay"] = {
      init: function () {
        this.appendValueInput("MS").setCheck("Number").appendField("延时");
        this.appendDummyInput().appendField("毫秒");
        this.appendStatementInput("DO").appendField("执行");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip("等待指定毫秒数后执行内部代码");
      }
    };
    J["wuis_delay"] = function (block) {
      const ms = Blockly.JavaScript.valueToCode(block, "MS", Blockly.JavaScript.ORDER_NONE) || "0";
      const stmt = Blockly.JavaScript.statementToCode(block, "DO");
      return "setTimeout(function(){\n" + stmt + "}, " + ms + ");\n";
    };

    blocklyReady = true;
  }

  /* ---------- 从 App 读取/写入状态 ---------- */
  function st() {
    return (window.App && window.App.getScriptState) ? window.App.getScriptState() : { css: "", jsCode: "", jsXml: "" };
  }

  function syncCssFromSource() {
    if (!cssSourceEditor || cssMode !== "source") return;
    const v = cssSourceEditor.getValue();
    if (window.App && window.App.setCss) window.App.setCss(v);
    if (window.WUIS_CSS_VISUAL) window.WUIS_CSS_VISUAL.loadFromSource(v);
    const preview = $("#code-css-textarea");
    if (preview) preview.value = v;
  }
  function syncCssToSource() {
    if (!cssSourceEditor) return;
    const v = st().css || "";
    if (cssSourceEditor.getValue() !== v) cssSourceEditor.setValue(v);
  }
  function syncCssToVisual() {
    if (!window.WUIS_CSS_VISUAL) return;
    window.WUIS_CSS_VISUAL.loadFromSource(st().css || "");
  }

  function generateJs() {
    if (!blocklyWorkspace || !window.Blockly) return "";
    const code = Blockly.JavaScript.workspaceToCode(blocklyWorkspace);
    const xml = Blockly.Xml.workspaceToDom(blocklyWorkspace);
    const xmlText = Blockly.Xml.domToText(xml);
    if (window.App && window.App.setJs) window.App.setJs(code, xmlText);
    if (jsViewer && jsViewer.getValue() !== code) jsViewer.setValue(code || "// 在工作区拼装积木后，自动生成 JavaScript 代码");
    return code;
  }

  /* Blockly 11 起 textToDom 迁移到 utils.xml，兼容旧版 */
  function textToDomCompat(text) {
    if (Blockly.utils && Blockly.utils.xml && typeof Blockly.utils.xml.textToDom === "function") {
      return Blockly.utils.xml.textToDom(text);
    }
    return Blockly.Xml.textToDom(text);
  }

  /* ---------- 初始化 ---------- */
  function initCssEditor() {
    if (cssSourceEditor) return;
    cssSourceEditor = CodeMirror.fromTextArea($("#css-source-textarea"), {
      mode: "css",
      theme: "darcula",
      lineNumbers: true,
      lineWrapping: true,
      indentUnit: 2,
      tabSize: 2
    });
    cssSourceEditor.on("change", syncCssFromSource);
    syncCssToSource();
    if (window.WUIS_CSS_VISUAL) window.WUIS_CSS_VISUAL.init();
  }

  function switchCssMode(mode) {
    cssMode = (mode === "source") ? "source" : "visual";
    $$(".css-mode-seg .seg-btn").forEach(b => {
      b.classList.toggle("on", b.dataset.cssmode === cssMode);
    });
    const visWrap = $("#css-visual-wrap");
    const srcWrap = $("#css-source-wrap");
    const preview = $("#code-css-textarea");
    const previewHead = $("#css-editor-pane .css-preview-head");
    if (visWrap) visWrap.classList.toggle("hidden", cssMode !== "visual");
    if (srcWrap) srcWrap.classList.toggle("hidden", cssMode !== "source");
    if (preview) preview.classList.toggle("hidden", cssMode !== "visual");
    if (previewHead) previewHead.classList.toggle("hidden", cssMode !== "visual");
    if (cssMode === "source") {
      syncCssToSource();
      if (cssSourceEditor) setTimeout(() => cssSourceEditor.refresh(), 0);
    } else {
      syncCssToVisual();
    }
  }

  function initJsEditor() {
    if (blocklyWorkspace) return;
    defineCustomBlocks();
    // 中文界面（zh-hans.js 已提前加载）
    if (window.Blockly && Blockly.setLocale && Blockly.Msg) {
      try { Blockly.setLocale(Blockly.Msg); } catch (e) { console.warn("Blockly locale", e); }
    }
    blocklyWorkspace = Blockly.inject($("#blockly-div"), {
      toolbox: TOOLBOX_XML,
      media: "vendor/blockly/media/",
      zoom: { controls: true, wheel: true, startScale: 0.85 },
      trashcan: true,
      grid: { spacing: 22, length: 3, colour: "#3a3c45", snap: false },
      move: { scrollbars: true, drag: true, wheel: true }
    });
    blocklyWorkspace.addChangeListener((e) => {
      if (!e || e.isUiEvent || e.type === Blockly.Events.BLOCK_MOVE) return;
      generateJs();
    });
    blocklyWorkspace.addChangeListener((e) => {
      if (e && (e.type === Blockly.Events.BLOCK_MOVE || e.type === Blockly.Events.BLOCK_CREATE)) {
        setTimeout(() => Blockly.svgResize(blocklyWorkspace), 0);
      }
    });
    // 恢复上次工作区
    const xmlText = st().jsXml;
    if (xmlText && xmlText.indexOf("<xml") !== -1) {
      try {
        const dom = textToDomCompat(xmlText);
        Blockly.Xml.domToWorkspace(dom, blocklyWorkspace);
      } catch (err) { console.warn("恢复积木工作区失败", err); }
    }
    generateJs();
    window.setTimeout(() => Blockly.svgResize(blocklyWorkspace), 100);
  }

  function initJsViewer() {
    if (jsViewer) return;
    jsViewer = CodeMirror.fromTextArea($("#code-js-output"), {
      mode: "javascript",
      theme: "darcula",
      lineNumbers: true,
      lineWrapping: true,
      readOnly: true
    });
    jsViewer.setValue("// 在工作区拼装积木后，自动生成 JavaScript 代码");
  }

  function resizeAll() {
    if (blocklyWorkspace) Blockly.svgResize(blocklyWorkspace);
  }

  /* ---------- 打开 / 关闭 / 切换 ---------- */
  function open(tab) {
    const ov = $("#code-overlay");
    if (!ov) return;
    ov.classList.remove("hidden");
    initCssEditor();
    initJsViewer();
    if (tab === "js") {
      initJsEditor();
    }
    if (cssMode === "source") syncCssToSource();
    else syncCssToVisual();
    if (tab === "js") generateJs();
    switchTab(tab || "css");
    resizeAll();
  }

  function close() {
    const ov = $("#code-overlay");
    if (ov) ov.classList.add("hidden");
  }

  function switchTab(tab) {
    const cssPane = $("#css-editor-pane");
    const jsPane = $("#js-editor-pane");
    if (!cssPane || !jsPane) return;
    const isCss = tab !== "js";
    cssPane.classList.toggle("active", isCss);
    jsPane.classList.toggle("active", !isCss);
    $$("#code-modal .code-tab").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === tab);
    });
    if (isCss) syncCssToVisual();
    else {
      initJsEditor();
      generateJs();
      resizeAll();
    }
  }

  function clearWorkspace() {
    if (!blocklyWorkspace) return;
    if (!confirm("确定清空整个积木工作区吗？")) return;
    blocklyWorkspace.clear();
    generateJs();
  }

  function loadSample() {
    if (!blocklyWorkspace) return;
    blocklyWorkspace.clear();
    const dom = textToDomCompat(SAMPLE_XML);
    Blockly.Xml.domToWorkspace(dom, blocklyWorkspace);
    generateJs();
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    $("#tb-code").addEventListener("click", () => open("css"));
    $("#code-close").addEventListener("click", close);
    $("#code-overlay").addEventListener("mousedown", (e) => {
      if (e.target.id === "code-overlay") close();
    });
    $$("#code-modal .code-tab").forEach(b => {
      b.addEventListener("click", () => switchTab(b.dataset.tab));
    });
    $$(".css-mode-seg .seg-btn").forEach(b => {
      b.addEventListener("click", () => switchCssMode(b.dataset.cssmode));
    });
    const addSelBtn = $("#css-add-selector");
    if (addSelBtn) {
      addSelBtn.addEventListener("click", () => {
        $("#css-new-selector-row").classList.remove("hidden");
        $("#css-new-selector").focus();
      });
    }
    const newOk = $("#css-new-ok");
    if (newOk) {
      newOk.addEventListener("click", () => {
        const inp = $("#css-new-selector");
        const ok = window.WUIS_CSS_VISUAL && window.WUIS_CSS_VISUAL.addSelector(inp ? inp.value : "");
        if (ok) {
          $("#css-new-selector-row").classList.add("hidden");
          if (inp) inp.value = "";
        }
      });
    }
    const cssCopy = $("#css-copy");
    if (cssCopy) {
      cssCopy.addEventListener("click", () => {
        const v = $("#code-css-textarea") ? $("#code-css-textarea").value : "";
        if (!v) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(v).then(() => { cssCopy.textContent = "已复制"; setTimeout(() => { cssCopy.textContent = "复制"; }, 1200); });
        }
      });
    }
    $("#js-clear").addEventListener("click", clearWorkspace);
    $("#js-sample").addEventListener("click", loadSample);
    $("#js-gen").addEventListener("click", () => {
      generateJs();
      const code = st().jsCode || "";
      const lines = code.split("\n").filter(l => l.trim()).length;
      const msg = lines ? "已生成 " + lines + " 行 JavaScript，导出 HTML 时自动嵌入" : "工作区为空，请先拖入积木";
      const s = $("#js-status");
      if (s) s.textContent = msg;
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#code-overlay").classList.contains("hidden")) close();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bind();
  });

  /* ---------- 快捷键（Python 菜单调用 App.action） ---------- */
  window.WUIS_CODE_EDITOR = { open: open, close: close, resize: resizeAll };
  return window.WUIS_CODE_EDITOR;
})();
