/**
 * LEONA Mobile — Environment Configuration
 *
 * For EAS builds, these are injected via eas.json env or app.config.js.
 * For local dev, edit the values below directly.
 */

// FastAPI backend (same contract as previous Express API)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://leona-api-python-vhkr.onrender.com';

// Clerk authentication
export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_dmFzdC1wb2xlY2F0LTE1LmNsZXJrLmFjY291bnRzLmRldiQ';

// Ably real-time
export const ABLY_API_KEY = process.env.EXPO_PUBLIC_ABLY_KEY || 'BMvtPg.9L0zag:Pfr3rFNoCbR0Ql2oMFJmbFg7DVWlY6tHffuBgdIAMUA';
