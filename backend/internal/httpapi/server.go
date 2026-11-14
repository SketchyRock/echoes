// Package httpapi exposes the echo store over a small JSON/multipart HTTP API.
package httpapi

import (
	"encoding/json"
	"math/rand/v2"
	"net/http"
	"time"

	"echoes/backend/internal/echo"
)

const (
	// maxAudioBytes caps one uploaded recording.
	maxAudioBytes = 10 << 20
	// maxEchoesPerClient caps how many pins a list call returns. The list is
	// Legends first, then by "me too", so the cap drops the least relevant.
	maxEchoesPerClient = 40
)

// Server wires handlers to a store.
type Server struct {
	store *echo.Store
	rnd   *rand.Rand
}

// New returns an http.Handler serving the API with permissive CORS,
// which is fine for a local demo.
func New(store *echo.Store) http.Handler {
	s := &Server{store: store, rnd: rand.New(rand.NewPCG(uint64(time.Now().UnixNano()), 7))}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.health)
	mux.HandleFunc("GET /api/echoes", s.listEchoes)
	mux.HandleFunc("POST /api/echoes", s.createEcho)
	mux.HandleFunc("GET /api/echoes/{id}", s.getEcho)
	mux.HandleFunc("DELETE /api/echoes/{id}", s.retireEcho)
	mux.HandleFunc("GET /api/echoes/{id}/audio", s.echoAudio)
	mux.HandleFunc("POST /api/echoes/{id}/listen", s.listenEcho)
	mux.HandleFunc("POST /api/echoes/{id}/metoo", s.meTooEcho)
	mux.HandleFunc("DELETE /api/echoes/{id}/metoo", s.unMeTooEcho)
	mux.HandleFunc("POST /api/echoes/{id}/replies", s.createReply)
	mux.HandleFunc("GET /api/echoes/{id}/replies/{rid}/audio", s.replyAudio)
	mux.HandleFunc("GET /api/heat", s.heat)
	mux.HandleFunc("POST /api/screen", s.screen)
	return cors(mux)
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
