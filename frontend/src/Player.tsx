import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'

const BARS_FULL = 56
const BARS_SMALL = 28

// One shared AudioContext; created lazily so the first user gesture unlocks it.
let sharedCtx: AudioContext | null = null
function audioContext() {
  if (!sharedCtx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedCtx = new Ctx()
  }
  return sharedCtx
}

/** Peaks from the decoded audio, one per bar, normalised to 0..1. */
function peaksOf(buffer: AudioBuffer, bars: number): number[] {
  const data = buffer.getChannelData(0)
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
}

function fmt(s: number) {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/**
 * Playback runs through Web Audio rather than <audio>: recordings from
 * MediaRecorder (webm) carry no seek index, so <audio> cannot scrub them,
 * while a decoded AudioBuffer can start from any offset.
 */
export function Player({ src, small }: { src: string; small?: boolean }) {
  const bars = small ? BARS_SMALL : BARS_FULL
  const trackEl = useRef<HTMLDivElement>(null)
  const buffer = useRef<AudioBuffer | null>(null)
  const source = useRef<AudioBufferSourceNode | null>(null)
  const startedAt = useRef(0) // ctx.currentTime when playback (re)started, minus offset
  const offset = useRef(0) // position in seconds while paused
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const flat = useMemo(() => Array.from({ length: bars }, () => 0.35), [bars])

  const stopSource = useCallback(() => {
    if (source.current) {
      source.current.onended = null
      try {
        source.current.stop()
      } catch {
        /* already stopped */
      }
      source.current.disconnect()
      source.current = null
    }
  }, [])

  useEffect(() => {
    let alive = true
    offset.current = 0
    setTime(0)
    setPlaying(false)
    setPeaks(null)
    fetch(src)
      .then((r) => r.arrayBuffer())
      .then((b) => audioContext().decodeAudioData(b))
      .then((buf) => {
        if (!alive) return
        buffer.current = buf
        setDuration(buf.duration)
        setPeaks(peaksOf(buf, bars))
      })
      .catch(() => {})
    return () => {
      alive = false
      stopSource()
      buffer.current = null
    }
  }, [src, bars, stopSource])

  const startAt = useCallback(
    (from: number) => {
      const buf = buffer.current
      if (!buf) return
      const ctx = audioContext()
      stopSource()
      const node = ctx.createBufferSource()
      node.buffer = buf
      node.connect(ctx.destination)
      node.onended = () => {
        // Natural end (not a manual stop): rewind.
        source.current = null
        offset.current = 0
        setTime(0)
        setPlaying(false)
      }
      node.start(0, from)
      source.current = node
      startedAt.current = ctx.currentTime - from
      setPlaying(true)
    },
    [stopSource],
  )

  function pause() {
    offset.current = Math.min(duration, audioContext().currentTime - startedAt.current)
    stopSource()
    setTime(offset.current)
    setPlaying(false)
  }

  function toggle() {
    const ctx = audioContext()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    if (playing) pause()
    else startAt(offset.current)
  }

  // Smooth progress while playing.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      setTime(Math.min(duration, audioContext().currentTime - startedAt.current))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, duration])

  function seekFromPointer(e: React.PointerEvent) {
    const el = trackEl.current
    if (!el || !duration) return
    const r = el.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const to = frac * duration
    offset.current = to
    setTime(to)
    if (playing) startAt(to)
  }

  const progress = duration ? Math.min(1, time / duration) : 0
  const data = peaks ?? flat

  return (
    <div className={`player ${small ? 'small' : ''}`}>
      <button className={`play ${small ? 'small' : ''}`} onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} disabled={!duration}>
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
            <span>{fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
