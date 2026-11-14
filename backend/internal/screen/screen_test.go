package screen

import "testing"

func TestTranscript(t *testing.T) {
	cases := []struct {
		name    string
		in      string
		blocked bool
		flagged bool
	}{
		{"empty", "", false, false},
		{"clean", "I cried in the CS building again", false, false},
		{"named professor", "Professor Smith ruined my GPA", true, false},
		{"named dr", "dr. Jones is the worst", true, false},
		{"targeting", "I will expose him tomorrow", true, false},
		{"crisis", "some days I don't want to be here", false, true},
		{"crisis caps", "I feel SUICIDAL", false, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := Transcript(c.in)
			if r.Blocked != c.blocked || r.Flagged != c.flagged {
				t.Fatalf("got blocked=%v flagged=%v, want %v %v", r.Blocked, r.Flagged, c.blocked, c.flagged)
			}
			if r.Flagged && r.Resource == "" {
				t.Fatal("flagged result must carry a resource")
			}
			if r.Blocked && r.Reason == "" {
				t.Fatal("blocked result must carry a reason")
			}
		})
	}
}
