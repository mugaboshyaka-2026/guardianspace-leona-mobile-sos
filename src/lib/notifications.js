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

const deliveredKeys = new Set();
let initialized = false;

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
    return;
  }

  initialized = true;

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
    return;
  }

  try {
    const projectId = getProjectId();
    if (projectId) {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      console.log('[LEONA Notifications] Expo push token', token.data);
    }
  } catch (error) {
    console.warn('[LEONA Notifications] Push token fetch failed:', error.message);
  }
}

function buildRealtimeNotification(update) {
  const event = update?.event || {};
  const eventId = event.id || event.event_id || event.title;
  const key = `${update?.type || 'event'}:${eventId}`;

  if (!eventId || deliveredKeys.has(key)) {
    return null;
  }

  if (!['alert', 'aoi_alert', 'new', 'update'].includes(update?.type)) {
    return null;
  }

  if (update.type === 'new' || update.type === 'update') {
    const severity = event.severity?.toLowerCase?.();
    if (!['critical', 'high'].includes(severity)) {
      return null;
    }
  }

  deliveredKeys.add(key);

  const title =
    update.type === 'aoi_alert'
      ? 'AOI Alert'
      : update.type === 'alert'
        ? 'Critical Alert'
        : 'Global Event Update';
  const bodyParts = [event.title || 'Event update'];
  if (event.location) {
    bodyParts.push(event.location);
  }

  return {
    title,
    body: bodyParts.join(' · '),
    data: {
      notificationType: update.type,
      event,
    },
  };
}

export async function notifyRealtimeUpdate(update) {
  if (!Notifications) {
    return;
  }

  const notification = buildRealtimeNotification(update);
  if (!notification) {
    return;
  }

  await initNotifications();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: 'default',
    },
    trigger: null,
  });
}
