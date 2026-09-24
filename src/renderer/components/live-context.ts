import type { AppElements, LocationData } from '../types.js';

export function initClock(elements: Pick<AppElements, 'clock' | 'date'>): void {
  const updateTime = (): void => {
    const now = new Date();
    elements.clock.textContent = now.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
    elements.date.textContent = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  setInterval(updateTime, 1000);
  updateTime();
}

export async function initLiveContext(elements: Pick<AppElements, 'city' | 'weather' | 'weatherIcon'>): Promise<void> {
  const location = await getLocation();
  elements.city.textContent = location.city;
  await updateWeather(location.latitude, location.longitude, elements);
}

function getLocation(): Promise<LocationData> {
  const fallback: LocationData = { latitude: 4.711, longitude: -74.0721, city: 'Bogotá' };
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(fallback); return; }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`);
        const data = await response.json() as { address?: { city?: string; town?: string; village?: string } };
        resolve({ latitude, longitude, city: data.address?.city ?? data.address?.town ?? data.address?.village ?? 'Ubicación actual' });
      } catch { resolve({ latitude, longitude, city: 'Ubicación actual' }); }
    }, () => resolve(fallback), { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  });
}

async function updateWeather(latitude: number, longitude: number, elements: Pick<AppElements, 'weather' | 'weatherIcon'>): Promise<void> {
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius&timezone=auto`);
    if (!response.ok) throw new Error('Weather request failed');
    const data = await response.json() as { current?: { temperature_2m: number; weather_code: number } };
    if (!data.current) throw new Error('Weather data unavailable');
    elements.weather.textContent = `${Math.round(data.current.temperature_2m)} °C · ${weatherDescription(data.current.weather_code)}`;
    setWeatherIconClass(elements.weatherIcon, `fa-solid ${weatherIconClass(data.current.weather_code)}`);
  } catch {
    elements.weather.textContent = 'Clima no disponible';
    setWeatherIconClass(elements.weatherIcon, 'fa-solid fa-cloud-exclamation');
  }
}

// En un <svg>, `className` es de solo lectura (SVGAnimatedString): asignarlo lanza
// un TypeError que rompía initLiveContext. Además, las clases de FontAwesome no
// dibujan nada sobre un <svg>, así que ahí solo se marca el estado con un atributo
// y se conservan las clases originales del icono.
function setWeatherIconClass(icon: Element, value: string): void {
  if (icon instanceof SVGElement) {
    icon.setAttribute('data-weather', value);
    return;
  }
  icon.setAttribute('class', value);
}

function weatherDescription(code: number): string {
  if (code === 0) return 'Despejado';
  if ([1, 2, 3].includes(code)) return 'Parcialmente nublado';
  if ([45, 48].includes(code)) return 'Niebla';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Llovizna';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Lluvia';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Nieve';
  if ([95, 96, 99].includes(code)) return 'Tormenta';
  return 'Variable';
}

function weatherIconClass(code: number): string {
  if (code === 0) return 'fa-sun';
  if ([1, 2, 3].includes(code)) return 'fa-cloud-sun';
  if ([45, 48].includes(code)) return 'fa-smog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'fa-cloud-rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'fa-snowflake';
  return 'fa-cloud-bolt';
}
