export type WeatherCurrent = {
  time: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
};

export type WeatherDay = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  precipProb: number;
};

export type WeatherBundle = {
  latitude: number;
  longitude: number;
  timezone: string;
  current: WeatherCurrent;
  daily: WeatherDay[];
};

type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max?: number[];
  };
};

/** WMO weather interpretation codes → Thai label (Open-Meteo). */
export function weatherLabel(code: number) {
  if (code === 0) return "แจ่มใส";
  if (code === 1) return "ส่วนมากแจ่มใส";
  if (code === 2) return "เมฆบางส่วน";
  if (code === 3) return "เมฆมาก";
  if (code === 45 || code === 48) return "หมอก";
  if (code >= 51 && code <= 55) return "ฝนปรอย";
  if (code >= 56 && code <= 57) return "ฝนปรอยเยือกแข็ง";
  if (code >= 61 && code <= 65) return "ฝน";
  if (code >= 66 && code <= 67) return "ฝนเยือกแข็ง";
  if (code >= 71 && code <= 77) return "หิมะ";
  if (code >= 80 && code <= 82) return "ฝนซู่";
  if (code >= 85 && code <= 86) return "หิมะซู่";
  if (code === 95) return "ฝนฟ้าคะนอง";
  if (code === 96 || code === 99) return "ฝนฟ้าคะนองลูกเห็บ";
  return "ไม่ทราบสภาพอากาศ";
}

export type WeatherKind = "clear" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "storm" | "snow";

export function weatherKind(code: number): WeatherKind {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 95) return "storm";
  if (code >= 61 && code <= 86) return "rain";
  return "cloud";
}

/** Colorful PNG icons (from Dona-application weather assets). */
export function weatherIconSrc(code: number): string {
  if (code === 0 || code === 1) return "/icons/weather/sunny.png";
  if (code === 2) return "/icons/weather/partly_cloudy.png";
  if (code === 3) return "/icons/weather/cloudy.png";
  if (code === 45 || code === 48) return "/icons/weather/overcast.png";
  if (code >= 51 && code <= 55) return "/icons/weather/light_rain.png";
  if (code === 61 || code === 63 || code === 80 || code === 81) return "/icons/weather/rain.png";
  if (code === 65 || code === 82) return "/icons/weather/heavy_rain.png";
  if (code >= 95) return "/icons/weather/thunderstorm.png";
  if (code >= 71 && code <= 77) return "/icons/weather/snow.png";
  if (code >= 85 && code <= 86) return "/icons/weather/snow_light.png";
  if (code >= 56 && code <= 67) return "/icons/weather/rain.png";
  return "/icons/weather/partly_cloudy.png";
}

/** Free forecast API — no key, like OpenFreeMap for tiles. */
export async function fetchWeather(lat: number, lng: number, days = 7): Promise<WeatherBundle> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
  );
  url.searchParams.set("timezone", "Asia/Bangkok");
  url.searchParams.set("forecast_days", String(Math.min(16, Math.max(1, days))));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`โหลดอากาศไม่สำเร็จ (${response.status})`);
  }
  const data = (await response.json()) as OpenMeteoResponse;
  if (!data.current || !data.daily?.time?.length) {
    throw new Error("ข้อมูลอากาศไม่ครบ");
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      precipitation: data.current.precipitation,
      weatherCode: data.current.weather_code,
    },
    daily: data.daily.time.map((date, index) => ({
      date,
      weatherCode: data.daily.weather_code[index] ?? 0,
      tempMax: data.daily.temperature_2m_max[index] ?? 0,
      tempMin: data.daily.temperature_2m_min[index] ?? 0,
      precipitation: data.daily.precipitation_sum[index] ?? 0,
      precipProb: data.daily.precipitation_probability_max?.[index] ?? 0,
    })),
  };
}
