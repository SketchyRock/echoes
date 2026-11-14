package echo

import (
	"math/rand/v2"
	"testing"
)

func TestLikeMintsLegend(t *testing.T) {
	s := NewStore()
	e := s.Add(Echo{Place: "D-Hall", Tone: ToneHonest})
	for range LegendThreshold - 1 {
		s.Like(e.ID)
	}
	got, _ := s.Get(e.ID)
	if got.Legend {
		t.Fatal("became legend before threshold")
	}
	got, _ = s.Like(e.ID)
	if !got.Legend || got.Title != "The D-Hall Confession" {
		t.Fatalf("want legend with title, got legend=%v title=%q", got.Legend, got.Title)
	}
}

func TestFlaggedNeverLegend(t *testing.T) {
	s := NewStore()
	e := s.Add(Echo{Place: "Quad", Flagged: true})
	for range LegendThreshold + 5 {
		s.Like(e.ID)
	}
	got, _ := s.Get(e.ID)
	if got.Legend {
		t.Fatal("flagged echo must not become a legend")
	}
}

func TestWithinRange(t *testing.T) {
	e := Echo{Lat: 38.4359, Lng: -78.8731}
	if ok, _ := e.WithinRange(38.4359, -78.8731); !ok {
		t.Fatal("same point should be in range")
	}
	if ok, d := e.WithinRange(38.45, -78.90); ok || d < 2000 {
		t.Fatalf("far point should be out of range, d=%v", d)
	}
}

func TestSnapshotIsolation(t *testing.T) {
	s := NewStore()
	e := s.Add(Echo{Place: "Quad"})
	e.Place = "mutated"
	got, _ := s.Get(e.ID)
	if got.Place != "Quad" {
		t.Fatal("caller mutation leaked into store")
	}
}

func TestListOrder(t *testing.T) {
	s := NewStore()
	s.Add(Echo{Place: "a", Likes: 5})
	s.Add(Echo{Place: "b", Likes: 50, Legend: true})
	s.Add(Echo{Place: "c", Likes: 10})
	l := s.List()
	if l[0].Place != "b" || l[1].Place != "c" || l[2].Place != "a" {
		t.Fatalf("bad order: %s %s %s", l[0].Place, l[1].Place, l[2].Place)
	}
}

func TestRepliesNeverNil(t *testing.T) {
	s := NewStore()
	e := s.Add(Echo{Place: "Quad"})
	if e.Replies == nil {
		t.Fatal("Add returned nil replies")
	}
	got, _ := s.Get(e.ID)
	if got.Replies == nil {
		t.Fatal("Get returned nil replies")
	}
	if l := s.List(); l[0].Replies == nil {
		t.Fatal("List returned nil replies")
	}
}

func TestAuthorKeyOnlyOnAdd(t *testing.T) {
	s := NewStore()
	e := s.Add(Echo{Place: "Hartman Hall"})
	if e.AuthorKey == "" {
		t.Fatal("Add must return an author key")
	}
	got, _ := s.Get(e.ID)
	if got.AuthorKey != "" || s.List()[0].AuthorKey != "" {
		t.Fatal("author key leaked through Get/List")
	}
	if !s.IsAuthor(e.ID, e.AuthorKey) || s.IsAuthor(e.ID, "nope") || s.IsAuthor(e.ID, "") {
		t.Fatal("IsAuthor wrong")
	}
}

func TestUnlike(t *testing.T) {
	s := NewStore()
	e := s.Add(Echo{Place: "Quad"})
	s.Like(e.ID)
	got, _ := s.Unlike(e.ID)
	if got.Likes != 0 {
		t.Fatalf("want 0, got %d", got.Likes)
	}
	got, _ = s.Unlike(e.ID)
	if got.Likes != 0 {
		t.Fatal("must not go negative")
	}
}

func TestScatter(t *testing.T) {
	r := rand.New(rand.NewPCG(1, 2))
	base := Echo{Lat: 38.433115, Lng: -78.873205}
	// nothing nearby: unchanged
	la, ln := Scatter(base.Lat, base.Lng, nil, r)
	if la != base.Lat || ln != base.Lng {
		t.Fatal("should not move when alone")
	}
	// one echo already there: nudged 10-30 m away
	la, ln = Scatter(base.Lat, base.Lng, []Echo{base}, r)
	d := DistanceM(base.Lat, base.Lng, la, ln)
	if d < ScatterMinM-0.5 || d > ScatterMaxM+0.5 {
		t.Fatalf("moved %.1f m, want %v-%v", d, ScatterMinM, ScatterMaxM)
	}
}

func TestNearestKeepsLegendsThenClosest(t *testing.T) {
	s := NewStore()
	me := Echo{Lat: 38.433115, Lng: -78.873205}
	s.Add(Echo{Place: "far legend", Lat: 38.44, Lng: -78.86, Legend: true})
	for i := range 5 {
		s.Add(Echo{Place: "far", Lat: 38.44 + float64(i)*0.001, Lng: -78.86})
	}
	s.Add(Echo{Place: "near", Lat: me.Lat + 0.0001, Lng: me.Lng})
	got := s.Nearest(me.Lat, me.Lng, 3)
	if len(got) != 3 || got[0].Place != "far legend" || got[1].Place != "near" {
		t.Fatalf("want [legend, near, far], got %v %v %v", got[0].Place, got[1].Place, got[2].Place)
	}
}
