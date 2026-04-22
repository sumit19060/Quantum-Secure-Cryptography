# run.ps1
Write-Host "Running QSB Diagnostic Test..." -ForegroundColor Cyan

# Run the end-to-end test
$env:PYTHONIOENCODING='utf-8'
python pipeline/qsb_pipeline.py test

Write-Host "Test Execution Finished."
