import { useEffect, useRef, useState } from 'react'

export type LatLng = { lat: number; lng: number }

// Hartman Hall (College of Business), JMU. The demo is pinned here.
export const HARTMAN_HALL: LatLng = { lat: 38.433115, lng: -78.873205 }
export const CAMPUS_CENTER = HARTMAN_HALL

// Named spots used to label a new echo when no other echo is nearby.
export const KNOWN_PLACES: { name: string; lat: number; lng: number }[] = [{ name: 'Hartman Hall', ...HARTMAN_HALL }]

export type LocationMode = 'gps' | 'locked'

/**
 * Uses real geolocation when the browser provides it. If GPS is denied, errors,
 * or never answers, the position is locked to Hartman Hall (where the demo
 * runs). There is no manual way to move.
 */
export function useLocation() {
  const [mode, setMode] = useState<LocationMode>('gps')
  const [gps, setGps] = useState<LatLng | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchId = useRef<number | null>(null)

  useEffect(() => {
    if (mode !== 'gps') return
    if (!navigator.geolocation) {
      setError('No geolocation in this browser')
      setMode('locked')
      return
    }
    const fallback = (msg: string) => {
      setError(msg)
      setMode('locked')
    }
    // If no fix arrives in time (e.g. prompt ignored), fall back rather than hang.
    const timer = window.setTimeout(() => fallback('No GPS fix yet, using Hartman Hall'), 12000)
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        window.clearTimeout(timer)
        setError(null)
        setGps({ lat: p.coords.latitude, lng: p.coords.longitude })
      },
      (e) => {
        window.clearTimeout(timer)
        fallback(e.message)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    )
    return () => {
      window.clearTimeout(timer)
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [mode])

  const position = mode === 'gps' && gps ? gps : HARTMAN_HALL
  return { position, mode, error, hasGps: !!gps, locating: mode === 'gps' && !gps }
}
