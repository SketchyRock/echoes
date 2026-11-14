export type OpenDoor = { name: string; when: string; where: string }

export type Reply = {
  id: string
  transcript: string
  mime: string
  openDoor?: OpenDoor
  createdAt: string
}

export type Echo = {
  id: string
  lat: number
  lng: number
  place: string
  transcript: string
  mime: string
  duration: number
  listens: number
  likes: number
  legend: boolean
  title?: string
  tone: 'funny' | 'honest' | 'community'
  openDoor?: OpenDoor
  community?: string
  flagged: boolean
  resource?: string
  replies: Reply[]
  replyCount: number
  createdAt: string
  authorKey?: string // only present on the create response
}

export type HeatPoint = { lat: number; lng: number; weight: number; place: string; count: number }

export type Screening = { blocked: boolean; reason?: string; flagged: boolean; resource?: string }

export const LISTEN_RADIUS_M = 75

export const OFFLINE_MSG = 'Cannot connect to server'

/** Human message for a failed api call: network failure vs. server-side error. */
export function errorMessage(e: unknown, fallback: string) {
  const err = e as { status?: number; body?: { error?: string; reason?: string } }
  if (err?.status == null) return OFFLINE_MSG // fetch threw: no response at all
  return err.body?.reason ?? fallback // `reason` is a screening explanation worth showing verbatim
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(body.error ?? res.statusText), { status: res.status, body })
  return body as T
}

export const api = {
  listEchoes: (near?: { lat: number; lng: number }) =>
    fetch(near ? `/api/echoes?lat=${near.lat}&lng=${near.lng}` : '/api/echoes').then((r) => json<Echo[]>(r)),
  heat: () => fetch('/api/heat').then((r) => json<HeatPoint[]>(r)),
  listen: (id: string, lat: number, lng: number, key?: string) =>
    fetch(`/api/echoes/${id}/listen?lat=${lat}&lng=${lng}${key ? `&key=${key}` : ''}`, { method: 'POST' }).then((r) =>
      json<{ echo: Echo; audioUrl: string; distance: number }>(r),
    ),
  like: (id: string) => fetch(`/api/echoes/${id}/like`, { method: 'POST' }).then((r) => json<Echo>(r)),
  unlike: (id: string) => fetch(`/api/echoes/${id}/like`, { method: 'DELETE' }).then((r) => json<Echo>(r)),
  retire: (id: string) => fetch(`/api/echoes/${id}`, { method: 'DELETE' }),
  screen: (transcript: string) =>
    fetch('/api/screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    }).then((r) => json<Screening>(r)),
  createEcho: (form: FormData) => fetch('/api/echoes', { method: 'POST', body: form }).then((r) => json<Echo>(r)),
  createReply: (id: string, form: FormData) =>
    fetch(`/api/echoes/${id}/replies`, { method: 'POST', body: form }).then((r) => json<Echo>(r)),
  audioUrl: (id: string) => `/api/echoes/${id}/audio`,
  replyAudioUrl: (id: string, rid: string) => `/api/echoes/${id}/replies/${rid}/audio`,
}

export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function fmtDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}
