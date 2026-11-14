import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'

const BARS_FULL = 56
const BARS_SMALL = 28

/** Peaks from the decoded audio, one per bar, normalised to 0..1. */
async function loadPeaks(src: string, bars: number): Promise<number[] | null> {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const buf = await ctx.decodeAudioData(await (await fetch(src)).arrayBuffer())
    ctx.close().catch(() => {})
    const data = buf.getChannelData(0)
    const per = Math.max(1, Math.floor(data.length / bars))
    const peaks: number[] = []
    for (let i = 0; i < bars; i++) {
      let sum = 0
      const start = i * per
      for (let j = start; j < start + per && j < data.length; j += 4) sum += data[j] * data[j]
      peaks.push(Math.sqrt(sum / (per / 4)))
    }
    const max = Math.max(0.01, ...peaks)
    return peaks.map((p) => Math.max(0.08, p / max))
  } catch {
    return null
  }
}

function fmt(s: number) {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/**
 * Playback goes through an <audio> element: on iPhones that is the only path
 * that ignores the ringer switch and behaves like media. Web Audio is used
 * only to draw the waveform. Echoes are stored as WAV (see wav.ts), which
 * every phone can play and seek.
 */
export function Player({ src, small }: { src: string; small?: boolean }) {
  const bars = small ? BARS_SMALL : BARS_FULL
  const audio = useRef<HTMLAudioElement | null>(null)
  const trackEl = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const flat = useMemo(() => Array.from({ length: bars }, () => 0.35), [bars])

  useEffect(() => {
    const a = new Audio()
    a.preload = 'auto'
    a.src = src
    a.setAttribute('playsinline', '')
    const onMeta = () => {
      if (isFinite(a.duration)) setDuration(a.duration)
      setReady(true)
    }
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('durationchange', onMeta)
    a.addEventListener('canplay', () => setReady(true))
    a.addEventListener('timeupdate', () => setTime(a.currentTime))
    a.addEventListener('ended', () => {
      setPlaying(false)
      setTime(0)
    })
    a.addEventListener('pause', () => setPlaying(false))
    a.addEventListener('play', () => setPlaying(true))
    a.addEventListener('error', () => setError('This recording cannot be played on this device'))
    audio.current = a
    let alive = true
    setPeaks(null)
    setError(null)
    setReady(false)
    setDuration(0)
    setTime(0)
    loadPeaks(src, bars).then((p) => alive && setPeaks(p))
    return () => {
      alive = false
      a.pause()
      a.removeAttribute('src')
      a.load()
      audio.current = null
    }
  }, [src, bars])

  // Smooth progress while playing (timeupdate alone is ~4 Hz).
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      if (audio.current) setTime(audio.current.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  function toggle() {
    const a = audio.current
    if (!a) return
    if (playing) a.pause()
    else a.play().catch(() => setError('Tap again to play'))
  }

  function seekFromPointer(e: React.PointerEvent) {
    const a = audio.current
    const el = trackEl.current
    if (!a || !el || !duration) return
    const r = el.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    a.currentTime = frac * duration
    setTime(a.currentTime)
  }

  const progress = duration ? Math.min(1, time / duration) : 0
  const data = peaks ?? flat

  return (
    <div className={`player ${small ? 'small' : ''}`}>
      <button className={`play ${small ? 'small' : ''}`} onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} disabled={!ready && !error}>
        <Icon name={playing ? 'pause' : 'play_arrow'} size={small ? 20 : 26} fill />
      </button>
      <div className="track">
        <div
          className="bars"
          ref={trackEl}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            seekFromPointer(e)
          }}
          onPointerMove={(e) => e.buttons === 1 && seekFromPointer(e)}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={time}
        >
          <div className="layer base">
            {data.map((h, i) => (
              <i key={i} style={{ height: `${h * 100}%` }} />
            ))}
          </div>
          <div className="layer fill" style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}>
            {data.map((h, i) => (
              <i key={i} style={{ height: `${h * 100}%` }} />
            ))}
          </div>
        </div>
        {!small && (
          <div className="times">
            <span>{error ?? fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
