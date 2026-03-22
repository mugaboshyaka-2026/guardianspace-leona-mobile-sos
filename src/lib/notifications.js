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
    return;
  }

  initialized = true;
  console.log('[LEONA Notifications] Initializing');

  if (Platform.OS === 'android') {
    console.log('[LEONA Notifications] Configuring Android channel');
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
  console.log('[LEONA Notifications] Current permission status', finalStatus);

  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
    console.log('[LEONA Notifications] Requested permission status', finalStatus);
  }

  if (finalStatus !== 'granted') {
    console.warn('[LEONA Notifications] Permission not granted');
    return null;
  }

  try {
    const projectId = getProjectId();
    if (projectId) {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      console.log('[LEONA Notifications] Expo push token', token.data);
      return token.data;
    }
  } catch (error) {
    console.warn('[LEONA Notifications] Push token fetch failed:', error.message);
  }

  return null;
}

export async function getExpoPushToken() {
  if (!Notifications) {
    return null;
  }

  try {
    const projectId = getProjectId();
    if (!projectId) {
      return null;
    }
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token?.data || null;
  } catch (error) {
    console.warn('[LEONA Notifications] Explicit push token fetch failed:', error.message);
    return null;
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
    console.log('[LEONA Notifications] Skipping schedule, notifications unavailable');
    return;
  }

  const notification = buildRealtimeNotification(update);
  if (!notification) {
    console.log('[LEONA Notifications] Update did not qualify for notification', {
      type: update?.type,
      eventId: update?.event?.id || update?.event?.event_id || null,
      severity: update?.event?.severity || null,
    });
    return;
  }

  await initNotifications();
  console.log('[LEONA Notifications] Scheduling notification', {
    title: notification.title,
    body: notification.body,
    eventId: notification.data?.event?.id || notification.data?.event?.event_id || null,
  });

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

export function addNotificationResponseListener(listener) {
  if (!Notifications?.addNotificationResponseReceivedListener) {
    console.log('[LEONA Notifications] Response listener unavailable');
    return () => {};
  }

  if (responseSubscription) {
    responseSubscription.remove();
  }

  responseSubscription = Notifications.addNotificationResponseReceivedListener(listener);
  console.log('[LEONA Notifications] Response listener attached');
  return () => {
    responseSubscription?.remove?.();
    responseSubscription = null;
    console.log('[LEONA Notifications] Response listener removed');
  };
}

export async function consumeLastNotificationResponse() {
  if (!Notifications?.getLastNotificationResponseAsync) {
    return null;
  }

  const response = await Notifications.getLastNotificationResponseAsync();
  const identifier =
    response?.notification?.request?.identifier
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
