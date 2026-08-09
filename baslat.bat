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

echo [1/3] Gereksinimler yukleniyor (Ilk acilista uzun surebilir)...
call pnpm install

echo [2/3] Veritabani ve slash komutlari esitleniyor...
call npx prisma db push
call pnpm deploy-commands

echo [3/3] Proje derleniyor ve bot baslatiliyor...
echo     (Durdurmak icin bu pencereyi kapat veya Ctrl+C)
echo.
call pnpm build
pnpm start

echo.
echo Bot kapandi. Pencereden cikmak icin bir tusa basin.
pause >nul