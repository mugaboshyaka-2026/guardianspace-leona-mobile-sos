$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "GUARDIAN PRO - iOS Build and Deploy"
Write-Host "----------------------------------"
Write-Host ""

# Step 0: Check prerequisites
Write-Host "Checking prerequisites..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not found. Install from https://nodejs.org"
    exit 1
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "npx not found. Install Node.js 18+"
    exit 1
}

Write-Host "Node version: $((node -v))"

# Step 1
Write-Host ""
Write-Host "Installing dependencies..."
npm install

# Step 2
Write-Host ""
Write-Host "Ensuring EAS CLI..."
npm install -g eas-cli

# Step 3
Write-Host ""
Write-Host "Logging into Expo..."
npx eas-cli login

# Step 4
Write-Host ""
Write-Host "Building iOS app in cloud..."
npx eas-cli build --platform ios --profile production

# Step 5
Write-Host ""
Write-Host "Submitting to TestFlight..."
npx eas-cli submit --platform ios --latest

Write-Host ""
Write-Host "DONE - Check App Store Connect"