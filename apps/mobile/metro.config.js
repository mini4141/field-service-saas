const { getDefaultConfig } = require("expo/metro-config");

// Expo SDK 54 auto-detects the pnpm/npm workspace root; this just keeps the default config explicit.
module.exports = getDefaultConfig(__dirname);
