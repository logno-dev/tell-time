import { useEffect, useRef, useState } from 'react'

const DEFAULT_SUN = { sunrise: 6 * 60 + 30, sunset: 19 * 60 + 30 }
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone
const WEATHER_UNIT = navigator.language === 'en-US' ? 'fahrenheit' : 'celsius'
const weatherCache = new Map()
const NUMBER_WORDS = [
  'twelve', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
]
const SMALL_NUMBERS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]
const SCORE_KEY = 'round-the-clock-scores'
const SAVED_PLACES_KEY = 'round-the-clock-saved-places'
const DEFAULT_QUIZ_CONFIG = {
  increment: 15,
  format: 'digital',
  timer: 0,
  questionCount: 5,
}
const QUIZ_OPTIONS = {
  increment: [
    { value: 15, label: 'Quarter hours', detail: ':00, :15, :30, :45' },
    { value: 10, label: 'Ten minutes', detail: 'Count by tens' },
    { value: 5, label: 'Five minutes', detail: 'Count by fives' },
    { value: 1, label: 'Any minute', detail: 'Every tick counts' },
  ],
  format: [
    { value: 'digital', label: 'Standard', detail: '2:35 PM' },
    { value: 'words', label: 'Spoken', detail: 'Twenty-five to three' },
    { value: 'military', label: '24 hour', detail: '14:35' },
    { value: 'mixed', label: 'Mixed', detail: 'A bit of everything' },
  ],
  timer: [
    { value: 0, label: 'Take your time', detail: 'No timer' },
    { value: 15, label: 'Challenge', detail: '15 seconds each' },
    { value: 8, label: 'Speed round', detail: '8 seconds each' },
    { value: 'total30', label: '30-second sprint', detail: 'Answer all you can' },
  ],
}
const MAJOR_TIMEZONES = [
  { id: 'us-eastern', name: 'New York', country: 'United States', region: 'US timezones', timezone: 'America/New_York', latitude: 40.7128, longitude: -74.006 },
  { id: 'us-central', name: 'Chicago', country: 'United States', region: 'US timezones', timezone: 'America/Chicago', latitude: 41.8781, longitude: -87.6298 },
  { id: 'us-mountain', name: 'Denver', country: 'United States', region: 'US timezones', timezone: 'America/Denver', latitude: 39.7392, longitude: -104.9903 },
  { id: 'us-arizona', name: 'Phoenix', country: 'United States', region: 'US timezones', timezone: 'America/Phoenix', latitude: 33.4484, longitude: -112.074 },
  { id: 'us-pacific', name: 'Los Angeles', country: 'United States', region: 'US timezones', timezone: 'America/Los_Angeles', latitude: 34.0522, longitude: -118.2437 },
  { id: 'us-alaska', name: 'Anchorage', country: 'United States', region: 'US timezones', timezone: 'America/Anchorage', latitude: 61.2181, longitude: -149.9003 },
  { id: 'us-aleutian', name: 'Adak', country: 'United States', region: 'US timezones', timezone: 'America/Adak', latitude: 51.88, longitude: -176.6581 },
  { id: 'us-hawaii', name: 'Honolulu', country: 'United States', region: 'US timezones', timezone: 'Pacific/Honolulu', latitude: 21.3099, longitude: -157.8581 },
  { id: 'us-atlantic', name: 'San Juan', country: 'Puerto Rico', region: 'US timezones', timezone: 'America/Puerto_Rico', latitude: 18.4655, longitude: -66.1057 },
  { id: 'us-samoa', name: 'Pago Pago', country: 'American Samoa', region: 'US timezones', timezone: 'Pacific/Pago_Pago', latitude: -14.2756, longitude: -170.702 },
  { id: 'us-chamorro', name: 'Hagatna', country: 'Guam', region: 'US timezones', timezone: 'Pacific/Guam', latitude: 13.4757, longitude: 144.7489 },
  { id: 'eu-london', name: 'London', country: 'United Kingdom', region: 'Europe', timezone: 'Europe/London', latitude: 51.5072, longitude: -0.1276 },
  { id: 'eu-lisbon', name: 'Lisbon', country: 'Portugal', region: 'Europe', timezone: 'Europe/Lisbon', latitude: 38.7223, longitude: -9.1393 },
  { id: 'eu-paris', name: 'Paris', country: 'France', region: 'Europe', timezone: 'Europe/Paris', latitude: 48.8566, longitude: 2.3522 },
  { id: 'eu-berlin', name: 'Berlin', country: 'Germany', region: 'Europe', timezone: 'Europe/Berlin', latitude: 52.52, longitude: 13.405 },
  { id: 'eu-athens', name: 'Athens', country: 'Greece', region: 'Europe', timezone: 'Europe/Athens', latitude: 37.9838, longitude: 23.7275 },
  { id: 'eu-moscow', name: 'Moscow', country: 'Russia', region: 'Europe', timezone: 'Europe/Moscow', latitude: 55.7558, longitude: 37.6173 },
  { id: 'sa-sao-paulo', name: 'Sao Paulo', country: 'Brazil', region: 'South America', timezone: 'America/Sao_Paulo', latitude: -23.5505, longitude: -46.6333 },
  { id: 'sa-buenos-aires', name: 'Buenos Aires', country: 'Argentina', region: 'South America', timezone: 'America/Argentina/Buenos_Aires', latitude: -34.6037, longitude: -58.3816 },
  { id: 'sa-santiago', name: 'Santiago', country: 'Chile', region: 'South America', timezone: 'America/Santiago', latitude: -33.4489, longitude: -70.6693 },
  { id: 'sa-bogota', name: 'Bogota', country: 'Colombia', region: 'South America', timezone: 'America/Bogota', latitude: 4.711, longitude: -74.0721 },
  { id: 'sa-lima', name: 'Lima', country: 'Peru', region: 'South America', timezone: 'America/Lima', latitude: -12.0464, longitude: -77.0428 },
  { id: 'sa-caracas', name: 'Caracas', country: 'Venezuela', region: 'South America', timezone: 'America/Caracas', latitude: 10.4806, longitude: -66.9036 },
  { id: 'asia-tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', timezone: 'Asia/Tokyo', latitude: 35.6762, longitude: 139.6503 },
  { id: 'asia-shanghai', name: 'Shanghai', country: 'China', region: 'Asia', timezone: 'Asia/Shanghai', latitude: 31.2304, longitude: 121.4737 },
  { id: 'asia-hong-kong', name: 'Hong Kong', country: 'Hong Kong', region: 'Asia', timezone: 'Asia/Hong_Kong', latitude: 22.3193, longitude: 114.1694 },
  { id: 'asia-singapore', name: 'Singapore', country: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', latitude: 1.3521, longitude: 103.8198 },
  { id: 'asia-seoul', name: 'Seoul', country: 'South Korea', region: 'Asia', timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978 },
  { id: 'asia-delhi', name: 'Delhi', country: 'India', region: 'Asia', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 },
  { id: 'asia-dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'Asia', timezone: 'Asia/Dubai', latitude: 25.2048, longitude: 55.2708 },
  { id: 'asia-bangkok', name: 'Bangkok', country: 'Thailand', region: 'Asia', timezone: 'Asia/Bangkok', latitude: 13.7563, longitude: 100.5018 },
  { id: 'af-cairo', name: 'Cairo', country: 'Egypt', region: 'Africa', timezone: 'Africa/Cairo', latitude: 30.0444, longitude: 31.2357 },
  { id: 'af-lagos', name: 'Lagos', country: 'Nigeria', region: 'Africa', timezone: 'Africa/Lagos', latitude: 6.5244, longitude: 3.3792 },
  { id: 'af-nairobi', name: 'Nairobi', country: 'Kenya', region: 'Africa', timezone: 'Africa/Nairobi', latitude: -1.2921, longitude: 36.8219 },
  { id: 'af-johannesburg', name: 'Johannesburg', country: 'South Africa', region: 'Africa', timezone: 'Africa/Johannesburg', latitude: -26.2041, longitude: 28.0473 },
  { id: 'af-casablanca', name: 'Casablanca', country: 'Morocco', region: 'Africa', timezone: 'Africa/Casablanca', latitude: 33.5731, longitude: -7.5898 },
  { id: 'oc-sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', timezone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093 },
  { id: 'oc-auckland', name: 'Auckland', country: 'New Zealand', region: 'Oceania', timezone: 'Pacific/Auckland', latitude: -36.8509, longitude: 174.7645 },
]

function getApproxMoon(date = new Date()) {
  const lunarCycle = 29.53058867
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14)
  const daysSince = (date.getTime() - knownNewMoon) / 86400000
  const value = ((daysSince % lunarCycle) + lunarCycle) % lunarCycle / lunarCycle
  const names = [
    'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
  ]
  return {
    value,
    name: names[Math.round(value * 8) % 8],
    illumination: Math.round((1 - Math.cos(value * Math.PI * 2)) * 50),
  }
}

function parseClockTime(value) {
  if (!value) return null
  const match = value.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2])
  if (match[3]) {
    hour %= 12
    if (match[3].toUpperCase() === 'PM') hour += 12
  }
  return hour * 60 + minute
}

