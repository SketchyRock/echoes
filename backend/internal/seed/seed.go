// Package seed adds a few example echoes far from Hartman Hall so the demo
// can show what a locked, out-of-range echo looks like.
package seed

import "echoes/backend/internal/echo"

type seedEcho struct {
	echo.Echo
	seconds float64
	freq    float64
}

// All of these are several hundred meters from Hartman Hall.
var seeds = []seedEcho{
	{echo.Echo{Lat: 38.4359, Lng: -78.8731, Place: "Carrier Library", Tone: echo.ToneHonest, Listens: 412, Likes: 188, Legend: true, Title: "The Carrier Stairwell Confession",
		Transcript: "I sat in this stairwell my whole first semester eating lunch alone because I didn't know where else to go. If you're doing that right now, you're not the only one."}, 9, 196},
	{echo.Echo{Lat: 38.4330, Lng: -78.8606, Place: "ISAT / CS Building", Tone: echo.ToneFunny, Listens: 530, Likes: 241, Legend: true, Title: "The ISAT / CS Building Lament",
		Transcript: "It is 2 a.m. My linked list has three nodes and somehow infinite length. I have cried twice. The vending machine is out of Cheez-Its. Send help."}, 7, 220},
	{echo.Echo{Lat: 38.4397, Lng: -78.8640, Place: "UREC", Tone: echo.ToneCommunity, Listens: 203, Likes: 97,
		Transcript: "I was terrified to walk into climbing club the first time. They meet Wednesdays at 7 and they are genuinely nice. Nobody cares if you fall.",
		OpenDoor:   &echo.OpenDoor{Name: "JMU Climbing Club", When: "Wednesdays 7pm", Where: "UREC climbing wall"}}, 8, 174},
	{echo.Echo{Lat: 38.4374, Lng: -78.8747, Place: "D-Hall", Tone: echo.ToneHonest, Listens: 96, Likes: 14,
		Transcript: "Eating alone at D-Hall is fine. I used to think everyone was staring. Nobody is. Everyone is looking at their phone like you."}, 6, 165},
}

// Load adds the example echoes and returns how many were added.
func Load(s *echo.Store) int {
	for _, sd := range seeds {
		e := sd.Echo
		e.Mime = "audio/wav"
		e.Duration = sd.seconds
		e.Audio = echo.ToneWAV(sd.seconds, sd.freq)
		s.Add(e)
	}
	return len(seeds)
}
