package echo

import (
	"math"
	"math/rand/v2"
)

// DistanceM returns the great-circle distance in meters between two points.
func DistanceM(lat1, lng1, lat2, lng2 float64) float64 {
	const r = 6371000.0
	toRad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * r * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}

// WithinRange reports whether a listener at (lat, lng) may hear the echo,
// and how far away they are.
func (e Echo) WithinRange(lat, lng float64) (bool, float64) {
	d := DistanceM(lat, lng, e.Lat, e.Lng)
	return d <= ListenRadiusM, d
}

const (
	// ScatterMinSepM: a new echo closer than this to an existing one gets nudged.
	ScatterMinSepM = 8.0
	// ScatterMinM / ScatterMaxM bound how far it is nudged.
	ScatterMinM = 10.0
	ScatterMaxM = 30.0
)

// Scatter nudges (lat, lng) a random 10-30 m away if another echo already sits
// within ScatterMinSepM, so pins recorded from the same spot do not stack.
// It retries a few times to avoid landing on yet another echo.
func Scatter(lat, lng float64, others []Echo, r *rand.Rand) (float64, float64) {
	if !crowded(lat, lng, others) {
		return lat, lng
	}
	for range 8 {
		bearing := r.Float64() * 2 * math.Pi
		dist := ScatterMinM + r.Float64()*(ScatterMaxM-ScatterMinM)
		nlat, nlng := offset(lat, lng, dist, bearing)
		if !crowded(nlat, nlng, others) {
			return nlat, nlng
		}
		lat, lng = nlat, nlng
	}
	return lat, lng
}

func crowded(lat, lng float64, others []Echo) bool {
	for _, o := range others {
		if DistanceM(lat, lng, o.Lat, o.Lng) < ScatterMinSepM {
			return true
		}
	}
	return false
}

// offset moves a point dist meters along bearing (radians, 0 = north).
func offset(lat, lng, dist, bearing float64) (float64, float64) {
	const mPerDegLat = 111320.0
	dLat := dist * math.Cos(bearing) / mPerDegLat
	dLng := dist * math.Sin(bearing) / (mPerDegLat * math.Cos(lat*math.Pi/180))
	return lat + dLat, lng + dLng
}
