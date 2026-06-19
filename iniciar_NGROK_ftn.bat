@echo off
title Iniciando Tunel ngrok
color 0b

:: --- CONFIGURACIÓN ---
ngrok config add-authtoken 38K4xxiC1ySO5wylkYKBrsuln0g_2iHaZy4xT95keRfZkwRCy
set PUERTO=3000
set PROTOCOLO=http
:: ---------------------

echo ===========================================
echo   Iniciando tunel ngrok en el puerto %PUERTO%
echo ===========================================

ngrok %PROTOCOLO% %PUERTO%

pause