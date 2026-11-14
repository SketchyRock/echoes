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
	// ScatterMinSepM: a new echo closer than this to an existing one gets moved.
	ScatterMinSepM = 8.0
	// Scatter rings: candidate radii around the original point. The outer ring
	// stays well inside ListenRadiusM so a crowd of recordings from one spot
	// remains audible from that spot.
	scatterFirstRingM = 10.0
	scatterRingStepM  = 8.0
	scatterMaxRadiusM = 42.0
)

// Scatter keeps (lat, lng) if nothing is within ScatterMinSepM; otherwise it
// walks concentric rings outward from the original point and takes the first
// free slot, starting each ring at a random angle so pins fan out evenly.
// Distance from the original point never exceeds scatterMaxRadiusM.
func Scatter(lat, lng float64, others []Echo, r *rand.Rand) (float64, float64) {
	if !crowded(lat, lng, others) {
		return lat, lng
	}
	for radius := scatterFirstRingM; radius <= scatterMaxRadiusM; radius += scatterRingStepM {
		slots := int(2 * math.Pi * radius / ScatterMinSepM)
		start := r.Float64() * 2 * math.Pi
		for i := range slots {
			bearing := start + 2*math.Pi*float64(i)/float64(slots)
			nlat, nlng := offset(lat, lng, radius, bearing)
			if !crowded(nlat, nlng, others) {
				return nlat, nlng
			}
		}
	}
	// Every ring is full: random spot on the outer ring is the best we can do.
	return offset(lat, lng, scatterMaxRadiusM, r.Float64()*2*math.Pi)
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
