// Package web serves the compiled frontend from the binary. Vite writes its
// build into ./dist (see frontend/vite.config.ts), which is embedded here, so
// one static binary carries both the API and the app.
package web

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed all:dist
var dist embed.FS

// Handler serves the embedded app. Hashed assets are cached forever; every
// other path falls back to index.html so client-side routes (?echo=...) work.
func Handler() http.Handler {
	sub, err := fs.Sub(dist, "dist")
	if err != nil {
		panic(err)
	}
	files := http.FileServer(http.FS(sub))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		if f, err := sub.Open(path); err == nil {
			_ = f.Close()
			if strings.HasPrefix(path, "assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			} else {
				w.Header().Set("Cache-Control", "no-cache")
			}
			files.ServeHTTP(w, r)
			return
		}
		if _, err := sub.Open("index.html"); err != nil {
			http.Error(w, "frontend not built: run `task build:frontend`", http.StatusNotFound)
			return
		}
		r.URL.Path = "/"
		w.Header().Set("Cache-Control", "no-cache")
		files.ServeHTTP(w, r)
	})
}
