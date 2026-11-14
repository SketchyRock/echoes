package seed

import (
	"testing"

	"echoes/backend/internal/echo"
)

// The demo runs at Hartman Hall. Example pins must stay well clear of it so
// the only pins there are the ones recorded live.
const (
	hartmanLat = 38.433115
	hartmanLng = -78.873205
	clearM     = 200.0
)

func TestSeedsStayClearOfHartmanHall(t *testing.T) {
	for _, sd := range seeds {
		if d := echo.DistanceM(hartmanLat, hartmanLng, sd.Lat, sd.Lng); d < clearM {
			t.Errorf("%s is %.0f m from Hartman Hall, want >= %.0f", sd.Place, d, clearM)
		}
	}
}

func TestLoad(t *testing.T) {
	s := echo.NewStore()
	if n := Load(s); n != len(seeds) || len(s.List()) != n {
		t.Fatalf("loaded %d, want %d", n, len(seeds))
	}
}
