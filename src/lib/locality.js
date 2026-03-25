function normalizeToken(token) {
  return token.trim().toLowerCase();
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function getLocationTerms(location) {
  if (!location) return [];

  const rawTerms = location
    .split(',')
    .map(normalizeToken)
    .filter(Boolean);

  return Array.from(new Set(rawTerms.filter((term) => term.length > 2)));
}

export function deriveLocalEvents(myEvents = [], worldEvents = [], location = '') {
  if (myEvents.length > 0) {
    return myEvents;
  }

  const terms = getLocationTerms(location);
  if (terms.length === 0) {
    return [];
  }

  return worldEvents.filter((event) => {
    const haystack = `${event.location || ''} ${event.title || ''}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  });
}

function getConfiguredCenters(userConfig = {}) {
  const configuredCenters = Array.isArray(userConfig?.aoiCenters) ? userConfig.aoiCenters : [];
  return configuredCenters
    .filter((center) => Number.isFinite(center?.lat) && Number.isFinite(center?.lng))
    .map((center) => ({
      lat: Number(center.lat),
      lng: Number(center.lng),
      label: center.label || center.name || '',
    }));
}

function getSelectedTypes(userConfig = {}) {
  const types = Array.isArray(userConfig?.eventTypes) ? userConfig.eventTypes : [];
  return new Set(types.map((value) => String(value).trim().toLowerCase()).filter(Boolean));
}

export function filterEventsForConfig(events = [], userConfig = {}, scope = 'local') {
  const selectedTypes = getSelectedTypes(userConfig);
  const radiusKm = Number(userConfig?.radius) || 0;
  const centers = getConfiguredCenters(userConfig);

  return events.filter((event) => {
    if (selectedTypes.size > 0) {
      const type = String(event?.type || event?.category || '').toLowerCase();
      if (!selectedTypes.has(type)) {
        return false;
      }
    }

    if (scope !== 'local') {
      return true;
    }

    if (!centers.length || !radiusKm) {
      return true;
    }

    if (!Number.isFinite(event?.lat) || !Number.isFinite(event?.lng) || event.lat === 0 || event.lng === 0) {
      return false;
    }

    return centers.some((center) => distanceKm(center.lat, center.lng, event.lat, event.lng) <= radiusKm);
  });
}

export function deriveLocalRegion(_location, events = []) {
  const validEvents = events.filter(
    (event) => Number.isFinite(event.lat) && Number.isFinite(event.lng) && event.lat !== 0 && event.lng !== 0
  );

  if (validEvents.length === 0) {
    return null;
  }

  const latitude = validEvents.reduce((sum, event) => sum + event.lat, 0) / validEvents.length;
  const longitude = validEvents.reduce((sum, event) => sum + event.lng, 0) / validEvents.length;
  return { latitude, longitude, latitudeDelta: 8, longitudeDelta: 8 };
}

export function getLocationMetadata(location) {
  const [cityPart, countryPart] = (location || '').split(',').map((part) => part.trim()).filter(Boolean);
  return {
    city: cityPart || location || '',
    country_code: normalizeCountryCode(countryPart),
  };
}

function normalizeCountryCode(countryPart) {
  if (!countryPart) return '';

  const normalized = countryPart.toUpperCase();
  const aliasMap = {
    UK: 'GB',
    US: 'US',
    USA: 'US',
    UAE: 'AE',
    AUSTRALIA: 'AU',
    SINGAPORE: 'SG',
    'SOUTH AFRICA': 'ZA',
  };

  return aliasMap[normalized] || normalized;
}
