@echo off
echo ========================================
echo Criando banco de dados gerencie_db
echo ========================================
echo.

REM Tenta criar o banco usando vision_user
psql -U vision_user -d postgres -c "CREATE DATABASE gerencie_db OWNER vision_user ENCODING 'UTF8';"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Banco criado com sucesso!
    echo ========================================
    echo.
    echo Agora execute: npm run dev
    echo.
) else (
    echo.
    echo ========================================
    echo Erro ao criar banco!
    echo ========================================
    echo.
    echo Tente criar pela interface do pgAdmin4
    echo.
)

pause
