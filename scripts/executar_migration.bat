@echo off
REM Script para adicionar coluna tipo_pessoa na tabela faturamentos
REM Execute este arquivo no Windows

echo ============================================
echo   Migration: Adicionar tipo_pessoa
echo ============================================
echo.

REM Configurações do banco (ajuste conforme necessário)
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=gerencie_db
set PGUSER=postgres

echo Conectando ao banco de dados %PGDATABASE%...
echo.

REM Executar SQL
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f "%~dp0adicionar_tipo_pessoa_faturamento.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Migration executada com sucesso!
    echo.
) else (
    echo.
    echo ❌ Erro ao executar migration
    echo.
)

pause
