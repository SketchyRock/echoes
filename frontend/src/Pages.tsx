import type { Echo, HeatPoint } from './api'
import { Icon } from './Icon'

export function LegendsPage({ echoes, heat, onPick }: { echoes: Echo[]; heat: HeatPoint[]; onPick: (e: Echo) => void }) {
  const legends = echoes.filter((e) => e.legend)
  const max = Math.max(1, ...heat.map((h) => h.weight))
  return (
    <div className="page">
      <h1>Legends</h1>
      {legends.length === 0 && (
        <div className="empty">No Legends yet. An echo becomes one after 25 "me too" taps.</div>
      )}
      {legends.map((e, i) => (
        <button className="card" key={e.id} onClick={() => onPick(e)}>
          <span className="rank">#{i + 1}</span>
          <h3>{e.title}</h3>
          <div className="meta">
            {e.place} · {e.meToo} me too
          </div>
          <div className="snippet">“{e.transcript.slice(0, 90)}…”</div>
        </button>
      ))}

      {heat.length > 0 && <div className="section">Hot right now</div>}
      <div className="list">
        {heat.slice(0, 6).map((h) => (
          <div className="item" key={h.place}>
            <div style={{ flex: 1 }}>
              {h.place}
              <div className="meta">
                {h.count} echo{h.count === 1 ? '' : 'es'}
              </div>
            </div>
            <div className="bar">
              <i style={{ width: `${(100 * h.weight) / max}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PassportPage({ echoes, heard }: { echoes: Echo[]; heard: string[] }) {
  const places = Array.from(new Set(echoes.map((e) => e.place)))
  const heardPlaces = new Set(echoes.filter((e) => heard.includes(e.id)).map((e) => e.place))
  return (
    <div className="page">
      <h1>Passport</h1>
      <div className="section" style={{ marginTop: 0 }}>
        {heardPlaces.size} of {places.length} places heard
      </div>
      {places.length === 0 && <div className="empty">No places yet. Stamps appear as echoes get recorded around campus.</div>}
      <div className="passport">
        {places.map((p) => (
          <div className={`stamp ${heardPlaces.has(p) ? 'got' : ''}`} key={p}>
            <Icon name={heardPlaces.has(p) ? 'check_circle' : 'location_on'} size={24} fill={heardPlaces.has(p)} />
            {p}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MePage({
  echoes,
  heard,
  mine,
  meTooed,
  onPick,
}: {
  echoes: Echo[]
  heard: string[]
  mine: string[]
  meTooed: string[]
  onPick: (e: Echo) => void
}) {
  const myEchoes = echoes.filter((e) => mine.includes(e.id))
  return (
    <div className="page">
      <h1>Me</h1>
      <div className="stats">
        <div className="card">
          <div className="num">{heard.length}</div>
          <div className="meta">heard</div>
        </div>
        <div className="card">
          <div className="num">{meTooed.length}</div>
          <div className="meta">me too</div>
        </div>
        <div className="card">
          <div className="num">{mine.length}</div>
          <div className="meta">left</div>
        </div>
      </div>

      <div className="section">Your echoes</div>
      {myEchoes.map((e) => (
        <button className="card" key={e.id} onClick={() => onPick(e)}>
          <h3>{e.place}</h3>
          <div className="meta">
            {e.listens} listens · {e.meToo} me too · {e.replyCount} replies
          </div>
        </button>
      ))}
    </div>
  )
}
