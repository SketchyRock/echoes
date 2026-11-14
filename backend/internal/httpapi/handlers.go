package httpapi

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"echoes/backend/internal/echo"
	"echoes/backend/internal/screen"
)

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "echoes": len(s.store.List())})
}

func (s *Server) listEchoes(w http.ResponseWriter, r *http.Request) {
	limit := maxEchoesPerClient
	if n, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && n > 0 && n < limit {
		limit = n
	}
	// With a client position, keep Legends plus the nearest pins under the cap.
	if lat, err1 := formCoord(r, "lat"); err1 == nil {
		if lng, err2 := formCoord(r, "lng"); err2 == nil {
			writeJSON(w, http.StatusOK, s.store.Nearest(lat, lng, limit))
			return
		}
	}
	list := s.store.List()
	if len(list) > limit {
		list = list[:limit]
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) getEcho(w http.ResponseWriter, r *http.Request) {
	e, ok := s.store.Get(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "no such echo")
		return
	}
	writeJSON(w, http.StatusOK, e)
}

func (s *Server) createEcho(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxAudioBytes); err != nil {
		writeErr(w, http.StatusBadRequest, "expected multipart form")
		return
	}
	lat, err1 := formCoord(r, "lat")
	lng, err2 := formCoord(r, "lng")
	if err1 != nil || err2 != nil {
		writeErr(w, http.StatusBadRequest, "lat and lng required")
		return
	}
	audio, mime, err := formAudio(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "audio file required")
		return
	}
	transcript := r.FormValue("transcript")
	sc := screen.Transcript(transcript)
	if sc.Blocked {
		writeJSON(w, http.StatusUnprocessableEntity, sc)
		return
	}
	dur, _ := strconv.ParseFloat(r.FormValue("duration"), 64)
	place := r.FormValue("place")
	if place == "" {
		place = "Somewhere on campus"
	}
	tone := echo.Tone(r.FormValue("tone"))
	switch tone {
	case echo.ToneFunny, echo.ToneCommunity:
	default:
		tone = echo.ToneHonest
	}
	// Spread pins recorded from the same spot so they do not stack on the map.
	lat, lng = echo.Scatter(lat, lng, s.store.List(), s.rnd)
	e := s.store.Add(echo.Echo{
		Lat: lat, Lng: lng, Place: place, Transcript: transcript, Mime: mime, Duration: dur,
		Tone: tone, OpenDoor: formOpenDoor(r), Flagged: sc.Flagged, Resource: sc.Resource, Audio: audio,
	})
	writeJSON(w, http.StatusCreated, e)
}

func (s *Server) retireEcho(w http.ResponseWriter, r *http.Request) {
	if !s.store.Retire(r.PathValue("id")) {
		writeErr(w, http.StatusNotFound, "no such echo")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) echoAudio(w http.ResponseWriter, r *http.Request) {
	b, mime, ok := s.store.Audio(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "no such echo")
		return
	}
	serveAudio(w, b, mime)
}

func (s *Server) replyAudio(w http.ResponseWriter, r *http.Request) {
	b, mime, ok := s.store.ReplyAudio(r.PathValue("id"), r.PathValue("rid"))
	if !ok {
		writeErr(w, http.StatusNotFound, "no such reply")
		return
	}
	serveAudio(w, b, mime)
}

// listenEcho enforces the location lock: the caller must be within range.
func (s *Server) listenEcho(w http.ResponseWriter, r *http.Request) {
	e, ok := s.store.Get(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "no such echo")
		return
	}
	lat, err1 := formCoord(r, "lat")
	lng, err2 := formCoord(r, "lng")
	if err1 != nil || err2 != nil {
		writeErr(w, http.StatusBadRequest, "lat and lng required")
		return
	}
	// Authors can always hear their own echo; everyone else must stand there.
	inRange, d := e.WithinRange(lat, lng)
	if !inRange && !s.store.IsAuthor(e.ID, r.URL.Query().Get("key")) {
		writeJSON(w, http.StatusForbidden, map[string]any{
			"error": "too far away", "distance": d, "radius": echo.ListenRadiusM,
		})
		return
	}
	e, _ = s.store.Listen(e.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"echo": e, "audioUrl": "/api/echoes/" + e.ID + "/audio", "distance": d,
	})
}

func (s *Server) likeEcho(w http.ResponseWriter, r *http.Request) {
	e, ok := s.store.Like(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "no such echo")
		return
	}
	writeJSON(w, http.StatusOK, e)
}

func (s *Server) unlikeEcho(w http.ResponseWriter, r *http.Request) {
	e, ok := s.store.Unlike(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "no such echo")
		return
	}
	writeJSON(w, http.StatusOK, e)
}

func (s *Server) createReply(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxAudioBytes); err != nil {
		writeErr(w, http.StatusBadRequest, "expected multipart form")
		return
	}
	audio, mime, err := formAudio(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "audio file required")
		return
	}
	transcript := r.FormValue("transcript")
	sc := screen.Transcript(transcript)
	if sc.Blocked {
		writeJSON(w, http.StatusUnprocessableEntity, sc)
		return
	}
	e, ok := s.store.AddReply(r.PathValue("id"), echo.Reply{
		Transcript: transcript, Mime: mime, OpenDoor: formOpenDoor(r), Audio: audio,
	})
	if !ok {
		writeErr(w, http.StatusNotFound, "no such echo")
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

func (s *Server) heat(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Heat())
}

// screen lets the client preview the guardrail result while recording.
func (s *Server) screen(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Transcript string `json:"transcript"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	writeJSON(w, http.StatusOK, screen.Transcript(body.Transcript))
}

// --- form helpers ---

func formCoord(r *http.Request, key string) (float64, error) {
	v := r.FormValue(key)
	if v == "" {
		v = r.URL.Query().Get(key)
	}
	if v == "" {
		return 0, fmt.Errorf("missing %s", key)
	}
	return strconv.ParseFloat(v, 64)
}

func formAudio(r *http.Request) ([]byte, string, error) {
	f, hdr, err := r.FormFile("audio")
	if err != nil {
		return nil, "", err
	}
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, maxAudioBytes))
	if err != nil {
		return nil, "", err
	}
	mime := hdr.Header.Get("Content-Type")
	if mime == "" {
		mime = "application/octet-stream"
	}
	return b, mime, nil
}

func formOpenDoor(r *http.Request) *echo.OpenDoor {
	name := r.FormValue("doorName")
	if name == "" {
		return nil
	}
	return &echo.OpenDoor{Name: name, When: r.FormValue("doorWhen"), Where: r.FormValue("doorWhere")}
}

func serveAudio(w http.ResponseWriter, b []byte, mime string) {
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Content-Length", strconv.Itoa(len(b)))
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(b)
}
