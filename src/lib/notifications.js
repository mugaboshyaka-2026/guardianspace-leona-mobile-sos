import { Platform } from 'react-native';

let Notifications = null;
let Constants = null;

try {
  Notifications = require('expo-notifications');
  Constants = require('expo-constants').default;
} catch {
  Notifications = null;
  Constants = null;
}

let initialized = false;
let responseSubscription = null;
let lastConsumedResponseId = null;

if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function getProjectId() {
  return Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || undefined;
}

export async function initNotifications() {
  if (!Notifications || initialized) {
    console.log('[LEONA Notifications] Init skipped', {
      hasNotifications: !!Notifications,
      initialized,
    });
    return null;
  }

  initialized = true;
  console.log('[LEONA Notifications] Initializing');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#FF3B30',
      sound: 'default',
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;

  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[LEONA Notifications] Permission not granted');
    return null;
  }

  return await getExpoPushToken();
}

export async function getExpoPushToken() {
  if (!Notifications) {
    return null;
  }

  try {
    const projectId = getProjectId();
    if (!projectId) {
      console.warn('[LEONA Notifications] Expo projectId unavailable; push token skipped');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const tokenData = typeof token?.data === 'string' ? token.data : null;
    if (tokenData) {
      console.log('[LEONA Notifications] Expo push token acquired', {
        platform: Platform.OS,
        projectId,
      });
    }
    return tokenData;
  } catch (error) {
    console.warn('[LEONA Notifications] Expo push token fetch failed:', error.message);
    return null;
  }
}

export function addNotificationResponseListener(listener) {
  if (!Notifications?.addNotificationResponseReceivedListener) {
    return () => {};
  }

  if (responseSubscription) {
    responseSubscription.remove();
  }

  responseSubscription = Notifications.addNotificationResponseReceivedListener(listener);
  return () => {
    responseSubscription?.remove?.();
    responseSubscription = null;
  };
}

export async function consumeLastNotificationResponse() {
  if (!Notifications?.getLastNotificationResponseAsync) {
    return null;
  }

  const response = await Notifications.getLastNotificationResponseAsync();
  const identifier =
    response?.notification?.request?.identifier
    || response?.notification?.request?.content?.data?.alert_id
    || response?.notification?.request?.content?.data?.event?.id
    || response?.notification?.request?.content?.data?.event?.event_id
    || null;

  if (!response || (identifier && identifier === lastConsumedResponseId)) {
    return null;
  }

  lastConsumedResponseId = identifier;

  if (Notifications.clearLastNotificationResponseAsync) {
    await Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }

  return response;
}
