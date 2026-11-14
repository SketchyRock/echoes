package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"echoes/backend/internal/echo"
)

func TestAudioSupportsRangeRequests(t *testing.T) {
	store := echo.NewStore()
	e := store.Add(echo.Echo{Place: "x", Mime: "audio/wav", Audio: make([]byte, 1000)})
	h := New(store)

	full := httptest.NewRecorder()
	h.ServeHTTP(full, httptest.NewRequest("GET", "/api/echoes/"+e.ID+"/audio", nil))
	if full.Code != 200 || full.Header().Get("Accept-Ranges") != "bytes" || full.Body.Len() != 1000 {
		t.Fatalf("full: code=%d accept-ranges=%q len=%d", full.Code, full.Header().Get("Accept-Ranges"), full.Body.Len())
	}

	req := httptest.NewRequest("GET", "/api/echoes/"+e.ID+"/audio", nil)
	req.Header.Set("Range", "bytes=0-1")
	part := httptest.NewRecorder()
	h.ServeHTTP(part, req)
	if part.Code != http.StatusPartialContent || part.Body.Len() != 2 || part.Header().Get("Content-Range") != "bytes 0-1/1000" {
		t.Fatalf("range: code=%d len=%d content-range=%q", part.Code, part.Body.Len(), part.Header().Get("Content-Range"))
	}
}
