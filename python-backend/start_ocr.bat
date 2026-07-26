@echo off
title Comic OCR Pro Server
echo ==============================================
echo    Comic OCR Pro - AI Server Starting...
echo ==============================================
echo.
cd /d "%~dp0"
python ocr_pro.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server failed to start. Please check if Python and EasyOCR are installed correctly.
    pause
)
pause
