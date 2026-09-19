import { useEffect, useRef, useState } from 'react'

const DEFAULT_SUN = { sunrise: 6 * 60 + 30, sunset: 19 * 60 + 30 }
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone
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

function getZonedDate(timeZone, instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
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
  const [locationStatus, setLocationStatus] = useState('Finding your sky...')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationResults, setLocationResults] = useState([])
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false)
  const [isLocationSearching, setIsLocationSearching] = useState(false)
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
  const manualLocationRef = useRef(false)

  useEffect(() => {
    if (!isLive) return undefined
    const update = () => setDisplayTime(getZonedDate(timeZone))
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [isLive, timeZone])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Using a typical day')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const sky = await getSkyData(coords.latitude, coords.longitude)
          if (manualLocationRef.current) return
          setSunTimes(sky.sunTimes)
          setMoon(sky.moon)
          if (sky.timeZone) setTimeZone(sky.timeZone)
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
    manualLocationRef.current = true
    setTimeZone(location.timezone)
    setLocationName(`${location.name}${location.admin1 ? `, ${location.admin1}` : ''}`)
    setLocationQuery('')
    setLocationResults([])
    setIsLocationSearchOpen(false)
    setLocationStatus(`Loading the sky over ${location.name}...`)
    if (!quizStatus) {
      setIsLive(true)
      setDisplayTime(getZonedDate(location.timezone))
    }

    try {
      const sky = await getSkyData(location.latitude, location.longitude)
      setSunTimes(sky.sunTimes)
      setMoon(sky.moon)
      setLocationStatus(`Daylight matched to ${location.name}`)
    } catch {
      setSunTimes(DEFAULT_SUN)
      setMoon(getApproxMoon())
      setLocationStatus(`Showing ${location.name} with typical daylight`)
    }
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

  return (
    <main className="app" style={{ '--sky-top': skyTop, '--sky-bottom': skyBottom, '--light': lightLevel }}>
      <div className="stars" aria-hidden="true" />
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
          <label className="location-pill" title={locationStatus}>
            <span className="location-dot" aria-hidden="true" />
            <span className="visually-hidden">Search for a city or timezone</span>
            <input
              type="search"
              value={locationQuery}
              placeholder={locationName}
              onChange={(event) => setLocationQuery(event.target.value)}
              aria-expanded={isLocationSearchOpen && locationQuery.trim().length >= 2}
              aria-controls="location-results"
            />
            <span className="search-mark" aria-hidden="true" />
          </label>
          {isLocationSearchOpen && locationQuery.trim().length >= 2 && (
            <div className="location-results" id="location-results">
              {isLocationSearching && <p>Searching the world...</p>}
              {!isLocationSearching && locationResults.length === 0 && <p>No matching places yet</p>}
              {locationResults.map((location) => (
                <button key={location.id} type="button" onClick={() => selectLocation(location)}>
                  <span><strong>{location.name}</strong><small>{[location.admin1, location.country].filter(Boolean).join(', ')}</small></span>
                  <em>{location.timezone.replaceAll('_', ' ')}</em>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

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
        <span>Daylight data by SunriseSunset.io</span>
      </footer>
    </main>
  )
}

export default App
