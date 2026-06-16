import Taro from '@tarojs/taro';
import { Network } from '@/network';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  province: string;
  district: string;
  adcode: string;
  address?: string;
  name?: string;
  source?: 'auto' | 'manual';
}

const CACHE_KEY = 'market_user_city';
const CACHE_FULL_KEY = 'market_user_location';
const MANUAL_CITY_KEY = 'selectedCity';
const LOCATION_REQUEST_TIMEOUT_MS = 10_000;

export const DEFAULT_CITY_LABEL = '同城';
export const DEFAULT_MAP_CENTER = { latitude: 35.86166, longitude: 104.195397 };

export function normalizeCityName(input?: string): string {
  const text = String(input || '').trim();
  if (!text) return '';
  return text
    .replace(/^(中国|中华人民共和国)/, '')
    .replace(/(特别行政区|市辖区|地区|盟|自治州|市)$/u, '')
    .trim();
}

export function isValidCoordinate(latitude?: unknown, longitude?: unknown): latitude is number {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function safeGetStorage<T = any>(key: string): T | null {
  try {
    return Taro.getStorageSync(key) || null;
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: unknown) {
  try {
    Taro.setStorageSync(key, value);
  } catch {
    // Ignore storage failures in preview or restricted runtimes.
  }
}

function parseCityFromAddress(address?: string, name?: string): string {
  const text = `${address || ''} ${name || ''}`;
  const city = text.match(/([\u4e00-\u9fa5]{2,20}(?:自治州|地区|盟|市))/u)?.[1];
  if (city) return normalizeCityName(city);
  const district = text.match(/([\u4e00-\u9fa5]{2,20}(?:区|县|旗))/u)?.[1];
  return district ? normalizeCityName(district) : '';
}

function makeLocationData(input: Partial<LocationData>): LocationData {
  return {
    latitude: Number(input.latitude || 0),
    longitude: Number(input.longitude || 0),
    city: normalizeCityName(input.city) || parseCityFromAddress(input.address, input.name),
    province: input.province || '',
    district: input.district || '',
    adcode: input.adcode || '',
    address: input.address || '',
    name: input.name || '',
    source: input.source || 'auto',
  };
}

export function getCachedCity(): string {
  const manual = safeGetStorage<{ name?: string }>(MANUAL_CITY_KEY);
  const manualCity = normalizeCityName(manual?.name);
  if (manualCity) return manualCity;
  return normalizeCityName(safeGetStorage<string>(CACHE_KEY) || '');
}

export function getCachedLocation(): LocationData | null {
  const raw = safeGetStorage<LocationData>(CACHE_FULL_KEY);
  if (!raw || !isValidCoordinate(raw.latitude, raw.longitude)) return null;
  return makeLocationData(raw);
}

export function saveCityToCache(data: LocationData) {
  const normalized = makeLocationData(data);
  if (normalized.city) {
    safeSetStorage(CACHE_KEY, normalized.city);
  }
  safeSetStorage(CACHE_FULL_KEY, normalized);
}

export function saveManualLocation(data: LocationData) {
  const normalized = makeLocationData({ ...data, source: 'manual' });
  if (normalized.city) {
    safeSetStorage(MANUAL_CITY_KEY, { name: normalized.city, source: 'manual', updatedAt: Date.now() });
  }
  saveCityToCache(normalized);
}

export function clearLocationCache() {
  try {
    Taro.removeStorageSync(CACHE_KEY);
    Taro.removeStorageSync(CACHE_FULL_KEY);
    Taro.removeStorageSync(MANUAL_CITY_KEY);
  } catch {
    // Ignore storage failures in preview or restricted runtimes.
  }
}

export function getDisplayCity(fallback = DEFAULT_CITY_LABEL): string {
  return getCachedCity() || fallback;
}

export async function getUserLocation(): Promise<{ latitude: number; longitude: number }> {
  try {
    const fuzzyApi = (Taro as any).getFuzzyLocation;
    if (typeof fuzzyApi === 'function') {
      const fuzzyLoc = await fuzzyApi({ type: 'gcj02' });
      if (isValidCoordinate(fuzzyLoc.latitude, fuzzyLoc.longitude)) {
        return { latitude: fuzzyLoc.latitude, longitude: fuzzyLoc.longitude };
      }
    }
  } catch {
    // Fuzzy location is optional. Fall back to authorized precise location.
  }

  const loc = await Taro.getLocation({ type: 'gcj02' });
  return { latitude: loc.latitude, longitude: loc.longitude };
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<LocationData | null> {
  if (!isValidCoordinate(latitude, longitude)) return null;

  try {
    const res: any = await Network.request({
      url: `/api/location/reverse?lat=${latitude}&lng=${longitude}`,
      method: 'GET',
      timeout: LOCATION_REQUEST_TIMEOUT_MS,
    });

    if (res.data?.code === 200 && res.data?.data?.city) {
      return makeLocationData(res.data.data as LocationData);
    }

    console.error('[Location] reverse geocode failed:', res.data);
    return null;
  } catch (err) {
    console.error('[Location] reverse geocode error:', err);
    return null;
  }
}

export async function chooseManualLocation(): Promise<LocationData> {
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
    throw new Error('请在微信小程序中选择位置，也可以先手动填写地址。');
  }

  const picked = await Taro.chooseLocation({});
  const latitude = Number(picked.latitude || 0);
  const longitude = Number(picked.longitude || 0);
  if (!isValidCoordinate(latitude, longitude)) {
    throw new Error('没有获取到有效经纬度，请重新选择位置。');
  }

  const reverse = await reverseGeocode(latitude, longitude);
  const data = makeLocationData({
    ...(reverse || {}),
    latitude,
    longitude,
    city: reverse?.city || parseCityFromAddress(picked.address, picked.name),
    address: picked.address || reverse?.address || picked.name || '',
    name: picked.name || '',
    source: 'manual',
  });
  saveManualLocation(data);
  return data;
}

export async function fetchCurrentCity(): Promise<string> {
  const cached = getCachedCity();
  if (cached) {
    refreshCityInBackground();
    return cached;
  }

  return await doFetchCity();
}

async function refreshCityInBackground() {
  const manual = safeGetStorage<{ source?: string }>(MANUAL_CITY_KEY);
  if (manual?.source === 'manual') return;

  try {
    await doFetchCity();
  } catch {
    // Silent refresh failure must not block page display.
  }
}

async function doFetchCity(): Promise<string> {
  try {
    const { latitude, longitude } = await getUserLocation();
    const data = await reverseGeocode(latitude, longitude);
    if (data?.city) {
      saveCityToCache(data);
      return normalizeCityName(data.city);
    }
  } catch (err) {
    console.error('[Location] fetch city error:', err);
  }
  return '';
}
