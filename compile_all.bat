@echo off
REM --- 一键编译所有模式的批处理脚本 ---
REM --- (已根据您的自定义文件名更新) ---

REM --- 请在这里配置您的PyInstaller路径 ---
SET PYINSTALLER_PATH="G:\ComfyUI_windows_portable\python_embeded\Scripts\pyinstaller.exe"

REM --- 清理旧的编译文件 ---
echo 清理旧的编译文件...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
del /f /q *.spec

echo.
echo =========================================
echo 开始编译...
echo =========================================
echo.

REM --- 编译 1: 不替换, 不删除 ---
echo [1/3] 正在编译: 不替换图像不删除txt...
call %PYINSTALLER_PATH% --onefile --name "合并图像和txt(不替换不删除)" "合并图像和txt@不替换图像不删除txt.py"
echo.

REM --- 编译 2: 替换, 不删除 ---
echo [2/3] 正在编译: 替换图像不删除txt...
call %PYINSTALLER_PATH% --onefile --name "合并图像和txt(替换不删除)" "合并图像和txt@替换图像不删除txt.py"
echo.

REM --- 编译 3: 替换, 删除 ---
echo [3/3] 正在编译: 替换图像删除txt...
call %PYINSTALLER_PATH% --onefile --name "合并图像和txt(替换删除)" "合并图像和txt@替换图像删除txt.py"
echo.

echo =========================================
echo 所有编译任务已完成！
echo 请在 'dist' 文件夹中查看生成的.exe文件。
echo =========================================
echo.

REM --- 编译完成后自动删除垃圾文件 ---
if exist build rmdir /s /q build
del /f /q *.spec

pause