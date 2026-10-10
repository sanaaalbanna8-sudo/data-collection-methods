@echo off
cd /d "%~dp0"
start "طرق جمع البيانات" /MIN cmd /c "timeout /t 1 /nobreak >nul & start http://127.0.0.1:8755/"
python -m http.server 8755
