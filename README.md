# Echoes

Echoes is a haunted campus made of anonymous voice notes. Students leave short recordings pinned to real places on campus and around town, and you can only hear one by standing at the spot. Popular echoes become campus folklore, and some point to real clubs and events, so the app works as a way into communities that already exist.

Built for the JMU makeathon. Theme: break out of your comfort zone.

The full outline of the idea is in [IDEA.md](IDEA.md).

## Demo app

Mobile-first web app. On a phone it fills the screen; on a desktop it renders inside an iPhone-shaped frame. Everything lives in memory, nothing is persisted. Audio is stored as byte arrays in the Go process.

```
backend/   Go, stdlib only. In-memory store, a few far-away example echoes, guardrail screening.
frontend/  Vite + React + TypeScript. Leaflet with Esri World Imagery satellite tiles, no API key.
```

### Run

Needs Go 1.22+, Node 20+, and [Task](https://taskfile.dev) (`brew install go-task`).

```sh
task setup   # npm install
task dev     # backend :8080 + frontend :5173
task test    # go vet + go test + tsc
task build   # bin/echoes-server with the frontend embedded
```

Or by hand: `cd backend && go run ./cmd/server` and `cd frontend && npm run dev` (Vite proxies `/api` to :8080).

Open http://localhost:5173. For a real phone on the same Wi-Fi use the network URL Vite prints, and switch the location chip to GPS.

### Single binary

`task build` runs Vite into `backend/internal/web/dist`, which `backend/internal/web` embeds, so `bin/echoes-server` serves both the API (`/api/...`) and the app. `task serve` runs it on :8080.

### Deploy (Docker Compose + nginx + Let's Encrypt)

Live at https://quikcad.net.

```sh
task deploy                      # = deploy/deploy.sh docean quikcad.net
```

`deploy/deploy.sh` builds the frontend and cross-compiles a static linux/amd64 binary locally (the droplet is too small to build the frontend), copies it with `docker-compose.yml`, `deploy/Dockerfile.runtime` and the nginx template to `/opt/echoes`, then runs `deploy/remote.sh` on the host: builds a distroless runtime image, starts `app` + `nginx`, bootstraps a self-signed cert if needed so nginx can answer the ACME challenge, obtains the real cert for the domain (and `www.` when it resolves there), reloads nginx and starts the certbot renewer. Only the `echoes` compose project is touched. Re-running is idempotent.

### Backend layout

```
backend/
  cmd/server/          entrypoint
  internal/echo/       model, in-memory store, geo, placeholder WAV generator
  internal/screen/     transcript guardrails
  internal/seed/       far-away example echoes (show the locked state)
  internal/httpapi/    HTTP handlers and routing
  internal/web/        embedded frontend build (dist/ is gitignored)
```

### Demo flow

- Your position comes from GPS when the browser allows it; otherwise it is locked to **Hartman Hall** (where the demo runs). There is no manual way to move.
- Hit **Echo** to record one where you stand. Echoes you recorded play from anywhere (the create response hands the client an `authorKey`).
- The example pins are all several hundred meters away, so tapping them shows the locked state. Other people's echoes only play within 75 m.
- Listen, tap **me too**, leave a warm reply (voice, optional open door).
- The **Echo** tab records a new echo at your position. Transcript comes from browser speech recognition (Chrome/Safari) or you type it. It is screened live: naming a person blocks, crisis words add a support card and keep it out of Legends.
- 25 "me too" taps turn an echo into a Legend with an auto-generated title.
- **Legends** tab: leaderboard, rising echoes, heat by place. **Me** tab: passport of places heard, your own echo stats (counts only, never who).

### API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/echoes[?lat&lng][&limit=n]` | up to 40 echoes. With a position: all Legends, then nearest first. Without: Legends, then by me too |
| POST | `/api/echoes` | multipart: `audio`, `lat`, `lng`, `transcript`, `place`, `tone`, `duration`, `doorName/When/Where`. A pin within 8 m of an existing one is scattered 10–30 m so pins don't stack |
| GET | `/api/echoes/{id}` | |
| DELETE | `/api/echoes/{id}` | author retires echo |
| GET | `/api/echoes/{id}/audio` | raw bytes |
| POST | `/api/echoes/{id}/listen?lat&lng[&key]` | 403 if farther than 75 m, unless `key` is the echo's `authorKey` |
| POST | `/api/echoes/{id}/metoo` | mints Legend at 25 |
| DELETE | `/api/echoes/{id}/metoo` | take a me too back |
| POST | `/api/echoes/{id}/replies` | multipart like create |
| GET | `/api/echoes/{id}/replies/{rid}/audio` | |
| GET | `/api/heat` | activity per place |
| POST | `/api/screen` | `{transcript}` → `{blocked, reason, flagged, resource}` |

## Planned

- Website
- Short slide deck for the pitch
