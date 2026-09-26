@echo off
REM Angebots-UI lokal starten. Einmalig vorher "npm install" in diesem Ordner
REM ausfuehren, falls noch nicht geschehen.
REM Laeuft bewusst nur auf localhost (127.0.0.1) auf DIESEM PC -- fuer den
REM NAS-Ordner-Verbinden-Button ist das noetig (Browser erlauben den Datei-
REM Zugriff nur ueber localhost/HTTPS, nicht ueber eine normale Netzwerk-IP).
REM Gemeinsame Angebote laufen ueber den verbundenen NAS-Ordner, nicht ueber
REM einen zentralen Server.

chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules" (
    echo ========================================
    echo Erste Ausfuehrung: Abhaengigkeiten werden installiert...
    echo ========================================
    call npm install
    if errorlevel 1 (
        echo.
        echo FEHLER: npm install fehlgeschlagen. Ist Node.js installiert?
        echo Download: https://nodejs.org
        pause
        exit /b 1
    )
)

echo ========================================
echo Angebots-UI wird gestartet...
echo Browser oeffnet sich automatisch unter http://localhost:5173
echo Zum Beenden: dieses Fenster schliessen oder Strg+C
echo ========================================
echo.

start "" "http://localhost:5173"
call npm run dev

pause
