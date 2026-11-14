// Package screen applies the content guardrails from IDEA.md to a transcript:
// no naming individuals, no targeting, and crisis-adjacent content gets a
// resource card and stays out of Legends.
package screen

import (
	"regexp"
	"strings"
)

// Result is the outcome of screening one transcript.
type Result struct {
	Blocked  bool   `json:"blocked"`
	Reason   string `json:"reason,omitempty"`
	Flagged  bool   `json:"flagged"`
	Resource string `json:"resource,omitempty"`
}

var (
	// "Professor Smith", "Dr. Jones", "Coach Lee": a title followed by a name.
	namedPerson = regexp.MustCompile(`(?i)\b(professor|prof\.?|dr\.?|mr\.?|mrs\.?|ms\.?|coach)\s+[A-Z][a-z]+`)
	// Harassment aimed at a specific person.
	targeting = regexp.MustCompile(`(?i)\b(kill|hurt|beat up|doxx|expose)\s+(him|her|them|you|that (guy|girl|kid))\b`)

	crisisPhrases = []string{
		"suicide", "suicidal", "kill myself", "end it all", "self harm", "self-harm",
		"don't want to be here", "dont want to be here", "hurt myself", "not worth living",
	}
)

// CounselingResource is shown in place of a leaderboard slot for flagged echoes.
const CounselingResource = "JMU Counseling Center · Student Success Center 3rd floor · 540-568-6552 · Crisis line 988"

// Transcript screens one transcript. In production Whisper would supply the
// text; in the demo the browser's speech recognition does.
func Transcript(text string) Result {
	t := strings.TrimSpace(text)
	if t == "" {
		return Result{}
	}
	if namedPerson.MatchString(t) {
		return Result{Blocked: true, Reason: "Echoes can't name individual people. Talk about the class or the place, not the person."}
	}
	if targeting.MatchString(t) {
		return Result{Blocked: true, Reason: "This sounds like it targets someone. Echoes are for the place and the feeling, not for people."}
	}
	lower := strings.ToLower(t)
	for _, p := range crisisPhrases {
		if strings.Contains(lower, p) {
			return Result{Flagged: true, Resource: CounselingResource}
		}
	}
	return Result{}
}
