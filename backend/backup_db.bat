@echo off
:: =========================================================================
:: Clinic Management Platform - Automated MongoDB Backup Script (Windows)
:: Configure this script in Windows Task Scheduler for daily execution.
:: =========================================================================

:: Configuration
set DB_URI=mongodb+srv://<username>:<password>@<cluster_host>/clinic_management
set BACKUP_DIR=C:\Backups\ClinicDB
set KEEP_DAYS=7

:: Timestamp generator (format: YYYY-MM-DD_HH-MM-SS)
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set mydate=%%c-%%a-%%b
for /f "tokens=1-3 delims=:. " %%a in ('time /t') do set mytime=%%a-%%b-%%c
set TIMESTAMP=%mydate%_%mytime%
set TIMESTAMP=%TIMESTAMP: =0%

echo =====================================================================
echo Starting MongoDB database backup...
echo Timestamp: %TIMESTAMP%
echo Output folder: %BACKUP_DIR%\backup_%TIMESTAMP%
echo =====================================================================

if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
)

:: Run mongodump (Ensure MongoDB Database Tools are installed and added to PATH)
mongodump --uri="%DB_URI%" --out="%BACKUP_DIR%\backup_%TIMESTAMP%"

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Database backup saved successfully.
) else (
    echo [ERROR] Backup failed. Verify your connection settings and MongoDB URI.
)

:: Purge backups older than KEEP_DAYS to save storage
echo Cleaning up backup files older than %KEEP_DAYS% days...
forfiles /p "%BACKUP_DIR%" /d -%KEEP_DAYS% /c "cmd /c rmdir /s /q @path" 2>nul

echo Done.
