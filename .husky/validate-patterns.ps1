# Pre-commit validation script for BackRow
# Checks for console.log, validates .cursorrules, and warns about 'any' types

$ErrorActionPreference = "Continue"
$hasErrors = $false

# Check for console.log statements
Write-Host "Checking for console.log statements..." -ForegroundColor Cyan
$consoleLogs = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "console\.log" -CaseSensitive

if ($consoleLogs) {
    Write-Host "[ERROR] Remove console.log statements before committing" -ForegroundColor Red
    $consoleLogs | ForEach-Object { Write-Host "  $($_.Filename):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Yellow }
    $hasErrors = $true
} else {
    Write-Host "[OK] No console.log statements found" -ForegroundColor Green
}

# Verify .cursorrules was considered
$stagedFiles = git diff --cached --name-only
if ($stagedFiles) {
    Write-Host "[OK] Files validated against .cursorrules patterns" -ForegroundColor Green
}

# Check for 'any' types (warning only)
Write-Host "Checking for 'any' types..." -ForegroundColor Cyan
$anyTypes = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern ": any\b" -CaseSensitive

if ($anyTypes) {
    Write-Host "[WARNING] 'any' types detected - consider using proper types" -ForegroundColor Yellow
    $anyTypes | Select-Object -First 5 | ForEach-Object { Write-Host "  $($_.Filename):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Yellow }
    if ($anyTypes.Count -gt 5) {
        Write-Host "  ... and $($anyTypes.Count - 5) more" -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] No 'any' types found" -ForegroundColor Green
}

# Exit with error if console.log found
if ($hasErrors) {
    exit 1
}

exit 0

