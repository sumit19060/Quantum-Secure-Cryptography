# start.ps1
# The ONE command to get everything running for your QSB client.

$host.ui.RawUI.WindowTitle = "QSB - Unified Start"
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Quantum-Safe Bitcoin Transaction Dashboard    " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for Prerequisites
Write-Host "[1/5] Checking environment..." -ForegroundColor Yellow
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Python is not installed. Please install it first." -ForegroundColor Red
    exit
}
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js/NPM is not installed. Please install it first." -ForegroundColor Red
    exit
}

# 2. Install Python Dependencies
Write-Host "[2/5] Installing Python libraries (Flask, paramiko, etc.)..." -ForegroundColor Yellow
python -m pip install flask flask-cors base58 paramiko coincurve

# 3. Install UI Dependencies
Write-Host "[3/5] Installing UI libraries (npm install)..." -ForegroundColor Yellow
Set-Location ui
npm install
Set-Location ..

# 4. Create Source Zip for Vast.ai
Write-Host "[4/6] Creating qsb.zip for GPU deployment..." -ForegroundColor Yellow
if (Test-Path qsb.zip) { Remove-Item qsb.zip }
Compress-Archive -Path "gpu", "pipeline", "script", "qsb_config.json" -DestinationPath qsb.zip

# 5. Initialize Pipeline State
Write-Host "[5/6] Initializing cryptographic state (Phase 1)..." -ForegroundColor Yellow
$env:PYTHONIOENCODING='utf-8'
python pipeline/qsb_pipeline.py setup --config test

# 6. Launch Backend and Frontend
Write-Host "[6/6] Launching QSB Dashboard..." -ForegroundColor Green
Write-Host "------------------------------------------------"
Write-Host "Local UI: http://localhost:5174" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "------------------------------------------------"
Write-Host "Launching services in separate windows... KEEP THIS WINDOW OPEN."

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python server.py" -WindowStyle Normal

# Start Frontend
Set-Location ui
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Set-Location ..

Write-Host ""
Write-Host "Dashboard is starting. Please check http://localhost:5174 in a few seconds." -ForegroundColor Green
Write-Host "Press any key to exit this installer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
