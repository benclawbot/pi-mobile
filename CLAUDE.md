# Pi-Mobile

Mobile-first PWA wrapper for howcode with Tailscale support.

## Project Structure

```
pi-mobile/
├── howcode-submodule/   # howcode source (git submodule)
├── public/              # Built assets (served statically)
│   ├── assets/          # JS/CSS bundles
│   └── index.html       # Mobile wrapper HTML
├── scripts/
│   └── sync-howcode.ts # Build and sync script
├── server.js           # Static file server
└── src/                 # React PWA source (not currently used)
```

## Important Notes

### Asset Building
- howcode builds produce assets with content-hashed filenames (e.g., `index-CJy9R63G.js`)
- **After every sync, update `public/index.html`** to reference the correct hash
- Run `npm run sync` to rebuild and sync

### Current State (2026-05-08)
- **Index JS**: `index-CJy9R63G.js`
- **Index CSS**: `index-mCl6wPTb.css`
- **Server**: Running on port 5173
- **Access URLs**:
  - Local: http://localhost:5173
  - Network: http://100.69.199.38:5173
  - MagicDNS: http://pcmaison.tail94f992.ts.net:5173

### Mobile Changes in howcode
The following files in `howcode-submodule/` contain mobile-specific modifications:
- `src/app/hooks/useHoverToFocus.ts` - Auto-disables hover-to-focus on touch devices
- `src/app/hooks/useWindowSize.ts` - Window resize detection
- `src/app/hooks/useIsMobile.ts` - Mobile/tablet detection hooks
- `src/app/components/workspace/mobile/` - Mobile layout components (placeholder)

### Sync Process
1. `npm run sync` builds howcode and copies to `public/`
2. Script preserves `public/index.html` (mobile wrapper)
3. Assets land in `public/assets/` with new hashes
4. Update index.html references if needed

## Key Files
- `public/index.html` - Mobile wrapper with Tailscale indicator and mobile CSS
- `server.js` - Node.js static file server
- `scripts/sync-howcode.ts` - Build automation

## User's Devices
- Desktop: `pcmainen` at 100.69.199.38
- Phone: CMF Phone2Pro at 100.117.143.50
- Tailscale suffix: `tail94f992.ts.net`
