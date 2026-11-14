package echo

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sort"
	"sync"
	"time"
)

// Store keeps every echo in memory. Demo only: nothing persists across restarts.
type Store struct {
	mu     sync.RWMutex
	echoes map[string]*Echo
	seq    int
	now    func() time.Time
}

func NewStore() *Store {
	return &Store{echoes: map[string]*Echo{}, now: time.Now}
}

func (s *Store) nextID(prefix string) string {
	s.seq++
	return fmt.Sprintf("%s_%d", prefix, s.seq)
}

// Add stores a new echo and assigns its ID. The returned copy is the only one
// that carries the AuthorKey.
func (s *Store) Add(e Echo) Echo {
	s.mu.Lock()
	defer s.mu.Unlock()
	e.ID = s.nextID("echo")
	e.CreatedAt = s.now()
	if e.AuthorKey == "" {
		e.AuthorKey = newKey()
	}
	if e.Replies == nil {
		e.Replies = []Reply{}
	}
	for i := range e.Replies {
		if e.Replies[i].ID == "" {
			e.Replies[i].ID = s.nextID("reply")
		}
		if e.Replies[i].CreatedAt.IsZero() {
			e.Replies[i].CreatedAt = e.CreatedAt
		}
	}
	s.echoes[e.ID] = &e
	out := snapshot(&e)
	out.AuthorKey = e.AuthorKey
	return out
}

// IsAuthor reports whether key is the author key for the echo.
func (s *Store) IsAuthor(id, key string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.echoes[id]
	return ok && key != "" && e.AuthorKey == key
}

func newKey() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (s *Store) Get(id string) (Echo, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.echoes[id]
	if !ok {
		return Echo{}, false
	}
	return snapshot(e), true
}

// Audio returns the raw bytes and mime type of an echo.
func (s *Store) Audio(id string) ([]byte, string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.echoes[id]
	if !ok {
		return nil, "", false
	}
	return e.Audio, e.Mime, true
}

// ReplyAudio returns the raw bytes and mime type of one reply.
func (s *Store) ReplyAudio(id, replyID string) ([]byte, string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.echoes[id]
	if !ok {
		return nil, "", false
	}
	for _, r := range e.Replies {
		if r.ID == replyID {
			return r.Audio, r.Mime, true
		}
	}
	return nil, "", false
}

// List returns every echo, Legends first, then by "me too".
func (s *Store) List() []Echo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Echo, 0, len(s.echoes))
	for _, e := range s.echoes {
		out = append(out, snapshot(e))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Legend != out[j].Legend {
			return out[i].Legend
		}
		if out[i].MeToo != out[j].MeToo {
			return out[i].MeToo > out[j].MeToo
		}
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	return out
}

// Nearest returns up to limit echoes for a client standing at (lat, lng):
// every Legend first, then everything else nearest-first. This is what keeps
// the pins around the user on the map when the cap kicks in.
func (s *Store) Nearest(lat, lng float64, limit int) []Echo {
	all := s.List()
	legends, rest := []Echo{}, []Echo{}
	for _, e := range all {
		if e.Legend {
			legends = append(legends, e)
		} else {
			rest = append(rest, e)
		}
	}
	sort.SliceStable(rest, func(i, j int) bool {
		return DistanceM(lat, lng, rest[i].Lat, rest[i].Lng) < DistanceM(lat, lng, rest[j].Lat, rest[j].Lng)
	})
	out := append(legends, rest...)
	if len(out) > limit {
		out = out[:limit]
	}
	return out
}

// Listen records a play. Range checking is the caller's job (see WithinRange).
func (s *Store) Listen(id string) (Echo, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.echoes[id]
	if !ok {
		return Echo{}, false
	}
	e.Listens++
	return snapshot(e), true
}

// MeToo adds a relatability tap and promotes the echo to a Legend at the
// threshold. Flagged (crisis-adjacent) echoes never become Legends.
func (s *Store) MeToo(id string) (Echo, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.echoes[id]
	if !ok {
		return Echo{}, false
	}
	e.MeToo++
	if !e.Flagged && !e.Legend && e.MeToo >= LegendThreshold {
		e.Legend = true
		e.Title = LegendTitle(e.Place, e.Tone)
	}
	return snapshot(e), true
}

// UnMeToo takes a relatability tap back. Legend status, once earned, stays.
func (s *Store) UnMeToo(id string) (Echo, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.echoes[id]
	if !ok {
		return Echo{}, false
	}
	if e.MeToo > 0 {
		e.MeToo--
	}
	return snapshot(e), true
}

func (s *Store) AddReply(id string, r Reply) (Echo, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.echoes[id]
	if !ok {
		return Echo{}, false
	}
	r.ID = s.nextID("reply")
	r.CreatedAt = s.now()
	e.Replies = append(e.Replies, r)
	return snapshot(e), true
}

// Retire removes an echo. Authors can do this at any time.
func (s *Store) Retire(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.echoes[id]
	delete(s.echoes, id)
	return ok
}

// Heat aggregates activity per place, hottest first.
func (s *Store) Heat() []HeatPoint {
	s.mu.RLock()
	defer s.mu.RUnlock()
	byPlace := map[string]*HeatPoint{}
	for _, e := range s.echoes {
		p, ok := byPlace[e.Place]
		if !ok {
			p = &HeatPoint{Lat: e.Lat, Lng: e.Lng, Place: e.Place}
			byPlace[e.Place] = p
		}
		p.Weight += e.Listens + 3*e.MeToo + 1
		p.Count++
	}
	out := make([]HeatPoint, 0, len(byPlace))
	for _, p := range byPlace {
		out = append(out, *p)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Weight != out[j].Weight {
			return out[i].Weight > out[j].Weight
		}
		return out[i].Place < out[j].Place
	})
	return out
}

// LegendTitle builds a folklore-style name like "The Carrier Stairwell Confession".
func LegendTitle(place string, tone Tone) string {
	noun := "Confession"
	switch tone {
	case ToneFunny:
		noun = "Lament"
	case ToneCommunity:
		noun = "Invitation"
	}
	return fmt.Sprintf("The %s %s", place, noun)
}

// snapshot copies an echo (and its reply slice) so callers never hold a
// pointer into the store, and fills derived fields.
func snapshot(e *Echo) Echo {
	c := *e
	c.Replies = append([]Reply{}, e.Replies...) // never nil, so JSON gives [] not null
	c.ReplyCount = len(e.Replies)
	c.AuthorKey = "" // only Add hands this out
	return c
}
