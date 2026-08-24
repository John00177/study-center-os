@echo off
setlocal enabledelayedexpansion

set "PG_BIN=%USERPROFILE%\tools\pg\pgsql\bin"
set "PG_DATA=%USERPROFILE%\tools\pg\data"
set "PG_LOG=%USERPROFILE%\tools\pg\logfile"
set "PG_PORT=5433"

set "REDIS_DIR=%USERPROFILE%\tools\redis"
set "REDIS_PORT=6379"

echo Checking PostgreSQL...
"%PG_BIN%\pg_ctl.exe" -D "%PG_DATA%" status >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo   PostgreSQL is already running.
) else (
    echo   Starting PostgreSQL on port %PG_PORT%...
    "%PG_BIN%\pg_ctl.exe" -D "%PG_DATA%" -l "%PG_LOG%" -o "-p %PG_PORT%" start
    if !ERRORLEVEL! EQU 0 (
        echo   PostgreSQL started.
    ) else (
        echo   ERROR: PostgreSQL failed to start. Check "%PG_LOG%" for details.
    )
)

echo.
echo Checking Redis...
"%REDIS_DIR%\redis-cli.exe" -p %REDIS_PORT% ping >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo   Redis is already running.
) else (
    echo   Starting Redis on port %REDIS_PORT%...
    rem This Windows Redis build does not support --daemonize (it just runs
    rem in the foreground and would hang this script), so launch it detached
    rem with `start /B` instead.
    start "crm-os-redis" /B "%REDIS_DIR%\redis-server.exe" --port %REDIS_PORT%
    ping -n 3 127.0.0.1 >nul
    "%REDIS_DIR%\redis-cli.exe" -p %REDIS_PORT% ping >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo   Redis started.
    ) else (
        echo   ERROR: Redis failed to start.
    )
)

echo.
echo === Status ===
"%PG_BIN%\pg_ctl.exe" -D "%PG_DATA%" status
"%REDIS_DIR%\redis-cli.exe" -p %REDIS_PORT% ping

endlocal