function normalizeTimeZone(value) {
  if (typeof value !== 'string' || !value) return LOCAL_TIMEZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return value
  } catch {
    return LOCAL_TIMEZONE
  }
}

function getZonedDate(timeZone, instant = new Date()) {
  const safeTimeZone = normalizeTimeZone(timeZone)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return new Date(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  )
}

async function getSkyData(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  })
  const response = await fetch(`https://api.sunrisesunset.io/json?${params}`)
  if (!response.ok) throw new Error('Sun service unavailable')
  const data = await response.json()
  const sunrise = parseClockTime(data.results?.sunrise)
  const sunset = parseClockTime(data.results?.sunset)
  if (sunrise == null || sunset == null) throw new Error('Invalid sun times')

  const moonValue = Number(data.results?.moon_phase_value)
  const moonIllumination = Number(data.results?.moon_illumination)
  return {
    sunTimes: { sunrise, sunset },
    moon: Number.isFinite(moonValue) ? {
      value: moonValue,
      name: data.results?.moon_phase || getApproxMoon().name,
      illumination: Number.isFinite(moonIllumination)
        ? moonIllumination
        : getApproxMoon().illumination,
    } : getApproxMoon(),
    timeZone: data.results?.timezone,
  }
}

function describeWeather(code) {
  if (code === 0) return { kind: 'clear', label: 'Clear sky' }
  if (code <= 2) return { kind: 'partly-cloudy', label: 'Partly cloudy' }
  if (code === 3) return { kind: 'overcast', label: 'Overcast' }
  if (code === 45 || code === 48) return { kind: 'fog', label: 'Foggy' }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { kind: 'rain', label: code >= 80 ? 'Rain showers' : 'Rainy' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: 'snow', label: 'Snowy' }
  if (code >= 95) return { kind: 'storm', label: 'Thunderstorms' }
  return { kind: 'cloudy', label: 'Cloudy' }
}

function getBiome(timeZone, location) {
  const latitude = Number(location?.latitude)
  const longitude = Number(location?.longitude)
  const isTexas = location?.admin1?.toLowerCase() === 'texas'
    || (Number.isFinite(latitude) && Number.isFinite(longitude)
      && latitude >= 25.7 && latitude <= 36.6 && longitude >= -106.7 && longitude <= -93.5)
  if (isTexas) return 'desert'

  const zones = {
    desert: ['America/Phoenix', 'America/Lima', 'Asia/Dubai', 'Africa/Cairo', 'Africa/Casablanca'],
    tropical: ['America/Puerto_Rico', 'America/Sao_Paulo', 'Pacific/Pago_Pago', 'Pacific/Guam', 'Asia/Singapore', 'Asia/Bangkok', 'Africa/Lagos'],
    coastal: ['America/Los_Angeles', 'Pacific/Honolulu', 'Europe/Lisbon', 'Asia/Tokyo', 'Asia/Hong_Kong', 'Australia/Sydney', 'Pacific/Auckland'],
    mountain: ['America/Denver', 'America/Santiago', 'America/Bogota', 'Asia/Kolkata'],
    tundra: ['America/Anchorage', 'America/Adak', 'Europe/Moscow'],
    savanna: ['Africa/Nairobi', 'Africa/Johannesburg'],
  }
  return Object.entries(zones).find(([, zoneNames]) => zoneNames.includes(timeZone))?.[0] || 'temperate'
}

async function getWeatherData(latitude, longitude) {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)},${WEATHER_UNIT}`
  const cached = weatherCache.get(cacheKey)
  if (cached && Date.now() - cached.createdAt < 10 * 60 * 1000) return cached.weather

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,cloud_cover,precipitation,rain,snowfall,wind_speed_10m',
    temperature_unit: WEATHER_UNIT,
    timezone: 'auto',
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) throw new Error('Weather service unavailable')
  const data = await response.json()
  const current = data.current
  if (!current || !Number.isFinite(current.weather_code)) throw new Error('Invalid weather data')
  const description = describeWeather(current.weather_code)
  const weather = {
    ...description,
    temperature: current.temperature_2m,
    unit: WEATHER_UNIT === 'fahrenheit' ? 'F' : 'C',
    cloudCover: current.cloud_cover,
    windSpeed: current.wind_speed_10m,
  }
  weatherCache.set(cacheKey, { createdAt: Date.now(), weather })
  return weather
}

function numberToWords(number) {
  if (number < 20) return SMALL_NUMBERS[number]
  const tens = ['twenty', 'thirty', 'forty', 'fifty'][Math.floor(number / 10) - 2]
  return number % 10 ? `${tens}-${SMALL_NUMBERS[number % 10]}` : tens
}

function timeToWords(date) {
  const hour = date.getHours() % 12
  const minute = date.getMinutes()
  if (minute === 0) return `${NUMBER_WORDS[hour]} o'clock`
  if (minute === 15) return `quarter past ${NUMBER_WORDS[hour]}`
  if (minute === 30) return `half past ${NUMBER_WORDS[hour]}`
  if (minute === 45) return `quarter to ${NUMBER_WORDS[(hour + 1) % 12]}`
  if (minute < 30) return `${numberToWords(minute)} ${minute === 1 ? 'minute' : 'minutes'} past ${NUMBER_WORDS[hour]}`
  const remaining = 60 - minute
  return `${numberToWords(remaining)} ${remaining === 1 ? 'minute' : 'minutes'} to ${NUMBER_WORDS[(hour + 1) % 12]}`
}

function formatTime(date) {
  return new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function format24HourTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function quizAnswer(date, format) {
  if (format === 'words') return timeToWords(date)
  if (format === 'military') return format24HourTime(date)
  return formatTime(date)
}

function shuffled(items) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function dateAtMinute(minuteOfDay) {
  const date = new Date()
  date.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0)
  return date
}

