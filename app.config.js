const fs = require('fs');
const path = require('path');

const expoConfig = {
  name: 'LEONA',
  slug: 'guardian-pro',
  version: '1.4.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme: 'leona',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#04060F',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'space.guardian.pro',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'LEONA uses your location to provide personalised threat intelligence and alerts for your area.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'LEONA monitors your area in the background to deliver critical safety alerts.',
      NSFaceIDUsageDescription: 'LEONA uses Face ID to securely sign you in.',
      NSCameraUsageDescription: 'LEONA uses your camera for secure team video calls.',
      NSMicrophoneUsageDescription: 'LEONA uses your microphone for team audio and video calls.',
      UIBackgroundModes: ['location', 'fetch', 'remote-notification', 'voip', 'audio'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'space.guardian.pro',
    versionCode: 5,
    adaptiveIcon: {
      backgroundColor: '#04060F',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
    },
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_CONNECT',
    ],
  },
  plugins: [
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '15.1',
        },
      },
    ],
    [
      'react-native-maps',
      {
        iosGoogleMapsApiKey: process.env.GOOGLE_MAP_KEY
          || process.env.EXPO_PUBLIC_GOOGLE_MAP_KEY
          || process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY
          || process.env.GOOGLE_MAPS_ANDROID_API_KEY,
        androidGoogleMapsApiKey: process.env.GOOGLE_MAP_KEY
          || process.env.EXPO_PUBLIC_GOOGLE_MAP_KEY
          || process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY
          || process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'LEONA monitors your area in the background to deliver critical safety alerts.',
      },
    ],
    'expo-notifications',
    'expo-local-authentication',
    'expo-web-browser',
    'expo-secure-store',
  ],
  extra: {
    eas: {
      projectId: '66cd8320-341e-4b87-92d9-874628323220',
    },
  },
};

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

loadDotEnv();

module.exports = () => {
  const googleMapsApiKey =
    process.env.GOOGLE_MAP_KEY
    || process.env.EXPO_PUBLIC_GOOGLE_MAP_KEY
    || process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY
    || process.env.GOOGLE_MAPS_ANDROID_API_KEY;

  return {
    ...expoConfig,
    ios: {
      ...(expoConfig.ios || {}),
      config: {
        ...((expoConfig.ios && expoConfig.ios.config) || {}),
      },
    },
    android: {
      ...(expoConfig.android || {}),
      config: {
        ...((expoConfig.android && expoConfig.android.config) || {}),
      },
    },
  };
};
