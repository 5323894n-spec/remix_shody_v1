@echo off
chcp 65001 >nul
title Учёт сходов с линии
cd /d "%~dp0"

echo ============================================================
echo   Программа учёта сходов с линии пассажирского транспорта
echo ============================================================
echo.

REM Проверяем, установлены ли библиотеки. Если нет — ставим один раз.
python -c "import streamlit" 2>nul
if errorlevel 1 (
    echo Первый запуск: устанавливаю необходимые библиотеки...
    echo Это может занять пару минут. Требуется интернет.
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    echo.
)

echo Запускаю программу. Откроется окно браузера.
echo Чтобы закрыть программу — закройте это чёрное окно.
echo.
python -m streamlit run app.py

pause
