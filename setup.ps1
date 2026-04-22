# setup.ps1
Write-Host "Setting up QSB Project..." -ForegroundColor Cyan

# Install dependencies
Write-Host "Installing Python dependencies..."
python -m pip install base58 paramiko

# Note: coincurve might fail on Python 3.14 until wheels are available.
# The project will fall back to pure-Python mode if it's missing.
Write-Host "Attempting to install coincurve (optional for initial setup)..."
python -m pip install coincurve

# Run QSB Pipeline Setup
Write-Host "Initializing QSB Pipeline (test config)..."
$env:PYTHONIOENCODING='utf-8'
python pipeline/qsb_pipeline.py setup --config test

Write-Host "`nSetup Complete!" -ForegroundColor Green
Write-Host "--------------------------------------------------"
Write-Host "Python environment is ready (Pure-Python fallback active)."
Write-Host "GPU Searcher build requires CUDA Toolkit and OpenSSL."
Write-Host "You can now run diagnostic tests with .\run.ps1"
