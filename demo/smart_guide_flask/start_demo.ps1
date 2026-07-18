Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Smart Guide Flask Service Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$python = Join-Path $scriptDir ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Host "ERROR: Virtual env not found at $python" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting Flask at http://127.0.0.1:5000" -ForegroundColor Green
Write-Host ""
Write-Host "  Demo Page: http://127.0.0.1:5000/" -ForegroundColor Yellow
Write-Host "  API:       http://127.0.0.1:5000/api/guide/ask" -ForegroundColor Yellow
Write-Host "  Health:    http://127.0.0.1:5000/api/guide/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

& $python app.py

Read-Host "Press Enter to exit"
