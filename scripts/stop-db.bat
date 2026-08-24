@echo off
setlocal enabledelayedexpansion

set "PG_BIN=%USERPROFILE%\tools\pg\pgsql\bin"
set "PG_DATA=%USERPROFILE%\tools\pg\data"

set "REDIS_DIR=%USERPROFILE%\tools\redis"
set "REDIS_PORT=6379"

echo Stopping PostgreSQL...
"%PG_BIN%\pg_ctl.exe" -D "%PG_DATA%" stop
if !ERRORLEVEL! EQU 0 (
    echo   PostgreSQL stopped.
) else (
    echo   PostgreSQL was not running, or failed to stop cleanly.
)

echo.
echo Stopping Redis...
"%REDIS_DIR%\redis-cli.exe" -p %REDIS_PORT% shutdown nosave >nul 2>&1
ping -n 2 127.0.0.1 >nul
"%REDIS_DIR%\redis-cli.exe" -p %REDIS_PORT% ping >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo   Redis stopped.
) else (
    echo   Redis was not running, or failed to stop via redis-cli.
)

echo.
echo Done.
endlocal
