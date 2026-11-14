/**
 * Recordings are converted to 16 kHz mono PCM WAV before upload.
 *
 * MediaRecorder gives WebM/Opus on Chrome and MP4/AAC on Safari, and phones
 * are unreliable at playing each other's format. WAV plays everywhere, seeks
 * everywhere, and at 16 kHz mono a 30 s note is about 1 MB.
 */

export const WAV_RATE = 16000

let ctx: AudioContext | null = null
function audioContext() {
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctx()
  }
  return ctx
}

/** Decode any browser-recorded blob and re-encode it as 16 kHz mono WAV. */
export async function blobToWav(blob: Blob): Promise<Blob> {
  const decoded = await audioContext().decodeAudioData(await blob.arrayBuffer())
  const mono = downmix(decoded)
  const pcm = resample(mono, decoded.sampleRate, WAV_RATE)
  return new Blob([encodeWav(pcm, WAV_RATE)], { type: 'audio/wav' })
}

function downmix(buf: AudioBuffer): Float32Array {
  const out = new Float32Array(buf.length)
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const data = buf.getChannelData(c)
    for (let i = 0; i < out.length; i++) out[i] += data[i] / buf.numberOfChannels
  }
  return out
}

/** Linear-interpolation resample. Plenty for speech. */
function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input
  const ratio = from / to
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio
    const i0 = Math.floor(pos)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const t = pos - i0
    out[i] = input[i0] * (1 - t) + input[i1] * t
  }
  return out
}

function encodeWav(samples: Float32Array, rate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  let o = 44
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buf
}
