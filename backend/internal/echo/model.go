// Package echo holds the domain model and the in-memory store for echoes:
// anonymous voice notes pinned to a place.
package echo

import "time"

// Tone is the self-declared flavor of an echo.
type Tone string

const (
	ToneHonest    Tone = "honest"
	ToneFunny     Tone = "funny"
	ToneCommunity Tone = "community"
)

// OpenDoor is an optional standing invitation to a real place or event.
type OpenDoor struct {
	Name  string `json:"name"`
	When  string `json:"when"`
	Where string `json:"where"`
}

// Reply is a supportive voice reply to an echo.
type Reply struct {
	ID         string    `json:"id"`
	Transcript string    `json:"transcript"`
	Mime       string    `json:"mime"`
	OpenDoor   *OpenDoor `json:"openDoor,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`

	Audio []byte `json:"-"`
}

// Echo is one anonymous voice note pinned to a place.
type Echo struct {
	ID         string    `json:"id"`
	Lat        float64   `json:"lat"`
	Lng        float64   `json:"lng"`
	Place      string    `json:"place"`
	Transcript string    `json:"transcript"`
	Mime       string    `json:"mime"`
	Duration   float64   `json:"duration"`
	Listens    int       `json:"listens"`
	Likes      int       `json:"likes"`
	Legend     bool      `json:"legend"`
	Title      string    `json:"title,omitempty"`
	Tone       Tone      `json:"tone"`
	OpenDoor   *OpenDoor `json:"openDoor,omitempty"`
	Community  string    `json:"community,omitempty"`
	Flagged    bool      `json:"flagged"`
	Resource   string    `json:"resource,omitempty"`
	Replies    []Reply   `json:"replies"`
	ReplyCount int       `json:"replyCount"`
	CreatedAt  time.Time `json:"createdAt"`

	// AuthorKey is handed to the recorder once, at creation, and lets them
	// listen to their own echo from anywhere. It is never listed or fetched.
	AuthorKey string `json:"authorKey,omitempty"`

	Audio []byte `json:"-"`
}

// HeatPoint is aggregated activity for one place.
type HeatPoint struct {
	Lat    float64 `json:"lat"`
	Lng    float64 `json:"lng"`
	Weight int     `json:"weight"`
	Place  string  `json:"place"`
	Count  int     `json:"count"`
}

const (
	// ListenRadiusM is how close you must stand to hear an echo.
	ListenRadiusM = 75.0
	// LegendThreshold is the likes count that turns an echo into a Legend.
	LegendThreshold = 25
)
