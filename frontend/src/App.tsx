import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, distanceM, OFFLINE_MSG, type Echo, type HeatPoint } from './api'
import { KNOWN_PLACES, useLocation } from './useLocation'
import { MapView } from './MapView'
import { EchoSheet } from './EchoSheet'
import { RecordSheet } from './RecordSheet'
import { LegendsPage, MePage, PassportPage } from './Pages'
import { Icon } from './Icon'

type Tab = 'map' | 'legends' | 'passport' | 'me'

function useLocalList(key: string) {
  const [list, setList] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]')
    } catch {
      return []
    }
  })
  const save = (next: string[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* private mode */
    }
    return next
  }
  const add = useCallback((id: string) => setList((l) => (l.includes(id) ? l : save([...l, id]))), [key])
  const remove = useCallback((id: string) => setList((l) => save(l.filter((x) => x !== id))), [key])
  return [list, add, remove] as const
}

/** Author keys for echoes recorded on this device, so they play from anywhere. */
function useAuthorKeys() {
  const [keys, setKeys] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('echoes.keys') ?? '{}')
    } catch {
      return {}
    }
  })
  const add = useCallback((id: string, key: string) => {
    setKeys((k) => {
      const next = { ...k, [id]: key }
      try {
        localStorage.setItem('echoes.keys', JSON.stringify(next))
      } catch {
        /* private mode */
      }
      return next
    })
  }, [])
  return [keys, add] as const
}

export default function App() {
  const loc = useLocation()
  const [echoes, setEchoes] = useState<Echo[]>([])
  const [heat, setHeat] = useState<HeatPoint[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('map')
  const [recording, setRecording] = useState(false)
  const [offline, setOffline] = useState(false)
  const [heard, addHeard] = useLocalList('echoes.heard')
  const [mine, addMine] = useLocalList('echoes.mine')
  const [meTooed, addMeTooed, removeMeTooed] = useLocalList('echoes.metoo')
  const [authorKeys, addAuthorKey] = useAuthorKeys()

  const pos = loc.position
  const refresh = useCallback(async () => {
    const [e, h] = await Promise.all([api.listEchoes(pos), api.heat()])
    setEchoes(e)
    setHeat(h)
    setOffline(false)
  }, [pos])

  useEffect(() => {
    refresh().catch(() => setOffline(true))
    // Keep trying while the backend is down so the banner clears on its own.
    const t = window.setInterval(() => refresh().catch(() => setOffline(true)), 5000)
    return () => window.clearInterval(t)
  }, [refresh])

  // ?echo=<id> opens that echo on load.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('echo')
    if (id) setSelectedId(id)
  }, [])

  const selected = useMemo(() => echoes.find((e) => e.id === selectedId) ?? null, [echoes, selectedId])

  const nearestPlace = useMemo(() => {
    let best = 'Somewhere on campus'
    let bestD = 200
    const spots = [...KNOWN_PLACES.map((k) => ({ place: k.name, lat: k.lat, lng: k.lng })), ...echoes]
    for (const s of spots) {
      const d = distanceM(loc.position.lat, loc.position.lng, s.lat, s.lng)
      if (d < bestD) {
        bestD = d
        best = s.place
      }
    }
    return best
  }, [echoes, loc.position])

  function applyChange(updated: Echo | null) {
    if (!updated) {
      setEchoes((l) => l.filter((e) => e.id !== selectedId))
      setSelectedId(null)
    } else {
      setEchoes((l) => l.map((e) => (e.id === updated.id ? updated : e)))
    }
    api.heat().then(setHeat).catch(() => {})
  }

  function pick(e: Echo) {
    setSelectedId(e.id)
    setTab('map')
  }

  function startRecording() {
    setTab('map')
    setSelectedId(null)
    setRecording(true)
  }

  return (
    <div className="stage">
      <div className="phone">
        <div className="status-bar" />
        <div className="screen">
          {offline && <div className="banner">{OFFLINE_MSG}</div>}
          {tab === 'map' && (
            <>
              <div className="map-wrap">
                <MapView
                  echoes={echoes}
                  heat={heat}
                  me={loc.position}
                  gpsFix={loc.mode === 'gps' && loc.hasGps ? loc.position : null}
                  selected={selected}
                  onSelect={(e) => setSelectedId(e?.id ?? null)}
                />
              </div>
              {selected && !recording && (
                <EchoSheet
                  echo={selected}
                  me={loc.position}
                  meTooed={meTooed.includes(selected.id)}
                  mine={mine.includes(selected.id)}
                  authorKey={authorKeys[selected.id]}
                  onClose={() => setSelectedId(null)}
                  onChanged={applyChange}
                  onMeToo={(on) => (on ? addMeTooed(selected.id) : removeMeTooed(selected.id))}
                  onListened={(e) => {
                    addHeard(e.id)
                    applyChange(e)
                  }}
                />
              )}
              {recording && (
                <RecordSheet
                  me={loc.position}
                  nearestPlace={nearestPlace}
                  onClose={() => setRecording(false)}
                  onCreated={(e) => {
                    addMine(e.id)
                    if (e.authorKey) addAuthorKey(e.id, e.authorKey)
                    setRecording(false)
                    setEchoes((l) => [e, ...l])
                    setSelectedId(e.id)
                    api.heat().then(setHeat).catch(() => {})
                  }}
                />
              )}
            </>
          )}
          {tab === 'legends' && <LegendsPage echoes={echoes} heat={heat} onPick={pick} />}
          {tab === 'passport' && <PassportPage echoes={echoes} heard={heard} />}
          {tab === 'me' && <MePage echoes={echoes} heard={heard} mine={mine} meTooed={meTooed} onPick={pick} />}
        </div>

        <nav className="tabbar">
          <button className={`tab ${tab === 'map' ? 'on' : ''}`} onClick={() => setTab('map')}>
            <Icon name="map" size={26} fill={tab === 'map'} />
            Map
          </button>
          <button className={`tab ${tab === 'legends' ? 'on' : ''}`} onClick={() => setTab('legends')}>
            <Icon name="star" size={26} fill={tab === 'legends'} />
            Legends
          </button>
          <button className="tab record" onClick={startRecording}>
            <span className="fab">
              <Icon name="mic" size={28} fill />
            </span>
            Echo
          </button>
          <button className={`tab ${tab === 'passport' ? 'on' : ''}`} onClick={() => setTab('passport')}>
            <Icon name="verified" size={26} fill={tab === 'passport'} />
            Passport
          </button>
          <button className={`tab ${tab === 'me' ? 'on' : ''}`} onClick={() => setTab('me')}>
            <Icon name="person" size={26} fill={tab === 'me'} />
            Me
          </button>
        </nav>
      </div>
    </div>
  )
}
