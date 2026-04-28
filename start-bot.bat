@echo off
:: MoneyMove Telegram Bot Autostart
:: Wird beim PC-Start ausgeführt

cd /d "C:\Users\Hacer\.openclaw\workspace\trading-bot"

:: Bot starten im Hintergrund
start /B "" node bot-simple.js

:: Log schreiben
echo %date% %time% - MoneyMove Bot gestartet >> "C:\Users\Hacer\.openclaw\workspace\trading-bot\bot-autostart.log"
