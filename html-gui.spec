# -*- mode: python ; coding: utf-8 -*-
# html-gui PyInstaller 打包配置
# 使用：pyinstaller html-gui.spec（在项目根目录执行）

block_cipher = None

datas = [
    ('index.html', '.'),
    ('css', 'css'),
    ('js', 'js'),
    ('vendor', 'vendor'),
]

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='html-gui',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    name='html-gui',
)
