import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { AttributionControl, Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Icon } from './Icon'
import type { Echo, HeatPoint } from './api'
import { LISTEN_RADIUS_M } from './api'
import type { LatLng } from './useLocation'
import { CAMPUS_CENTER } from './useLocation'

type Props = {
  echoes: Echo[]
  heat: HeatPoint[]
  me: LatLng
  gpsFix: LatLng | null
  selected: Echo | null
  onSelect: (e: Echo | null) => void
}

// Esri World Imagery satellite tiles plus a labels overlay. No API key.
const SAT_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const LABEL_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
const ATTRIBUTION = '&copy; Esri, Maxar, Earthstar Geographics'

export function MapView({ echoes, heat, me, gpsFix, selected, onSelect }: Props) {
  const meIcon = useMemo(
    () => L.divIcon({ className: 'marker', html: '<div class="me-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
    [],
  )
  return (
    <MapContainer center={CAMPUS_CENTER} zoom={17} zoomControl={false} attributionControl={false} style={{ width: '100%', height: '100%' }}>
      <AttributionControl prefix={false} />
      <TileLayer url={SAT_TILES} attribution={ATTRIBUTION} maxZoom={19} maxNativeZoom={18} />
      <TileLayer url={LABEL_TILES} maxZoom={19} maxNativeZoom={18} opacity={0.9} />
      <TapHandler onTap={() => onSelect(null)} />
      <FocusOn target={selected} />
      <FollowFirstFix fix={gpsFix} />
      <HeatLayer heat={heat} />
      {selected && (
        <Circle
          center={selected}
          radius={LISTEN_RADIUS_M}
          interactive={false}
          pathOptions={{ color: '#007aff', weight: 1.5, opacity: 0.6, fillColor: '#007aff', fillOpacity: 0.08 }}
        />
      )}
      {echoes.map((e) => (
        <EchoPin key={e.id} echo={e} selected={selected?.id === e.id} onSelect={onSelect} />
      ))}
      <Marker position={me} icon={meIcon} interactive={false} zIndexOffset={1000} />
      <MapControls me={me} hidden={!!selected} />
    </MapContainer>
  )
}

function EchoPin({ echo: e, selected, onSelect }: { echo: Echo; selected: boolean; onSelect: (e: Echo) => void }) {
  const icon = useMemo(() => {
    const cls = [
      'pin',
      e.legend && 'legend',
      (e.community || e.openDoor) && !e.legend && 'community',
      e.flagged && 'flagged',
      selected && 'selected',
    ]
      .filter(Boolean)
      .join(' ')
    // SVG pin (Material "location_on" path) so it is perfectly symmetric.
    // The tip sits at y=22 of the 24-unit viewBox, so anchor there.
    const w = e.legend ? 40 : 32
    const html = `<div class="${cls}"><svg viewBox="0 0 24 24" width="${w}" height="${w}">
      <path class="body" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle class="hole" cx="12" cy="9" r="2.6"/>
    </svg></div>`
    return L.divIcon({ className: 'marker', html, iconSize: [w, w], iconAnchor: [w / 2, (w * 22) / 24] })
  }, [e.legend, e.community, e.openDoor, e.flagged, selected])
  return (
    <Marker
      position={e}
      icon={icon}
      zIndexOffset={e.legend ? 500 : 0}
      eventHandlers={{
        click: (ev) => {
          L.DomEvent.stopPropagation(ev)
          onSelect(e)
        },
      }}
    />
  )
}

/** Soft heat per place: warmer and wider where more is being said. */
function HeatLayer({ heat }: { heat: HeatPoint[] }) {
  const max = Math.max(1, ...heat.map((h) => h.weight))
  return (
    <>
      {heat.map((h) => {
        const t = h.weight / max
        return (
          <Circle
            key={h.place}
            center={h}
            radius={50 + 110 * t}
            interactive={false}
            pathOptions={{ stroke: false, fillColor: t > 0.5 ? '#ff9500' : '#007aff', fillOpacity: 0.08 + 0.2 * t }}
          />
        )
      })}
    </>
  )
}

function TapHandler({ onTap }: { onTap: () => void }) {
  useMapEvents({ click: onTap })
  return null
}

/** Pan to the selected echo, offset upward so the sheet does not cover it. */
function FocusOn({ target }: { target: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    const pt = map.project(target, map.getZoom()).add([0, map.getSize().y * 0.25])
    map.panTo(map.unproject(pt, map.getZoom()), { animate: true })
  }, [map, target])
  return null
}

/** Center on the user once their first real GPS fix arrives. Demo taps do not move the view. */
function FollowFirstFix({ fix }: { fix: LatLng | null }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || !fix) return
    done.current = true
    map.setView(fix, 17, { animate: true })
  }, [map, fix])
  return null
}

/** Zoom and locate buttons, iOS style. Hidden while a sheet is open. */
function MapControls({ me, hidden }: { me: LatLng; hidden: boolean }) {
  const map = useMap()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) {
      L.DomEvent.disableClickPropagation(ref.current)
      L.DomEvent.disableScrollPropagation(ref.current)
    }
  }, [])
  if (hidden) return null
  return (
    <div className="map-controls" ref={ref}>
      <div className="stack">
        <button onClick={() => map.zoomIn()} aria-label="Zoom in">
          <Icon name="add" size={22} weight={500} />
        </button>
        <button onClick={() => map.zoomOut()} aria-label="Zoom out">
          <Icon name="remove" size={22} weight={500} />
        </button>
      </div>
      <div className="stack">
        <button className="single" onClick={() => map.flyTo(me, Math.max(map.getZoom(), 17))} aria-label="Center on me">
          <Icon name="near_me" size={20} fill />
        </button>
      </div>
    </div>
  )
}
