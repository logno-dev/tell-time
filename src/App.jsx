import { useEffect, useRef, useState } from 'react'

const DEFAULT_SUN = { sunrise: 6 * 60 + 30, sunset: 19 * 60 + 30 }
const NUMBER_WORDS = [
  'twelve', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
]
const SMALL_NUMBERS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
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

function ClockFace({ date, sunrise, sunset, moon, onHandDown }) {
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
    <svg className="clock" viewBox="0 0 400 400" role="img" aria-label={`Analog clock showing ${formatTime(date)}`}>
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

      <g className="period-badge" aria-hidden="true">
        <rect x="177" y="242" width="46" height="25" rx="12.5" />
        <text x="200" y="255">{hours < 12 ? 'AM' : 'PM'}</text>
      </g>

      <g
        className="hand-target"
        transform={`rotate(${hourAngle} 200 200)`}
        onPointerDown={(event) => onHandDown(event, 'hour')}
        role="button"
        aria-label="Drag the hour hand"
      >
        <line x1="200" y1="211" x2="200" y2="100" className="hand hand--hour" />
        <line x1="200" y1="218" x2="200" y2="93" className="hand-hit" />
      </g>
      <g
        className="hand-target"
        transform={`rotate(${minuteAngle} 200 200)`}
        onPointerDown={(event) => onHandDown(event, 'minute')}
        role="button"
        aria-label="Drag the minute hand"
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
  const [displayTime, setDisplayTime] = useState(() => new Date())
  const [isLive, setIsLive] = useState(true)
  const [isAnswerVisible, setIsAnswerVisible] = useState(false)
  const [sunTimes, setSunTimes] = useState(DEFAULT_SUN)
  const [moon, setMoon] = useState(() => getApproxMoon())
  const [locationStatus, setLocationStatus] = useState('Finding your sky...')
  const clockWrapRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    if (!isLive) return undefined
    const update = () => setDisplayTime(new Date())
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [isLive])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Using a typical day')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const params = new URLSearchParams({
            lat: String(coords.latitude),
            lng: String(coords.longitude),
          })
          const response = await fetch(`https://api.sunrisesunset.io/json?${params}`)
          if (!response.ok) throw new Error('Sun service unavailable')
          const data = await response.json()
          const sunrise = parseClockTime(data.results?.sunrise)
          const sunset = parseClockTime(data.results?.sunset)
          if (sunrise == null || sunset == null) throw new Error('Invalid sun times')
          setSunTimes({ sunrise, sunset })
          const moonValue = Number(data.results?.moon_phase_value)
          const moonIllumination = Number(data.results?.moon_illumination)
          if (Number.isFinite(moonValue)) {
            setMoon({
              value: moonValue,
              name: data.results?.moon_phase || getApproxMoon().name,
              illumination: Number.isFinite(moonIllumination)
                ? moonIllumination
                : getApproxMoon().illumination,
            })
          }
          setLocationStatus('Daylight matched to your location')
        } catch {
          setLocationStatus('Using a typical day')
        }
      },
      () => setLocationStatus('Using a typical day'),
      { timeout: 8000, maximumAge: 60 * 60 * 1000 },
    )
  }, [])

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
    setDisplayTime(new Date())
    setIsLive(true)
    setIsAnswerVisible(false)
  }

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

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')
  const dateLabel = new Intl.DateTimeFormat([], { weekday: 'long', month: 'long', day: 'numeric' }).format(displayTime)

  return (
    <main className="app" style={{ '--sky-top': skyTop, '--sky-bottom': skyBottom, '--light': lightLevel }}>
      <div className="stars" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="Round the Clock home">
          <span className="brand-mark" aria-hidden="true"><i /><i /></span>
          <span>ROUND THE CLOCK</span>
        </a>
        <div className="location-pill" title={locationStatus}>
          <span className="location-dot" aria-hidden="true" />
          <span>{timezone}</span>
        </div>
      </header>

      <section className="lesson" aria-labelledby="page-title">
        <div className="intro">
          <p className="eyebrow">LOOK UP AT THE SKY</p>
          <h1 id="page-title">What time is it?</h1>
          <p>Move either hand to explore the day, or follow along with the real time.</p>
        </div>

        <div className="mode-control" aria-label="Clock mode">
          <span className={isLive ? 'mode-dot mode-dot--live' : 'mode-dot'} />
          <div>
            <strong>{isLive ? 'LIVE TIME' : 'PRACTICE TIME'}</strong>
            <small>{isLive ? 'Ticking along now' : 'You are moving the clock'}</small>
          </div>
          {!isLive && <button type="button" onClick={returnToLive}>GO LIVE</button>}
        </div>

        <div className="clock-stage" ref={clockWrapRef}>
          <div className="sky-label sky-label--sunrise">
            <span>sunrise</span>
            <strong>{formatTime(new Date(2020, 0, 1, Math.floor(sunTimes.sunrise / 60), sunTimes.sunrise % 60))}</strong>
          </div>
          <ClockFace
            date={displayTime}
            sunrise={sunTimes.sunrise}
            sunset={sunTimes.sunset}
            moon={moon}
            onHandDown={startDragging}
          />
          <div className="sky-label sky-label--sunset">
            <span>sunset</span>
            <strong>{formatTime(new Date(2020, 0, 1, Math.floor(sunTimes.sunset / 60), sunTimes.sunset % 60))}</strong>
          </div>
        </div>

        <p className="drag-hint"><span aria-hidden="true">↖</span> Drag the hands to change the time</p>

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
      </section>

      <footer>
        <span>{locationStatus}</span>
        <span>Daylight data by SunriseSunset.io</span>
      </footer>
    </main>
  )
}

export default App
