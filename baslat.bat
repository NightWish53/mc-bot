@echo off
title MC Bot - Baslat
cd /d "%~dp0"

if not exist ".env" (
    echo [BILGI] .env dosyasi bulunamadi! Otomatik olarak .env.example'dan olusturuluyor...
    copy .env.example .env >nul
    echo.
    echo Lutfen simdi olusan .env dosyasini not defteri ile acin ve token/ayar bilgilerinizi doldurun.
    echo Bilgileri doldurduktan sonra bu pencereyi kapatip baslat.bat dosyasini TEKRAR CALISTIRIN.
    echo.
    pause
    exit
)

echo [1/4] Eski bot surecleri kapatiliyor...
powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Gereksinimler yukleniyor (Ilk acilista uzun surebilir)...
call pnpm install

echo [3/4] Veritabani ve slash komutlari esitleniyor...
call npx prisma db push
call pnpm deploy-commands

echo [4/4] Bot baslatiliyor...
echo     (Durdurmak icin bu pencereyi kapat veya Ctrl+C)
echo.
pnpm dev

echo.
echo Bot kapandi. Pencereden cikmak icin bir tusa basin.
pause >nul