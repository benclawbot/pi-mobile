# Pi-Mobile

Mobile-first PWA wrapper for [howcode](https://github.com/benclawbot/howcode) with Tailscale support.

## Features

- 📱 **Mobile-first UI** - Optimized for touch, hamburger menu, swipe gestures
- 📦 **Full howcode features** - All terminal, file, git, and AI capabilities
- 🌐 **PWA installable** - Add to home screen, works offline
- 🔒 **Tailscale integration** - Static badge indicating Tailscale connection
- 🔄 **Auto-sync** - Pulls and builds latest howcode source

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Pi-Mobile PWA                     │
│  - howcode web UI (src/)                           │
│  - Mobile-first CSS overrides                       │
│  - Service worker (Workbox)                        │
│  - Tailscale status badge                           │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              howcode-submodule/                     │
│  - Full howcode source                             │
│  - Built by Vite                                   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Tailscale Network                      │
│  - tailscale serve exposes locally                  │
│  - Devices on tailnet access PWA from anywhere     │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

- [howcode](https://github.com/benclawbot/howcode) repo access
- [Tailscale](https://tailscale.com/) installed on your machine
- Node.js 18+ or Bun

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/benclawbot/pi-mobile.git
cd pi-mobile
```

### 2. Add howcode as a git submodule

```bash
git submodule add https://github.com/benclawbot/howcode howcode-submodule
```

### 3. Sync and build

```bash
npm install
npm run sync
```

This will:
- Install howcode dependencies
- Build howcode's web UI
- Copy all assets to pi-mobile
- Set up the mobile-optimized entry point

### 4. Run locally

```bash
npm run dev
```

Then open http://localhost:5173

### 5. Expose via Tailscale

On your machine, run:

```bash
# Simple HTTP (for local network)
tailscale serve --bg http://localhost:5173

# Or HTTPS with funnel (public access)
tailscale funnel 5173
```

Your Tailscale IP will be something like `100.x.x.x`

### 6. Access from mobile

1. Install Tailscale on your phone/tablet
2. Log in with the same account
3. Open `http://<your-machine-tailnet-ip>:5173`

Or if using funnel with HTTPS:
- Open `https://<your-machine-tailnet-name>.ts.net`

## Development

```bash
# Start dev server
npm run dev

# Sync howcode source (one time)
npm run sync

# Watch for howcode changes (auto-rebuild)
npm run sync:watch
```

### Updating howcode

```bash
cd howcode-submodule
git pull origin master
cd ..
npm run sync
```

## Building PWA

```bash
npm run build
```

The built PWA will be in `dist/` - deploy to any static host or serve locally.

## Project Structure

```
pi-mobile/
├── public/
│   └── icons/              # PWA icons
├── scripts/
│   └── sync-howcode.ts    # Sync + build script
├── src/
│   ├── main.tsx           # Mobile-optimized entry
│   ├── mobile.css         # Mobile-first overrides
│   └── howcode-submodule/ # Submodule (git)
├── package.json
├── vite.config.ts          # PWA + Workbox config
└── README.md
```

## License

MIT