function makeQuizQuestion(config, previousMinute) {
  const possibleTimes = Math.floor(1440 / config.increment)
  let minute = Math.floor(Math.random() * possibleTimes) * config.increment
  if (possibleTimes > 1 && minute === previousMinute) {
    minute = (minute + config.increment * (1 + Math.floor(Math.random() * (possibleTimes - 1)))) % 1440
  }

  const formats = ['digital', 'words', 'military']
  const format = config.format === 'mixed'
    ? formats[Math.floor(Math.random() * formats.length)]
    : config.format
  const answer = quizAnswer(dateAtMinute(minute), format)
  const answers = new Set([answer])
  const nearbyOffsets = shuffled([
    config.increment, -config.increment, config.increment * 2, -config.increment * 2,
    60, -60, 120, -120, 720,
  ])

  for (const offset of nearbyOffsets) {
    if (answers.size >= 4) break
    const alternateMinute = ((minute + offset) % 1440 + 1440) % 1440
    answers.add(quizAnswer(dateAtMinute(alternateMinute), format))
  }
  while (answers.size < 4) {
    const alternateMinute = Math.floor(Math.random() * possibleTimes) * config.increment
    answers.add(quizAnswer(dateAtMinute(alternateMinute), format))
  }

  return {
    minute,
    format,
    answer,
    choices: shuffled([...answers]).slice(0, 4),
  }
}

function getLightLevel(minutes, sunrise, sunset) {
  const twilight = 55
  if (minutes < sunrise - twilight || minutes > sunset + twilight) return 0
  if (minutes < sunrise) return (minutes - sunrise + twilight) / twilight
  if (minutes <= sunset) {
    const progress = (minutes - sunrise) / Math.max(1, sunset - sunrise)
    return 0.78 + Math.sin(progress * Math.PI) * 0.22
  }
  return 1 - (minutes - sunset) / twilight
}

function mixColor(from, to, amount) {
  const value = (index) => Math.round(from[index] + (to[index] - from[index]) * amount)
  return `rgb(${value(0)} ${value(1)} ${value(2)})`
}

function LocationOption({ location, onSelect }) {
  const locationTimeZone = normalizeTimeZone(location?.timezone)
  return (
    <button type="button" onClick={() => onSelect(location)}>
      <span>
        <strong>{location?.name || locationTimeZone.replaceAll('_', ' ')}</strong>
        <small>{[location?.admin1, location?.country].filter(Boolean).join(', ')}</small>
      </span>
      <em>{locationTimeZone.replaceAll('_', ' ')}</em>
    </button>
  )
}

function WeatherBackground({ weather }) {
  if (!weather || weather.kind === 'clear') return null
  const hasClouds = !['fog'].includes(weather.kind)
  const precipitation = ['rain', 'storm'].includes(weather.kind)

  return (
    <svg className={`weather-background weather-visual--${weather.kind}`} viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {hasClouds && (
        <>
          <g className="weather-cloud weather-cloud--one">
            <path d="M22 175 C25 135 58 109 99 115 C118 71 181 68 204 115 C251 103 292 135 289 178 Z" />
          </g>
          <g className="weather-cloud weather-cloud--two">
            <path d="M858 138 C859 103 887 79 922 84 C939 46 992 45 1013 84 C1054 74 1091 102 1088 141 Z" />
          </g>
        </>
      )}
      {precipitation && (
        <g className="weather-rain">
          {[62, 103, 144, 185, 226, 897, 938, 979, 1020, 1061].map((x, index) => (
            <line key={x} x1={x} y1={index < 5 ? 190 : 153} x2={x - 9} y2={index < 5 ? 224 : 187} />
          ))}
        </g>
      )}
      {weather.kind === 'snow' && (
        <g className="weather-snow">
          {[[55, 193], [102, 218], [150, 190], [199, 221], [247, 195], [892, 158], [941, 183], [990, 158], [1040, 185]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />
          ))}
        </g>
      )}
      {weather.kind === 'fog' && (
        <g className="weather-fog">
          <path d="M-30 156 C166 102 342 189 530 145 C718 101 886 168 1230 99" />
          <path d="M-45 221 C158 166 351 249 545 204 C741 159 930 224 1245 163" />
          <path d="M-20 286 C178 237 370 310 558 271 C754 229 947 282 1220 233" />
        </g>
      )}
      {weather.kind === 'storm' && <path className="weather-lightning" d="M186 177 L151 245 L183 238 L159 300 L226 217 L192 223 Z" />}
    </svg>
  )
}

