import { useEffect, useState } from 'react'
import { api, distanceM, errorMessage, fmtDistance, LISTEN_RADIUS_M, type Echo, type OpenDoor } from './api'
import type { LatLng } from './useLocation'
import { useRecorder } from './useRecorder'
import { Icon } from './Icon'
import { Player } from './Player'

type Props = {
  echo: Echo
  me: LatLng
  liked: boolean
  mine: boolean
  authorKey?: string
  onClose: () => void
  onChanged: (e: Echo | null) => void
  onListened: (e: Echo) => void
  onLike: (on: boolean) => void
}

export function EchoSheet({ echo, me, liked, mine, authorKey, onClose, onChanged, onListened, onLike }: Props) {
  const dist = distanceM(me.lat, me.lng, echo.lat, echo.lng)
  // Your own echoes play from anywhere; everyone else's are locked to the spot.
  const inRange = dist <= LISTEN_RADIUS_M || !!authorKey
  const [unlocked, setUnlocked] = useState(false)
  const [replying, setReplying] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Opening an echo you can hear unlocks it immediately: no extra tap, the
  // waveform just appears. Locked ones show the lock card.
  useEffect(() => {
    setUnlocked(false)
    setReplying(false)
    setErr(null)
    if (!inRange) return
    let alive = true
    api
      .listen(echo.id, me.lat, me.lng, authorKey)
      .then((r) => {
        if (!alive) return
        setUnlocked(true)
        onListened(r.echo)
      })
      .catch((e) => alive && setErr(errorMessage(e, `Too far. Get within ${LISTEN_RADIUS_M} m to listen.`)))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [echo.id, inRange])

  async function toggleLike() {
    setErr(null)
    try {
      const updated = liked ? await api.unlike(echo.id) : await api.like(echo.id)
      onLike(!liked)
      onChanged(updated)
    } catch (e) {
      setErr(errorMessage(e, 'Could not save'))
    }
  }

  async function retire() {
    await api.retire(echo.id)
    onChanged(null)
  }

  return (
    <div className="sheet">
      <div className="grabber" />
      <div className="sheet-head">
        <div className="titles">
          {echo.legend && (
            <div className="tag">
              <Icon name="star" size={14} fill /> Legend
            </div>
          )}
          {!echo.legend && (echo.community || echo.openDoor) && (
            <div className="tag green">
              <Icon name="door_open" size={14} fill /> {echo.community ? 'Community' : 'Open door'}
            </div>
          )}
          {echo.flagged && (
            <div className="tag gray">
              <Icon name="favorite" size={14} fill /> Support
            </div>
          )}
          <h2>{echo.title ?? echo.community ?? echo.place}</h2>
          <div className="sub">
            {echo.place} · {fmtDistance(dist)} away
          </div>
        </div>
        <button className="close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={18} weight={600} />
        </button>
      </div>

      {unlocked ? (
        <Player src={api.audioUrl(echo.id)} />
      ) : inRange ? (
        <div className="player placeholder" aria-hidden />
      ) : (
        <div className="group center">
          <strong>
            <Icon name="lock" size={18} fill /> Locked to this spot
          </strong>
          Walk to {echo.place} to hear it. {fmtDistance(dist)} to go.
        </div>
      )}

      {err && <div className="note err">{err}</div>}
      {echo.transcript && <p className={`transcript ${unlocked ? '' : 'hidden'}`}>{echo.transcript}</p>}

      <div className="row">
        <button className={`btn small ${liked ? 'on' : ''}`} onClick={toggleLike} disabled={!unlocked && !liked}>
          <Icon name="favorite" size={18} fill={liked} /> Like · {echo.likes}
        </button>
        <span className="spacer" />
        <span className="stat">{echo.listens} listens</span>
      </div>

      {echo.openDoor && <Door door={echo.openDoor} />}
      {echo.flagged && echo.resource && (
        <div className="group resource" style={{ marginTop: 12 }}>
          <div className="label">
            <Icon name="favorite" size={14} fill /> You're not alone
          </div>
          {echo.resource}
        </div>
      )}

      <div className="section">Replies · {echo.replies.length}</div>
      {echo.replies.map((r) => (
        <div className="reply" key={r.id}>
          <div className="row">
            <Player src={api.replyAudioUrl(echo.id, r.id)} small />
            <span className="stat">Anonymous</span>
          </div>
          {r.transcript}
          {r.openDoor && <Door door={r.openDoor} />}
        </div>
      ))}
      {unlocked && !replying && (
        <button className="btn" onClick={() => setReplying(true)}>
          <Icon name="mic" size={20} fill /> Reply with your voice
        </button>
      )}
      {replying && (
        <ReplyForm
          echoId={echo.id}
          onDone={(e) => {
            setReplying(false)
            if (e) onChanged(e)
          }}
        />
      )}

      {mine && (
        <div className="row" style={{ marginTop: 16, justifyContent: 'center' }}>
          <button className="btn text danger" onClick={retire}>
            Retire my echo
          </button>
        </div>
      )}
    </div>
  )
}

function Door({ door }: { door: OpenDoor }) {
  return (
    <div className="group door" style={{ marginTop: 12, marginBottom: 0 }}>
      <div className="label">
        <Icon name="door_open" size={14} fill /> Open door
      </div>
      <strong>{door.name}</strong>
      <div className="meta">
        {door.when} · {door.where}
      </div>
    </div>
  )
}

function ReplyForm({ echoId, onDone }: { echoId: string; onDone: (e: Echo | null) => void }) {
  const r = useRecorder()
  const [door, setDoor] = useState<OpenDoor>({ name: '', when: '', where: '' })
  const [showDoor, setShowDoor] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function send() {
    if (!r.blob) return
    setBusy(true)
    const f = new FormData()
    f.append('audio', r.blob, r.blob.type === 'audio/wav' ? 'reply.wav' : 'reply.webm')
    f.append('transcript', r.transcript)
    if (door.name) {
      f.append('doorName', door.name)
      f.append('doorWhen', door.when)
      f.append('doorWhere', door.where)
    }
    try {
      onDone(await api.createReply(echoId, f))
    } catch (e) {
      setErr(errorMessage(e, 'Could not send reply'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="reply">
      <button className={`rec ${r.recording ? 'on' : ''}`} onClick={r.recording ? r.stop : r.start} aria-label="Record">
        <span className="inner" />
      </button>
      <div className="timer">{r.recording ? `${r.seconds.toFixed(0)}s` : r.blob ? 'Recorded' : 'Tap to record'}</div>
      {(r.error || err) && <div className="note err">{r.error ?? err}</div>}
      {r.transcript && (
        <div className="group">
          <div className="label">Transcript</div>
          {r.transcript}
        </div>
      )}
      {!showDoor ? (
        <button className="disclosure" onClick={() => setShowDoor(true)}>
          <Icon name="add_circle" size={18} fill /> Add an open door
        </button>
      ) : (
        <DoorFields door={door} setDoor={setDoor} />
      )}
      <div className="row">
        <button className="btn text" onClick={() => onDone(null)}>
          Cancel
        </button>
        <span className="spacer" />
        <button className="btn small filled" disabled={!r.blob || busy} onClick={send}>
          Send
        </button>
      </div>
    </div>
  )
}

export function DoorFields({ door, setDoor }: { door: OpenDoor; setDoor: (d: OpenDoor) => void }) {
  return (
    <>
      <label className="field">
        <span>Open door · club or event</span>
        <input value={door.name} onChange={(e) => setDoor({ ...door, name: e.target.value })} placeholder="Climbing club" />
      </label>
      <div className="row" style={{ alignItems: 'stretch' }}>
        <label className="field" style={{ flex: 1 }}>
          <input value={door.when} onChange={(e) => setDoor({ ...door, when: e.target.value })} placeholder="Wednesdays 7pm" />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <input value={door.where} onChange={(e) => setDoor({ ...door, where: e.target.value })} placeholder="UREC" />
        </label>
      </div>
    </>
  )
}
