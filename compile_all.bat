@echo off
REM --- һ����������ģʽ��������ű� ---
REM --- (�Ѹ��������Զ����ļ�������) ---

REM --- ����������������PyInstaller·�� ---
SET PYINSTALLER_PATH="G:\ComfyUI_windows_portable\python_embeded\Scripts\pyinstaller.exe"

REM --- ����ɵı����ļ� ---
echo ����ɵı����ļ�...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
del /f /q *.spec

echo.
echo =========================================
echo ��ʼ����...
echo =========================================
echo.

REM --- ���� 1: ���滻, ��ɾ�� ---
echo [1/3] ���ڱ���: ���滻ͼ��ɾ��txt...
call %PYINSTALLER_PATH% --onefile --name "�ϲ�ͼ���txt(���滻��ɾ��)" "�ϲ�ͼ���txt@���滻ͼ��ɾ��txt.py"
echo.

REM --- ���� 2: �滻, ��ɾ�� ---
echo [2/3] ���ڱ���: �滻ͼ��ɾ��txt...
call %PYINSTALLER_PATH% --onefile --name "�ϲ�ͼ���txt(�滻��ɾ��)" "�ϲ�ͼ���txt@�滻ͼ��ɾ��txt.py"
echo.

REM --- ���� 3: �滻, ɾ�� ---
echo [3/3] ���ڱ���: �滻ͼ��ɾ��txt...
call %PYINSTALLER_PATH% --onefile --name "�ϲ�ͼ���txt(�滻ɾ��)" "�ϲ�ͼ���txt@�滻ͼ��ɾ��txt.py"
echo.

echo =========================================
echo ���б�����������ɣ�
echo ���� 'dist' �ļ����в鿴���ɵ�.exe�ļ���
echo =========================================
echo.

REM --- ������ɺ��Զ�ɾ�������ļ� ---
if exist build rmdir /s /q build
del /f /q *.spec

pause