function Landscape({ biome }) {
  return (
    <svg className={`landscape landscape--${biome}`} viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true">
      <g className="landscape-distant">
        {biome === 'mountain' || biome === 'tundra' ? (
          <>
            <path d="M0 205 L205 74 L330 171 L493 42 L690 196 L855 88 L1042 194 L1210 68 L1440 207 V300 H0 Z" />
            {biome === 'tundra' && <path className="snowcaps" d="M153 107 L205 74 L248 107 L219 99 L204 116 L190 99 Z M438 89 L493 42 L548 96 L510 82 L490 105 L474 79 Z M1164 105 L1210 68 L1260 111 L1225 98 L1208 116 L1194 96 Z" />}
          </>
        ) : (
          <path d="M0 211 Q150 120 315 190 Q475 103 651 193 Q839 91 1004 187 Q1202 111 1440 198 V300 H0 Z" />
        )}
      </g>

      {biome === 'coastal' && (
        <g className="landscape-water">
          <path d="M0 205 Q230 191 470 207 T930 204 T1440 201 V300 H0 Z" />
          <path className="wave" d="M0 224 Q95 211 190 224 T380 224 T570 224 T760 224 T950 224 T1140 224 T1330 224 T1520 224" />
          <path className="wave wave--two" d="M-80 251 Q20 238 120 251 T320 251 T520 251 T720 251 T920 251 T1120 251 T1320 251 T1520 251" />
        </g>
      )}

      <g className="landscape-near">
        {biome !== 'coastal' && <path d="M0 246 Q197 174 391 231 Q581 162 775 232 Q1000 151 1191 227 Q1325 190 1440 216 V300 H0 Z" />}
        {biome === 'coastal' && <path d="M0 251 Q150 180 328 236 L392 300 H0 Z M1110 300 Q1245 189 1440 232 V300 Z" />}
      </g>

      {biome === 'desert' && (
        <g className="biome-details desert-details">
          <path d="M0 249 Q215 185 430 244 T870 239 T1260 237 T1540 241 V300 H0 Z" />
          <path className="cactus" d="M1182 246 V174 Q1182 161 1193 161 Q1204 161 1204 174 V193 H1218 V180 Q1218 171 1227 171 Q1236 171 1236 181 V204 Q1236 215 1225 215 H1204 V246 Z" />
          <path className="cactus cactus--small" d="M256 254 V207 Q256 198 264 198 Q272 198 272 207 V218 H282 V211 Q282 204 289 204 Q296 204 296 212 V229 Q296 237 287 237 H272 V254 Z" />
        </g>
      )}

      {(biome === 'tropical' || biome === 'coastal') && (
        <g className="biome-details palm-details">
          <path className="palm-trunk" d="M196 259 Q217 211 205 157" />
          <path className="palm-leaves" d="M205 160 Q155 139 140 166 Q174 155 202 169 Q166 174 164 199 Q185 179 207 171 Q220 202 239 203 Q232 179 213 165 Q251 157 263 177 Q249 145 210 158 Q226 128 212 116 Q202 137 205 160 Z" />
          <path className="palm-trunk palm-trunk--right" d="M1261 254 Q1246 213 1257 177" />
          <path className="palm-leaves palm-leaves--right" d="M1257 179 Q1219 161 1205 181 Q1234 172 1255 186 Q1227 188 1227 207 Q1242 190 1260 187 Q1267 211 1284 213 Q1281 193 1265 182 Q1298 179 1307 197 Q1299 169 1262 177 Q1275 153 1264 143 Q1255 160 1257 179 Z" />
        </g>
      )}

      {biome === 'savanna' && (
        <g className="biome-details savanna-details">
          <path className="acacia" d="M1104 257 V201 Q1072 200 1057 182 Q1086 184 1095 171 Q1112 181 1127 170 Q1142 186 1175 182 Q1161 201 1123 201 V257 Z" />
          <path className="acacia acacia--small" d="M292 261 V224 Q272 223 261 211 Q280 212 286 203 Q297 211 307 204 Q316 215 337 212 Q327 225 307 224 V261 Z" />
        </g>
      )}

      {(biome === 'temperate' || biome === 'mountain' || biome === 'tundra') && (
        <g className="biome-details tree-details">
          {[132, 184, 1088, 1143, 1290].map((x, index) => (
            <g key={x} transform={`translate(${x} ${index % 2 ? 13 : 0})`}>
              <path className="tree-trunk" d="M-5 266 H5 V209 H-5 Z" />
              <path className="pine-tree" d="M0 166 L-29 220 H-15 L-37 252 H37 L15 220 H29 Z" />
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

function ClockFace({ date, sunrise, sunset, moon, onHandDown, interactive = true, animated = false }) {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const hourAngle = (hours % 12) * 30 + minutes * 0.5
  const minuteAngle = minutes * 6 + seconds * 0.1
  const minuteOfDay = hours * 60 + minutes
  const daylightProgress = Math.min(1, Math.max(0, (minuteOfDay - sunrise) / Math.max(1, sunset - sunrise)))
  const sunAngle = 205 + daylightProgress * 130
  const sunRadians = (sunAngle * Math.PI) / 180
  const sunX = 200 + Math.sin(sunRadians) * 148
  const sunY = 200 - Math.cos(sunRadians) * 148
  const sunVisible = minuteOfDay >= sunrise - 35 && minuteOfDay <= sunset + 35
  const isNight = minuteOfDay >= sunset || minuteOfDay < sunrise
  const nightLength = 1440 - sunset + sunrise
  const nightElapsed = minuteOfDay >= sunset
    ? minuteOfDay - sunset
    : minuteOfDay + 1440 - sunset
  const moonProgress = Math.min(1, Math.max(0, nightElapsed / nightLength))
  const moonAngle = 205 + moonProgress * 130
  const moonRadians = (moonAngle * Math.PI) / 180
  const moonX = 200 - Math.sin(moonRadians) * 145
  const moonY = 200 - Math.cos(moonRadians) * 145
  const moonRadius = 12
  const terminatorRadius = Math.max(0.01, moonRadius * Math.abs(Math.cos(moon.value * Math.PI * 2)))
  const waxing = moon.value <= 0.5
  const outerSweep = waxing ? 1 : 0
  const terminatorSweep = waxing
    ? (moon.value < 0.25 ? 0 : 1)
    : (moon.value < 0.75 ? 0 : 1)
  const moonPath = [
    `M ${moonX} ${moonY - moonRadius}`,
    `A ${moonRadius} ${moonRadius} 0 0 ${outerSweep} ${moonX} ${moonY + moonRadius}`,
    `A ${terminatorRadius} ${moonRadius} 0 0 ${terminatorSweep} ${moonX} ${moonY - moonRadius}`,
    'Z',
  ].join(' ')

  const ticks = Array.from({ length: 60 }, (_, index) => {
    const angle = index * 6
    const major = index % 5 === 0
    return (
      <line
        key={index}
        x1="200"
        y1={major ? '27' : '32'}
        x2="200"
        y2={major ? '43' : '39'}
        className={major ? 'tick tick--major' : 'tick'}
        transform={`rotate(${angle} 200 200)`}
      />
    )
  })

  const numbers = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1
    const angle = (number * 30 * Math.PI) / 180
    return (
      <text
        key={number}
        x={200 + Math.sin(angle) * 137}
        y={200 - Math.cos(angle) * 137}
        className="clock-number"
      >
        {number}
      </text>
    )
  })

  return (
    <svg className={`clock ${animated ? 'clock--animated' : ''}`} viewBox="0 0 400 400" role="img" aria-label={`Analog clock showing ${formatTime(date)}`}>
      <defs>
        <radialGradient id="clockGlow" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#fffdf2" />
          <stop offset="72%" stopColor="#f6edda" />
          <stop offset="100%" stopColor="#dcc8a8" />
        </radialGradient>
        <filter id="sunGlow" x="-200%" y="-200%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <circle cx="200" cy="200" r="190" className="clock-rim" />
      <circle cx="200" cy="200" r="177" fill="url(#clockGlow)" className="clock-face" />

      <g className={`sun-orbit ${sunVisible ? '' : 'sun-orbit--hidden'}`} aria-hidden="true">
        <circle cx={sunX} cy={sunY} r="18" className="sun-glow" filter="url(#sunGlow)" />
        <circle cx={sunX} cy={sunY} r="8" className="sun" />
      </g>

      <g className={`moon-orbit ${isNight ? '' : 'moon-orbit--hidden'}`} aria-hidden="true">
        <title>{`${moon.name}, ${Math.round(moon.illumination)}% illuminated`}</title>
        <circle cx={moonX} cy={moonY} r="22" className="moon-glow" filter="url(#sunGlow)" />
        <circle cx={moonX} cy={moonY} r={moonRadius} className="moon-shadow" />
        <path d={moonPath} className="moon-light" />
        <circle cx={moonX + 4} cy={moonY - 3} r="1.5" className="moon-crater" />
        <circle cx={moonX - 3} cy={moonY + 4} r="1" className="moon-crater" />
      </g>

      <g aria-hidden="true">{ticks}</g>
      <g aria-hidden="true">{numbers}</g>

      <g
        className={`hand-target ${interactive ? '' : 'hand-target--locked'}`}
        style={{ transform: `rotate(${hourAngle}deg)` }}
        onPointerDown={interactive ? (event) => onHandDown(event, 'hour') : undefined}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? 'Drag the hour hand' : undefined}
      >
        <line x1="200" y1="211" x2="200" y2="100" className="hand hand--hour" />
        <line x1="200" y1="218" x2="200" y2="93" className="hand-hit" />
      </g>
      <g
        className={`hand-target ${interactive ? '' : 'hand-target--locked'}`}
        style={{ transform: `rotate(${minuteAngle}deg)` }}
        onPointerDown={interactive ? (event) => onHandDown(event, 'minute') : undefined}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? 'Drag the minute hand' : undefined}
      >
        <line x1="200" y1="216" x2="200" y2="63" className="hand hand--minute" />
        <line x1="200" y1="222" x2="200" y2="55" className="hand-hit" />
      </g>
      <circle cx="200" cy="200" r="13" className="clock-pin-outer" />
      <circle cx="200" cy="200" r="5" className="clock-pin" />
    </svg>
  )
}

function App() {
  const [timeZone, setTimeZone] = useState(LOCAL_TIMEZONE)
  const [locationName, setLocationName] = useState(() => LOCAL_TIMEZONE.replaceAll('_', ' '))
  const [displayTime, setDisplayTime] = useState(() => getZonedDate(LOCAL_TIMEZONE))
  const [isLive, setIsLive] = useState(true)
  const [isAnswerVisible, setIsAnswerVisible] = useState(false)
  const [sunTimes, setSunTimes] = useState(DEFAULT_SUN)
  const [moon, setMoon] = useState(() => getApproxMoon())
  const [weather, setWeather] = useState(null)
  const [locationStatus, setLocationStatus] = useState('Finding your sky...')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationResults, setLocationResults] = useState([])
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false)
  const [isLocationSearching, setIsLocationSearching] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [savedPlaceLabel, setSavedPlaceLabel] = useState('')
  const [savedPlaces, setSavedPlaces] = useState(() => {
    try {
      const storedPlaces = JSON.parse(localStorage.getItem(SAVED_PLACES_KEY))
      if (!Array.isArray(storedPlaces)) return []
      return storedPlaces
        .filter((place) => place && typeof place.label === 'string')
        .map((place) => ({
          ...place,
          name: place.name || place.placeName || 'Saved place',
          timezone: normalizeTimeZone(place.timezone),
          latitude: Number(place.latitude),
          longitude: Number(place.longitude),
        }))
    } catch {
      return []
    }
  })
  const [quizStatus, setQuizStatus] = useState(null)
  const [quizConfig, setQuizConfig] = useState(DEFAULT_QUIZ_CONFIG)
  const [quiz, setQuiz] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [scores, setScores] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SCORE_KEY)) || []
    } catch {
      return []
    }
  })
  const clockWrapRef = useRef(null)
  const dragRef = useRef(null)
  const locationRequestRef = useRef(0)

  const requestCurrentLocation = () => {
    const requestId = ++locationRequestRef.current
    const detectedZone = normalizeTimeZone(LOCAL_TIMEZONE)
    setTimeZone(detectedZone)
    setLocationName(detectedZone.replaceAll('_', ' '))
    setSelectedLocation(null)
    setIsLocationSearchOpen(false)
    setLocationQuery('')
    if (!quizStatus) {
      setIsLive(true)
      setDisplayTime(getZonedDate(detectedZone))
    }
    if (!navigator.geolocation) {
      setLocationStatus('Location is not available in this browser')
      setSunTimes(DEFAULT_SUN)
      setMoon(getApproxMoon())
      setWeather(null)
      return
    }

    setLocationStatus('Finding your current location...')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const [skyResult, weatherResult] = await Promise.allSettled([
          getSkyData(coords.latitude, coords.longitude),
          getWeatherData(coords.latitude, coords.longitude),
        ])
        if (requestId !== locationRequestRef.current) return
        if (weatherResult.status === 'fulfilled') setWeather(weatherResult.value)
        else setWeather(null)
        if (skyResult.status === 'fulfilled') {
          const sky = skyResult.value
          const locationZone = normalizeTimeZone(sky.timeZone)
          setSunTimes(sky.sunTimes)
          setMoon(sky.moon)
          setTimeZone(locationZone)
          setLocationName(locationZone.replaceAll('_', ' '))
          setSelectedLocation({
            name: 'Current location',
            country: '',
            timezone: locationZone,
            latitude: coords.latitude,
            longitude: coords.longitude,
          })
          if (!quizStatus) {
            setIsLive(true)
            setDisplayTime(getZonedDate(locationZone))
          }
          setLocationStatus('Daylight matched to your current location')
        } else {
          setLocationStatus('Using a typical day')
        }
      },
      () => {
        if (requestId !== locationRequestRef.current) return
        setSunTimes(DEFAULT_SUN)
        setMoon(getApproxMoon())
        setWeather(null)
        setLocationStatus('Using your browser timezone with typical daylight')
      },
      { timeout: 8000, maximumAge: 60 * 60 * 1000 },
    )
  }

  useEffect(() => {
    if (!isLive) return undefined
    const update = () => setDisplayTime(getZonedDate(timeZone))
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [isLive, timeZone])

  useEffect(() => {
    requestCurrentLocation()
  }, [])

  useEffect(() => {
    const query = locationQuery.trim()
    if (query.length < 2) {
      setLocationResults([])
      setIsLocationSearching(false)
      return undefined
    }

    setIsLocationSearching(true)
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ name: query, count: '6', language: 'en', format: 'json' })
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Location search unavailable')
        const data = await response.json()
        setLocationResults(data.results || [])
      } catch (error) {
        if (error.name !== 'AbortError') setLocationResults([])
      } finally {
        if (!controller.signal.aborted) setIsLocationSearching(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [locationQuery])

  useEffect(() => {
    const onPointerMove = (event) => {
      if (!dragRef.current || !clockWrapRef.current) return
      const rect = clockWrapRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      let degrees = (Math.atan2(event.clientX - centerX, centerY - event.clientY) * 180) / Math.PI
      if (degrees < 0) degrees += 360

      const drag = dragRef.current
      let change = degrees - drag.lastDegrees
      if (change > 180) change -= 360
      if (change < -180) change += 360
      drag.unwrappedDegrees += change
      drag.lastDegrees = degrees

      const minutesPerDegree = drag.hand === 'minute' ? 1 / 6 : 2
      const minuteChange = Math.round(
        (drag.unwrappedDegrees - drag.initialDegrees) * minutesPerDegree,
      )
      const next = new Date(drag.startTime)
      const wrappedMinutes = ((drag.startMinuteOfDay + minuteChange) % 1440 + 1440) % 1440
      next.setHours(Math.floor(wrappedMinutes / 60), wrappedMinutes % 60, 0, 0)
      setDisplayTime(next)
    }
    const onPointerUp = () => {
      dragRef.current = null
      document.body.classList.remove('is-dragging')
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [])

  const startDragging = (event, hand) => {
    event.preventDefault()
    const initialDegrees = hand === 'minute'
      ? displayTime.getMinutes() * 6 + displayTime.getSeconds() * 0.1
      : (displayTime.getHours() % 12) * 30 + displayTime.getMinutes() * 0.5
    dragRef.current = {
      hand,
      lastDegrees: initialDegrees,
      initialDegrees,
      unwrappedDegrees: initialDegrees,
      startTime: displayTime.getTime(),
      startMinuteOfDay: displayTime.getHours() * 60 + displayTime.getMinutes(),
    }
    setIsLive(false)
    setIsAnswerVisible(false)
    document.body.classList.add('is-dragging')
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const returnToLive = () => {
    setDisplayTime(getZonedDate(timeZone))
    setIsLive(true)
    setIsAnswerVisible(false)
  }

  const selectLocation = async (location) => {
    if (!location) return
    const requestId = ++locationRequestRef.current
    const place = {
      name: location.placeName || location.name || 'Selected place',
      admin1: location.admin1 || '',
      country: location.country || '',
      timezone: normalizeTimeZone(location.timezone),
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    }
    setTimeZone(place.timezone)
    setLocationName(location.label || `${place.name}${place.admin1 ? `, ${place.admin1}` : ''}`)
    setSelectedLocation(place)
    setSavedPlaceLabel('')
    setLocationQuery('')
    setLocationResults([])
    setIsLocationSearchOpen(false)
    setLocationStatus(`Loading the sky over ${place.name}...`)
    if (!quizStatus) {
      setIsLive(true)
      setDisplayTime(getZonedDate(place.timezone))
    }

    const hasCoordinates = Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
    const [skyResult, weatherResult] = hasCoordinates
      ? await Promise.allSettled([
        getSkyData(place.latitude, place.longitude),
        getWeatherData(place.latitude, place.longitude),
      ])
      : [{ status: 'rejected' }, { status: 'rejected' }]
    if (requestId !== locationRequestRef.current) return
    if (weatherResult.status === 'fulfilled') setWeather(weatherResult.value)
    else setWeather(null)
    if (skyResult.status === 'fulfilled') {
      const sky = skyResult.value
      setSunTimes(sky.sunTimes)
      setMoon(sky.moon)
      setLocationStatus(`Daylight matched to ${place.name}`)
    } else {
      setSunTimes(DEFAULT_SUN)
      setMoon(getApproxMoon())
      setLocationStatus(`Showing ${place.name} with typical daylight`)
    }
  }

  const saveSelectedLocation = () => {
    const label = savedPlaceLabel.trim()
    if (!selectedLocation || !label) return
    const savedPlace = {
      ...selectedLocation,
      id: `${Date.now()}-${selectedLocation.timezone}`,
      label,
      placeName: selectedLocation.name,
    }
    setSavedPlaces((current) => {
      const next = [savedPlace, ...current.filter((place) => place.label.toLowerCase() !== label.toLowerCase())].slice(0, 12)
      try {
        localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(next))
      } catch {
        // Saved places still remain available for the current session.
      }
      return next
    })
    setLocationName(label)
    setSavedPlaceLabel('')
    setLocationStatus(`${selectedLocation.name} saved as ${label}`)
  }

  const removeSavedPlace = (id) => {
    setSavedPlaces((current) => {
      const next = current.filter((place) => place.id !== id)
      try {
        localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(next))
      } catch {
        // Saved places still remain available for the current session.
      }
      return next
    })
  }

  const openQuizSetup = () => {
    setIsLive(false)
    setIsAnswerVisible(false)
    setQuizStatus('setup')
    setQuiz(null)
  }

  const exitQuiz = () => {
    setQuizStatus(null)
    setQuiz(null)
    returnToLive()
  }

  const startQuiz = () => {
    const question = makeQuizQuestion(quizConfig)
    setIsLive(false)
    setQuiz({
      question,
      questionIndex: 0,
      score: 0,
      answeredCount: 0,
      answered: false,
      selected: undefined,
    })
    setSecondsLeft(quizConfig.timer === 'total30' ? 30 : quizConfig.timer)
    setQuizStatus('active')
    window.setTimeout(() => setDisplayTime(dateAtMinute(question.minute)), 80)
  }

  const chooseQuizAnswer = (choice) => {
    if (!quiz || quiz.answered) return
    setQuiz((current) => ({
      ...current,
      answered: true,
      selected: choice,
      score: current.score + (choice === current.question.answer ? 1 : 0),
      answeredCount: current.answeredCount + 1,
    }))
  }

  const finishQuiz = (score = quiz?.score || 0, total = quiz?.answeredCount || 0) => {
    const result = {
      score,
      total: quizConfig.timer === 'total30' ? total : quizConfig.questionCount,
      increment: quizConfig.increment,
      format: quizConfig.format,
      timer: quizConfig.timer,
      completedAt: new Date().toISOString(),
    }
    setScores((currentScores) => {
      const nextScores = [result, ...currentScores].slice(0, 20)
      try {
        localStorage.setItem(SCORE_KEY, JSON.stringify(nextScores))
      } catch {
        // Scores still remain available for the current session.
      }
      return nextScores
    })
    setQuizStatus('complete')
  }

  const nextQuizQuestion = () => {
    if (!quiz?.answered) return
    if (quizConfig.timer !== 'total30' && quiz.questionIndex + 1 >= quizConfig.questionCount) {
      finishQuiz()
      return
    }

    const question = makeQuizQuestion(quizConfig, quiz.question.minute)
    setQuiz((current) => ({
      ...current,
      question,
      questionIndex: current.questionIndex + 1,
      answered: false,
      selected: undefined,
    }))
    if (quizConfig.timer !== 'total30') setSecondsLeft(quizConfig.timer)
    setDisplayTime(dateAtMinute(question.minute))
  }

  const updateQuizConfig = (key, value) => {
    setQuizConfig((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    if (quizStatus !== 'active' || !quiz?.answered) return undefined
    const delay = quizConfig.timer === 'total30' ? 650 : 1500
    const timeout = window.setTimeout(nextQuizQuestion, delay)
    return () => window.clearTimeout(timeout)
  }, [quizStatus, quiz?.answered, quiz?.questionIndex, quizConfig.timer])

  useEffect(() => {
    if (quizStatus !== 'active' || !quiz || quizConfig.timer === 0) return undefined
    if (secondsLeft <= 0) {
      if (quizConfig.timer === 'total30') {
        finishQuiz()
      } else if (!quiz.answered) {
        setQuiz((current) => current ? { ...current, answered: true, selected: null } : current)
      }
      return undefined
    }
    if (quiz.answered && quizConfig.timer !== 'total30') return undefined
    const timeout = window.setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [quizStatus, quiz?.answered, quiz?.questionIndex, quizConfig.timer, secondsLeft])

  const minutes = displayTime.getHours() * 60 + displayTime.getMinutes()
  const lightLevel = getLightLevel(minutes, sunTimes.sunrise, sunTimes.sunset)
  const warmth = Math.max(0, 1 - Math.abs(minutes - sunTimes.sunrise) / 100, 1 - Math.abs(minutes - sunTimes.sunset) / 100)
  const skyTop = mixColor([22, 31, 64], [102, 183, 216], lightLevel)
  const skyBottomBase = mixColor([43, 43, 76], [230, 211, 151], lightLevel)
  const skyBottom = mixColor(
    skyBottomBase.match(/\d+/g).map(Number),
    [242, 157, 91],
    Math.min(0.72, Math.max(0, warmth) * (1 - lightLevel * 0.45)),
  )

  const dateLabel = new Intl.DateTimeFormat([], { weekday: 'long', month: 'long', day: 'numeric' }).format(displayTime)
  const scorePercents = scores
    .filter((result) => result.total > 0)
    .map((result) => Math.round((result.score / result.total) * 100))
  const bestPercent = scorePercents.length
    ? Math.max(...scorePercents)
    : null
  const biome = getBiome(timeZone, selectedLocation)

  return (
    <main className="app" style={{ '--sky-top': skyTop, '--sky-bottom': skyBottom, '--light': lightLevel }}>
      <div className="stars" aria-hidden="true" />
      <WeatherBackground weather={weather} />
      <Landscape biome={biome} />
      <header className="topbar">
        <a className="brand" href="/" aria-label="Round the Clock home">
          <span className="brand-mark" aria-hidden="true"><i /><i /></span>
          <span>ROUND THE CLOCK</span>
        </a>
        <div
          className="timezone-picker"
          onFocus={() => setIsLocationSearchOpen(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIsLocationSearchOpen(false)
          }}
        >
          <div className="location-pill" title={locationStatus}>
            <span className="location-dot" aria-hidden="true" />
            <label className="visually-hidden" htmlFor="timezone-search">Search for a city or timezone</label>
            <input
              id="timezone-search"
              type="search"
              value={locationQuery}
              placeholder={locationName}
              onChange={(event) => setLocationQuery(event.target.value)}
              aria-expanded={isLocationSearchOpen}
              aria-controls="location-results"
            />
            <button
              className="current-location-button"
              type="button"
              title="Use my current location"
              aria-label="Use my current location and timezone"
              onClick={requestCurrentLocation}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="2" x2="5" y1="12" y2="12" />
                <line x1="19" x2="22" y1="12" y2="12" />
                <line x1="12" x2="12" y1="2" y2="5" />
                <line x1="12" x2="12" y1="19" y2="22" />
                <circle cx="12" cy="12" r="7" />
              </svg>
            </button>
          </div>
          {isLocationSearchOpen && (
            <div className="location-results" id="location-results">
              {locationQuery.trim().length < 2 ? (
                <>
                  {selectedLocation && (
                    <form
                      className="save-place-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        saveSelectedLocation()
                      }}
                    >
                      <div>
                        <strong>Save this place</strong>
                        <small>{selectedLocation.name} / {selectedLocation.timezone.replaceAll('_', ' ')}</small>
                      </div>
                      <label>
                        <span className="visually-hidden">Custom label for this place</span>
                        <input
                          value={savedPlaceLabel}
                          placeholder="Custom label"
                          maxLength="30"
                          onChange={(event) => setSavedPlaceLabel(event.target.value)}
                        />
                      </label>
                      <button type="submit" disabled={!savedPlaceLabel.trim()}>SAVE</button>
                    </form>
                  )}
                  <p className="location-results-title">MAJOR TIMEZONES</p>
                  {[...new Set(MAJOR_TIMEZONES.map((location) => location.region))].map((region) => (
                    <section className="timezone-group" key={region}>
                      <h2>{region}</h2>
                      {MAJOR_TIMEZONES.filter((location) => location.region === region).map((location) => (
                        <LocationOption key={location.id} location={location} onSelect={selectLocation} />
                      ))}
                    </section>
                  ))}
                </>
              ) : (
                <>
                  {isLocationSearching && <p>Searching the world...</p>}
                  {!isLocationSearching && locationResults.length === 0 && <p>No matching places yet</p>}
                  {locationResults.map((location) => (
                    <LocationOption key={location.id} location={location} onSelect={selectLocation} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {savedPlaces.length > 0 && (
        <nav className="saved-timezones" aria-label="Saved timezones">
          <span>SAVED</span>
          <div>
            {savedPlaces.map((place) => (
              <article className="saved-timezone-pill" key={place.id}>
                <button type="button" onClick={() => selectLocation(place)}>
                  <strong>{place.label}</strong>
                  <small>{formatTime(getZonedDate(place.timezone))}</small>
                </button>
                <button
                  className="remove-saved-place"
                  type="button"
                  title={`Remove ${place.label}`}
                  aria-label={`Remove saved timezone ${place.label}`}
                  onClick={() => removeSavedPlace(place.id)}
                >&times;</button>
              </article>
            ))}
          </div>
        </nav>
      )}

      <section className={`lesson ${!quizStatus ? 'lesson--explore' : ''}`} aria-labelledby="page-title">
        <div className="intro">
          <p className="eyebrow">
            {quizStatus === 'setup' && 'BUILD YOUR TEST'}
            {quizStatus === 'active' && (quizConfig.timer === 'total30'
              ? `30-SECOND SPRINT / CLOCK ${quiz.questionIndex + 1}`
              : `QUESTION ${quiz.questionIndex + 1} OF ${quizConfig.questionCount}`)}
            {quizStatus === 'complete' && 'TEST COMPLETE'}
            {!quizStatus && 'LOOK UP AT THE SKY'}
          </p>
          <h1 id="page-title">
            {quizStatus === 'setup' && 'Choose your challenge'}
            {quizStatus === 'active' && 'Read the clock'}
            {quizStatus === 'complete' && 'Nicely done!'}
            {!quizStatus && 'What time is it?'}
          </h1>
          <p>
            {quizStatus === 'setup' && 'Pick what to practice. You can make it gentle or race the clock.'}
            {quizStatus === 'active' && 'Look closely at both hands, then choose the matching answer.'}
            {quizStatus === 'complete' && 'Every clock you read makes the next one easier.'}
            {!quizStatus && 'Move either hand to explore the day, or follow along with the real time.'}
          </p>
        </div>

        {!quizStatus && (
          <div className="mode-control" aria-label="Clock mode">
            <span className={isLive ? 'mode-dot mode-dot--live' : 'mode-dot'} />
            <div>
              <strong>{isLive ? 'LIVE TIME' : 'PRACTICE TIME'}</strong>
              <small>{isLive ? 'Ticking along now' : 'You are moving the clock'}</small>
            </div>
            {!isLive && <button type="button" onClick={returnToLive}>GO LIVE</button>}
            <button className="test-button" type="button" onClick={openQuizSetup}>TEST ME</button>
          </div>
        )}

        {quizStatus === 'active' && (
          <div className="quiz-hud" aria-label="Test progress">
            <div>
              <small>{quizConfig.timer === 'total30' ? 'CLOCK' : 'QUESTION'}</small>
              <strong>{quizConfig.timer === 'total30' ? `#${quiz.questionIndex + 1}` : `${quiz.questionIndex + 1}/${quizConfig.questionCount}`}</strong>
            </div>
            <div><small>SCORE</small><strong>{quiz.score}</strong></div>
            {quizConfig.timer !== 0 && (
              <div className={secondsLeft <= 3 && !quiz.answered ? 'quiz-timer quiz-timer--urgent' : 'quiz-timer'}>
                <small>TIME</small><strong>{secondsLeft}s</strong>
              </div>
            )}
            <button type="button" onClick={exitQuiz}>EXIT</button>
          </div>
        )}

        {quizStatus === 'setup' && (
          <section className="quiz-card quiz-setup">
            <div className="quiz-card-heading">
              <div>
                <span className="quiz-card-icon" aria-hidden="true">?</span>
                <div><strong>Clock test</strong><small>Your scores stay on this device</small></div>
              </div>
              {bestPercent != null && <p><small>YOUR BEST</small><strong>{bestPercent}%</strong></p>}
            </div>

            <fieldset>
              <legend>How precise should the times be?</legend>
              <div className="quiz-option-grid quiz-option-grid--four">
                {QUIZ_OPTIONS.increment.map((option) => (
                  <button
                    key={option.value}
                    className={quizConfig.increment === option.value ? 'quiz-option quiz-option--selected' : 'quiz-option'}
                    type="button"
                    onClick={() => updateQuizConfig('increment', option.value)}
                  >
                    <strong>{option.label}</strong><small>{option.detail}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>What should the answers look like?</legend>
              <div className="quiz-option-grid quiz-option-grid--four">
                {QUIZ_OPTIONS.format.map((option) => (
                  <button
                    key={option.value}
                    className={quizConfig.format === option.value ? 'quiz-option quiz-option--selected' : 'quiz-option'}
                    type="button"
                    onClick={() => updateQuizConfig('format', option.value)}
                  >
                    <strong>{option.label}</strong><small>{option.detail}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Choose your pace</legend>
              <div className="quiz-option-grid quiz-option-grid--four">
                {QUIZ_OPTIONS.timer.map((option) => (
                  <button
                    key={option.value}
                    className={quizConfig.timer === option.value ? 'quiz-option quiz-option--selected' : 'quiz-option'}
                    type="button"
                    onClick={() => updateQuizConfig('timer', option.value)}
                  >
                    <strong>{option.label}</strong><small>{option.detail}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="quiz-setup-footer">
              {quizConfig.timer !== 'total30' ? (
                <div className="question-count" aria-label="Number of questions">
                  <span>QUESTIONS</span>
                  {[5, 10].map((count) => (
                    <button
                      key={count}
                      className={quizConfig.questionCount === count ? 'selected' : ''}
                      type="button"
                      onClick={() => updateQuizConfig('questionCount', count)}
                    >{count}</button>
                  ))}
                </div>
              ) : (
                <p className="sprint-note">30 SECONDS / UNLIMITED CLOCKS</p>
              )}
              <button className="secondary-action" type="button" onClick={exitQuiz}>BACK TO CLOCK</button>
              <button className="primary-action" type="button" onClick={startQuiz}>START TEST <span>→</span></button>
            </div>

            {scores.length > 0 && (
              <div className="score-history">
                <span>RECENT SCORES</span>
                {scores.slice(0, 3).map((result) => (
                  <strong key={result.completedAt}>
                    {result.timer === 'total30' ? `${result.score} in 30s` : `${result.score}/${result.total}`}
                  </strong>
                ))}
              </div>
            )}
          </section>
        )}

        {(quizStatus === 'active' || !quizStatus) && (
          <div className={`clock-stage ${quizStatus === 'active' ? 'clock-stage--quiz' : ''}`} ref={clockWrapRef}>
            {!quizStatus && (
              <div className="sky-label sky-label--sunrise">
                <span>sunrise</span>
                <strong>{formatTime(new Date(2020, 0, 1, Math.floor(sunTimes.sunrise / 60), sunTimes.sunrise % 60))}</strong>
              </div>
            )}
            <ClockFace
              date={displayTime}
              sunrise={sunTimes.sunrise}
              sunset={sunTimes.sunset}
              moon={moon}
              onHandDown={startDragging}
              interactive={!quizStatus}
              animated={quizStatus === 'active'}
            />
            {weather && (
              <div className="weather-indicator" aria-label={`${weather.label}, ${Math.round(weather.temperature)} degrees ${weather.unit}`}>
                <small>NOW</small>
                <strong>{Math.round(weather.temperature)}°{weather.unit}</strong>
                <span>{weather.label}</span>
              </div>
            )}
            <div className="period-indicator" aria-label={`${displayTime.getHours() < 12 ? 'AM' : 'PM'} period`}>
              <small>PERIOD</small>
              <strong>{displayTime.getHours() < 12 ? 'AM' : 'PM'}</strong>
            </div>
            {!quizStatus && (
              <div className="sky-label sky-label--sunset">
                <span>sunset</span>
                <strong>{formatTime(new Date(2020, 0, 1, Math.floor(sunTimes.sunset / 60), sunTimes.sunset % 60))}</strong>
              </div>
            )}
          </div>
        )}

        {!quizStatus && <p className="drag-hint"><span aria-hidden="true">↖</span> Drag the hands to change the time</p>}

        {!quizStatus && (
          <section className={`answer ${isAnswerVisible ? 'answer--visible' : ''}`}>
            <div className="answer-content" aria-hidden={!isAnswerVisible}>
              <p>{dateLabel}</p>
              <strong>{formatTime(displayTime)}</strong>
              <span>{timeToWords(displayTime)}</span>
              <em><small>24-HOUR TIME</small>{format24HourTime(displayTime)}</em>
            </div>
            <button
              className="answer-cover"
              type="button"
              aria-expanded={isAnswerVisible}
              onClick={() => setIsAnswerVisible((visible) => !visible)}
            >
              <span className="eye" aria-hidden="true" />
              <strong>{isAnswerVisible ? 'HIDE THE ANSWER' : 'REVEAL THE ANSWER'}</strong>
              <small>{isAnswerVisible ? 'Try another time' : 'Make your guess first!'}</small>
            </button>
          </section>
        )}

        {quizStatus === 'active' && (
          <section className="quiz-answers" aria-live="polite">
            <div className="quiz-prompt">
              <span>{quiz.question.format === 'digital' && 'STANDARD TIME'}</span>
              <span>{quiz.question.format === 'words' && 'TIME IN WORDS'}</span>
              <span>{quiz.question.format === 'military' && '24-HOUR TIME'}</span>
              <strong>{quiz.answered ? 'Here is the answer' : 'Which answer matches?'}</strong>
            </div>
            <div className="choice-grid">
              {quiz.question.choices.map((choice, index) => {
                const isCorrect = quiz.answered && choice === quiz.question.answer
                const isWrong = quiz.answered && choice === quiz.selected && !isCorrect
                return (
                  <button
                    key={choice}
                    className={`quiz-choice ${isCorrect ? 'quiz-choice--correct' : ''} ${isWrong ? 'quiz-choice--wrong' : ''}`}
                    type="button"
                    disabled={quiz.answered}
                    onClick={() => chooseQuizAnswer(choice)}
                  >
                    <i>{String.fromCharCode(65 + index)}</i><span>{choice}</span>
                  </button>
                )
              })}
            </div>
            {quiz.answered && (
              <div className={`quiz-feedback ${quiz.selected === quiz.question.answer ? 'quiz-feedback--correct' : ''}`}>
                <div>
                  <strong>{quiz.selected === quiz.question.answer ? "That's right!" : quiz.selected == null ? "Time's up!" : 'Good try!'}</strong>
                  <span>
                    {quiz.selected === quiz.question.answer
                      ? 'You read both hands correctly.'
                      : `The answer is ${quiz.question.answer}.`}
                    {' '}{quizConfig.timer !== 'total30' && quiz.questionIndex + 1 === quizConfig.questionCount
                      ? 'Getting your results...'
                      : 'Next clock coming up...'}
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {quizStatus === 'complete' && (
          <section className="quiz-card results-card">
            <div className="result-burst" aria-hidden="true"><span>★</span></div>
            <p>YOUR SCORE</p>
            <strong className="result-score">
              {quiz.score}
              <small>{quizConfig.timer === 'total30' ? ' correct' : `/${quizConfig.questionCount}`}</small>
            </strong>
            <h2>
              {quizConfig.timer === 'total30' && `You read ${quiz.answeredCount} ${quiz.answeredCount === 1 ? 'clock' : 'clocks'} in 30 seconds!`}
              {quizConfig.timer !== 'total30' && quiz.score === quizConfig.questionCount && 'Perfect clock reading!'}
              {quizConfig.timer !== 'total30' && quiz.score < quizConfig.questionCount && quiz.score >= quizConfig.questionCount * 0.7 && 'You know your way around a clock!'}
              {quizConfig.timer !== 'total30' && quiz.score < quizConfig.questionCount * 0.7 && 'Keep turning those hands!'}
            </h2>
            <div className="result-actions">
              <button className="secondary-action" type="button" onClick={() => setQuizStatus('setup')}>CHANGE TEST</button>
              <button className="primary-action" type="button" onClick={startQuiz}>TRY AGAIN <span>↻</span></button>
            </div>
            <button className="text-action" type="button" onClick={exitQuiz}>Return to the live clock</button>
          </section>
        )}
      </section>

      <footer>
        <span>{locationStatus}</span>
        <span>Daylight by SunriseSunset.io / Weather by Open-Meteo</span>
      </footer>
    </main>
  )
}

export default App
