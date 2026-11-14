import { useCallback, useEffect, useRef, useState } from 'react'
import { blobToWav } from './wav'

// Browser speech recognition is not in lib.dom types for every browser.
type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
}
type SpeechCtor = new () => SpeechRecognitionLike

function getSpeechCtor(): SpeechCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const MAX_SECONDS = 30

/**
 * MediaRecorder + live speech-to-text. The transcript stands in for Whisper
 * so the backend can screen it before the echo goes live.
 */
export function useRecorder() {
  const [recording, setRecording] = useState(false)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const speech = useRef<SpeechRecognitionLike | null>(null)
  const timer = useRef<number | null>(null)
  const starting = useRef(false)

  const stop = useCallback(() => {
    rec.current?.state !== 'inactive' && rec.current?.stop()
    speech.current?.stop()
    if (timer.current) window.clearInterval(timer.current)
    timer.current = null
    setRecording(false)
  }, [])

  const start = useCallback(async () => {
    // getUserMedia can take a while (permission prompt); ignore taps until it settles.
    if (starting.current || rec.current?.state === 'recording') return
    starting.current = true
    setError(null)
    setBlob(null)
    setTranscript('')
    setSeconds(0)
    chunks.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const r = new MediaRecorder(stream, { mimeType: mime })
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const raw = new Blob(chunks.current, { type: mime })
        // Normalise to WAV so every phone can play every recording.
        try {
          setBlob(await blobToWav(raw))
        } catch {
          setBlob(raw)
        }
      }
      r.start()
      rec.current = r

      const Ctor = getSpeechCtor()
      if (Ctor) {
        const s = new Ctor()
        s.continuous = true
        s.interimResults = true
        s.lang = 'en-US'
        s.onresult = (e) => {
          let text = ''
          for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + ' '
          setTranscript(text.trim())
        }
        s.onerror = () => {}
        s.start()
        speech.current = s
      }

      setRecording(true)
      const startedAt = Date.now()
      timer.current = window.setInterval(() => {
        const s = (Date.now() - startedAt) / 1000
        setSeconds(s)
        if (s >= MAX_SECONDS) stop()
      }, 200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone unavailable')
    } finally {
      starting.current = false
    }
  }, [stop])

  const reset = useCallback(() => {
    stop()
    setBlob(null)
    setTranscript('')
    setSeconds(0)
  }, [stop])

  useEffect(() => () => stop(), [stop])

  return {
    recording,
    blob,
    seconds,
    transcript,
    setTranscript,
    error,
    start,
    stop,
    reset,
    speechSupported: !!getSpeechCtor(),
  }
}
