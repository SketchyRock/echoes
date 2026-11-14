package echo

import (
	"encoding/binary"
	"math"
)

// ToneWAV generates a short placeholder WAV so example echoes are playable.
func ToneWAV(seconds, freq float64) []byte {
	const rate = 16000
	n := int(seconds * rate)
	data := make([]byte, n*2)
	for i := range n {
		t := float64(i) / rate
		env := math.Min(1, math.Min(t*4, (seconds-t)*4)) // fade in/out, no clicks
		v := math.Sin(2*math.Pi*freq*t+0.3*math.Sin(2*math.Pi*5*t)) * 0.4 * env
		binary.LittleEndian.PutUint16(data[i*2:], uint16(int16(v*32767)))
	}
	hdr := make([]byte, 44)
	copy(hdr[0:], "RIFF")
	binary.LittleEndian.PutUint32(hdr[4:], uint32(36+len(data)))
	copy(hdr[8:], "WAVE")
	copy(hdr[12:], "fmt ")
	binary.LittleEndian.PutUint32(hdr[16:], 16)
	binary.LittleEndian.PutUint16(hdr[20:], 1) // PCM
	binary.LittleEndian.PutUint16(hdr[22:], 1) // mono
	binary.LittleEndian.PutUint32(hdr[24:], rate)
	binary.LittleEndian.PutUint32(hdr[28:], rate*2)
	binary.LittleEndian.PutUint16(hdr[32:], 2)
	binary.LittleEndian.PutUint16(hdr[34:], 16)
	copy(hdr[36:], "data")
	binary.LittleEndian.PutUint32(hdr[40:], uint32(len(data)))
	return append(hdr, data...)
}
