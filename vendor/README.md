# vendor 第三方库说明

本目录存放 html-gui 设计器依赖的第三方前端库，均为官方发行版原样拷贝，未做本地修改。

## Blockly

- 路径：`vendor/blockly/`
- 文件：
  - `blockly_compressed.js` — 核心（MIT）
  - `blocks_compressed.js` — 标准积木（MIT）
  - `javascript_compressed.js` — JavaScript 代码生成器（MIT）
  - `msg/zh-hans.js` — 简体中文语言包
  - `media/` — 音效与图标资源
- 来源：Google Blockly 官方构建（Blockly 11.2.2，压缩包内 VERSION 常量确认），官方仓库：https://github.com/google/blockly
- 许可证：Apache-2.0（Blockly 主工程为 Apache-2.0，core 压缩包内含对应 license 声明）
- 升级提示：替换压缩包后请跑 `node -e "..."` 或浏览器冒烟，确认 `Blockly.Workspace` / 生成器与 code-editor.js 兼容。

## CodeMirror

- 路径：`vendor/codemirror/`
- 文件：
  - `codemirror.js` / `codemirror.css` — 核心（MIT）
  - `mode/css/css.js` — CSS 高亮模式（MIT）
  - `theme/darcula.css` — 深色主题（MIT）
- 来源：CodeMirror 5.x 官方构建（文件头声明 `https://codemirror.net/5`），官方仓库：https://github.com/codemirror/codemirror5
- 许可证：MIT

## 说明

- 请勿将压缩包解压后的目录结构打散；index.html 依赖上述相对路径。
- 第三方库版本升级后，建议同步更新 README 与 vendor/README.md 记录。
