#!/bin/bash
# ╔══════════════════════════════════════════════════════╗
# ║  GUARDIAN PRO — TestFlight Deployment Script         ║
# ║  Run this on your Mac from the GuardianPro folder    ║
# ╚══════════════════════════════════════════════════════╝

set -e
echo ""
echo "🛡️  GUARDIAN PRO — iOS Build & Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 0: Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ npx not found. Install Node.js 18+"; exit 1; }
echo "  ✅ Node $(node -v)"

# Step 1: Install dependencies
echo ""
echo "📦 Step 1/6: Installing dependencies..."
npm install
echo "  ✅ Dependencies installed"

# Step 2: Install EAS CLI globally
echo ""
echo "🔧 Step 2/6: Setting up EAS CLI..."
npm install -g eas-cli 2>/dev/null || true
echo "  ✅ EAS CLI ready ($(npx eas-cli --version 2>/dev/null | head -1))"

# Step 3: Login to Expo
echo ""
echo "🔐 Step 3/6: Logging into Expo..."
echo "  If you don't have an Expo account, create one free at https://expo.dev/signup"
echo ""
npx eas-cli login
echo "  ✅ Logged in to Expo"

# Step 4: Initialize EAS project (links to Expo project)
echo ""
echo "🔗 Step 4/6: Linking project to EAS..."
npx eas-cli init
echo "  ✅ Project linked"

# Step 5: Build for iOS
echo ""
echo "🏗️  Step 5/6: Building for iOS (TestFlight)..."
echo "  This builds in the cloud. Takes ~10-20 min."
echo "  You'll be asked to sign in with your Apple ID (dev@guardian.space)."
echo "  EAS will automatically create provisioning profiles and certificates."
echo ""
npx eas-cli build --platform ios --profile production
echo ""
echo "  ✅ iOS build complete!"

# Step 6: Submit to TestFlight
echo ""
echo "📱 Step 6/6: Submitting to TestFlight..."
echo "  This pushes the build to App Store Connect → TestFlight."
echo ""
npx eas-cli submit --platform ios --latest
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DONE! Guardian Pro has been submitted to TestFlight."
echo ""
echo "Next steps:"
echo "  1. Open App Store Connect (appstoreconnect.apple.com)"
echo "  2. Go to 'My Apps' → 'Guardian Pro' → 'TestFlight'"
echo "  3. The build will appear within ~15 min after processing"
echo "  4. Add yourself as a tester → you'll get a TestFlight invite"
echo "  5. Open TestFlight on your iPhone → install Guardian Pro"
echo ""
echo "🛡️  guardian.space"
