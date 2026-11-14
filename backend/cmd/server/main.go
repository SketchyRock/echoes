// Command server runs the Echoes demo API. Everything is in memory.
package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"echoes/backend/internal/echo"
	"echoes/backend/internal/httpapi"
	"echoes/backend/internal/seed"
)

func main() {
	store := echo.NewStore()
	n := seed.Load(store)

	addr := ":" + envOr("PORT", "8080")
	srv := &http.Server{
		Addr:              addr,
		Handler:           httpapi.New(store),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("echoes backend on %s (in-memory, %d far-away example echoes)", addr, n)
	log.Fatal(srv.ListenAndServe())
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
