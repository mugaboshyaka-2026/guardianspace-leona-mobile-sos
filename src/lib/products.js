export const PRODUCT_CONFIGS = {
  leona_plus: {
    id: 'leona_plus',
    label: 'Leona Plus',
    description: 'Core monitoring for individual operators and small teams',
    accent: '#00A8FF',
    maxVisibleEvents: 25,
    canUseCommunity: false,
    canUseVideoAgent: false,
    enabledMapLayers: ['wildfire', 'flood', 'earthquake', 'hurricane'],
  },
  leona_pro: {
    id: 'leona_pro',
    label: 'Leona Pro',
    description: 'Expanded intelligence workflows for response teams',
    accent: '#FF9800',
    maxVisibleEvents: 75,
    canUseCommunity: true,
    canUseVideoAgent: true,
    enabledMapLayers: ['wildfire', 'flood', 'earthquake', 'hurricane', 'conflict', 'drought', 'volcano'],
  },
  leona_enterprise: {
    id: 'leona_enterprise',
    label: 'Leona Enterprise',
    description: 'Full operational access with all intelligence layers',
    accent: '#6B48FF',
    maxVisibleEvents: null,
    canUseCommunity: true,
    canUseVideoAgent: true,
    enabledMapLayers: ['wildfire', 'flood', 'earthquake', 'hurricane', 'conflict', 'drought', 'volcano', 'health'],
  },
};

export function getProductConfig(productId) {
  return PRODUCT_CONFIGS[productId] || PRODUCT_CONFIGS.leona_plus;
}

export function limitEventsForProduct(events = [], productId) {
  const config = getProductConfig(productId);
  if (!config.maxVisibleEvents) {
    return events;
  }
  return events.slice(0, config.maxVisibleEvents);
}
