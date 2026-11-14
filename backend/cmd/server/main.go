// Command server runs the Echoes demo: the JSON API under /api and the
// embedded frontend everywhere else. Everything is in memory.
package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"echoes/backend/internal/echo"
	"echoes/backend/internal/httpapi"
	"echoes/backend/internal/seed"
	"echoes/backend/internal/web"
)

func main() {
	store := echo.NewStore()
	n := seed.Load(store)

	root := http.NewServeMux()
	root.Handle("/api/", httpapi.New(store))
	root.Handle("/", web.Handler())

	addr := ":" + envOr("PORT", "8080")
	srv := &http.Server{
		Addr:              addr,
		Handler:           root,
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("echoes on %s (in-memory, %d far-away example echoes)", addr, n)
	log.Fatal(srv.ListenAndServe())
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
