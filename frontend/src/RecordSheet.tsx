import { useEffect, useState } from 'react'
import { api, errorMessage, type Echo, type OpenDoor, type Screening } from './api'
import type { LatLng } from './useLocation'
import { MAX_SECONDS, useRecorder } from './useRecorder'
import { DoorFields } from './EchoSheet'
import { Icon } from './Icon'

type Props = {
  me: LatLng
  nearestPlace: string
  onClose: () => void
  onCreated: (e: Echo) => void
}

export function RecordSheet({ me, nearestPlace, onClose, onCreated }: Props) {
  const r = useRecorder()
  const [place, setPlace] = useState(nearestPlace)
  const [door, setDoor] = useState<OpenDoor>({ name: '', when: '', where: '' })
  const [showDoor, setShowDoor] = useState(false)
  const [screening, setScreening] = useState<Screening | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Live guardrail preview while the transcript changes.
  useEffect(() => {
    if (!r.transcript.trim()) return setScreening(null)
    const t = setTimeout(() => api.screen(r.transcript).then(setScreening).catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [r.transcript])

  async function post() {
    if (!r.blob) return
    setBusy(true)
    const f = new FormData()
    f.append('audio', r.blob, r.blob.type === 'audio/wav' ? 'echo.wav' : 'echo.webm')
    f.append('lat', String(me.lat))
    f.append('lng', String(me.lng))
    f.append('place', place.trim() || nearestPlace)
    f.append('tone', door.name ? 'community' : 'honest')
    f.append('transcript', r.transcript)
    f.append('duration', r.seconds.toFixed(1))
    if (door.name) {
      f.append('doorName', door.name)
      f.append('doorWhen', door.when)
      f.append('doorWhere', door.where)
    }
    try {
      onCreated(await api.createEcho(f))
    } catch (e) {
      setErr(errorMessage(e, 'Could not post echo'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet">
      <div className="grabber" />
      <div className="sheet-head">
        <div className="titles">
          <h2>New echo</h2>
          <div className="sub">Pinned to where you stand. Anonymous, voice only.</div>
        </div>
        <button className="close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={18} weight={600} />
        </button>
      </div>

      <button className={`rec ${r.recording ? 'on' : ''}`} onClick={r.recording ? r.stop : r.start} aria-label="Record">
        <span className="inner" />
      </button>
      <div className="timer">
        {r.recording
          ? `${r.seconds.toFixed(0)}s / ${MAX_SECONDS}s`
          : r.blob
            ? `Recorded ${r.seconds.toFixed(0)}s · tap to redo`
            : `Tap to record, up to ${MAX_SECONDS}s`}
      </div>
      {(r.error || err) && <div className="note err">{r.error ?? err}</div>}

      {r.transcript && (
        <div className="group">
          <div className="label">Transcript</div>
          {r.transcript}
        </div>
      )}
      {screening?.blocked && <div className="note err">{screening.reason}</div>}
      {screening?.flagged && !screening.blocked && (
        <div className="note">This sounds heavy. It can still go live, with a support card next to it. It stays out of Legends.</div>
      )}
      {screening && !screening.blocked && !screening.flagged && <div className="note ok">Passes the guardrails</div>}

      <label className="field">
        <span>Place</span>
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Hartman Hall" />
      </label>

      {!showDoor ? (
        <button className="disclosure" onClick={() => setShowDoor(true)}>
          <Icon name="add_circle" size={18} fill /> Add an open door
        </button>
      ) : (
        <DoorFields door={door} setDoor={setDoor} />
      )}

      <button className="btn filled" disabled={!r.blob || busy || !!screening?.blocked} onClick={post}>
        Post echo
      </button>
    </div>
  )
}
