# GUARDIAN PRO — TestFlight Deployment Script for Windows
# Run this in PowerShell from the GuardianPro folder

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🛡️  GUARDIAN PRO — iOS Build & Deploy"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# Step 0: Check prerequisites
Write-Host "📋 Checking prerequisites..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Install from https://nodejs.org"
    exit 1
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npx not found. Install Node.js 18+"
    exit 1
}

Write-Host "  ✅ Node $((node -v))"

# Step 1: Install dependencies
Write-Host ""
Write-Host "📦 Step 1/6: Installing dependencies..."
npm install
Write-Host "  ✅ Dependencies installed"

# Step 2: Install EAS CLI globally
Write-Host ""
Write-Host "🔧 Step 2/6: Setting up EAS CLI..."
try {
    npm install -g eas-cli | Out-Null
} catch {
    Write-Host "  ⚠️  Global install skipped or already installed"
}
$easVersion = npx eas-cli --version
Write-Host "  ✅ EAS CLI ready ($easVersion)"

# Step 3: Login to Expo
Write-Host ""
Write-Host "🔐 Step 3/6: Logging into Expo..."
Write-Host "  If you don't have an Expo account, create one free at https://expo.dev/signup"
Write-Host ""
npx eas-cli login
Write-Host "  ✅ Logged in to Expo"

# Step 4: Initialize EAS project
Write-Host ""
Write-Host "🔗 Step 4/6: Linking project to EAS..."
npx eas-cli init
Write-Host "  ✅ Project linked"

# Step 5: Build for iOS
Write-Host ""
Write-Host "🏗️  Step 5/6: Building for iOS (TestFlight)..."
Write-Host "  This builds in the cloud."
Write-Host "  You may be asked to sign in with your Apple ID."
Write-Host "  EAS can manage provisioning profiles and certificates for you."
Write-Host ""
npx eas-cli build --platform ios --profile production
Write-Host ""
Write-Host "  ✅ iOS build complete!"

# Step 6: Submit to TestFlight
Write-Host ""
Write-Host "📱 Step 6/6: Submitting to TestFlight..."
Write-Host "  This pushes the build to App Store Connect → TestFlight."
Write-Host ""
npx eas-cli submit --platform ios --latest
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "🎉 DONE! Guardian Pro has been submitted to TestFlight."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open App Store Connect (https://appstoreconnect.apple.com)"
Write-Host "  2. Go to 'My Apps' → 'Guardian Pro' → 'TestFlight'"
Write-Host "  3. Wait for Apple processing"
Write-Host "  4. Add testers"
Write-Host "  5. Install through TestFlight on iPhone"
Write-Host ""
Write-Host "🛡️  guardian.space"