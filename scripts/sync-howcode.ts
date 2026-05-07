#!/usr/bin/env tsx

/**
 * Sync script - Builds howcode and prepares assets for Pi-Mobile PWA
 * 
 * This script:
 * 1. Checks if howcode submodule exists
 * 2. Installs howcode deps if needed
 * 3. Builds howcode's web UI (src/) and pages
 * 4. Copies built assets to pi-mobile public/
 * 5. Updates the index.html to load howcode properly
 */

import { cp, rm, readdir, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const HOWCODE_PATH = join(PROJECT_ROOT, 'howcode-submodule');
const HOWCODE_DIST = join(HOWCODE_PATH, 'dist');
const HOWCODE_DIST_PAGES = join(HOWCODE_PATH, 'dist-pages');
const DEST_PUBLIC = join(PROJECT_ROOT, 'public');

async function runCommand(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function copyDir(src: string, dest: string): Promise<void> {
  if (!existsSync(src)) return;
  
  const files = await readdir(src);
  for (const file of files) {
    const srcPath = join(src, file);
    const destPath = join(dest, file);
    await cp(srcPath, destPath, { recursive: true });
  }
}

async function syncHowcode(): Promise<void> {
  console.log('🔄 Syncing howcode source...\n');

  // Check if howcode submodule exists
  if (!existsSync(HOWCODE_PATH)) {
    console.error('❌ howcode-submodule not found.');
    console.error('   Run: git submodule add https://github.com/benclawbot/howcode howcode-submodule');
    process.exit(1);
  }

  // Check if package.json exists in howcode
  if (!existsSync(join(HOWCODE_PATH, 'package.json'))) {
    console.error('❌ howcode-submodule is empty or invalid.');
    console.error('   Run: git submodule update --init --recursive');
    process.exit(1);
  }

  console.log('📦 Installing howcode dependencies...');
  await runCommand('npm', ['install', '--ignore-scripts'], HOWCODE_PATH);
  console.log('');

  // Build main app
  console.log('🔨 Building howcode web app...');
  await runCommand('npm', ['exec', '--', 'vite', 'build'], HOWCODE_PATH);
  console.log('');

  // Build pages (landing page)
  console.log('🔨 Building howcode pages...');
  await runCommand('npm', ['exec', '--', 'vite', 'build', '--config', 'pages/vite.config.ts'], HOWCODE_PATH);
  console.log('');

  // Clean destination public folder (keep icons)
  console.log('🧹 Cleaning previous build...');
  if (existsSync(DEST_PUBLIC)) {
    const files = await readdir(DEST_PUBLIC);
    for (const file of files) {
      if (file !== 'icons' && file !== 'favicon.svg') {
        await rm(join(DEST_PUBLIC, file), { recursive: true, force: true });
      }
    }
  }

  // Copy built assets from main dist
  console.log('📁 Copying main app assets...');
  await copyDir(HOWCODE_DIST, DEST_PUBLIC);
  console.log('   ✓ dist/');

  // Copy pages to public/howcode/
  console.log('📁 Copying landing page...');
  const howcodeDir = join(DEST_PUBLIC, 'howcode');
  await copyDir(HOWCODE_DIST_PAGES, howcodeDir);
  console.log('   ✓ howcode/');

  // Update root index.html to redirect to howcode or show loading
  const rootIndexPath = join(PROJECT_ROOT, 'index.html');
  const rootIndexContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1a1a2e" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>Pi-Mobile</title>
    <script>
      // Redirect to howcode app
      window.location.href = '/howcode/index.html';
    </script>
  </head>
  <body>
    <noscript>
      <p>Redirecting to Pi...</p>
      <a href="/howcode/">Open Pi</a>
    </noscript>
  </body>
</html>`;
  await writeFile(rootIndexPath, rootIndexContent);
  console.log('   ✓ index.html (redirect)');

  // Create a standalone index that loads the full app
  const appIndexPath = join(DEST_PUBLIC, 'index.html');
  const appIndexContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1a1a2e" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>Pi</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  await writeFile(appIndexPath, appIndexContent);
  console.log('   ✓ app index');

  // Create the mobile-first app entry
  const srcDir = join(PROJECT_ROOT, 'src');
  const howcodeSrcDir = join(HOWCODE_PATH, 'src');
  const howcodeMainTsx = join(howcodeSrcDir, 'main.tsx');
  const howcodeStyles = join(howcodeSrcDir, 'styles.css');
  
  // Copy howcode source for the app
  await cp(howcodeSrcDir, srcDir, { recursive: true, force: true });
  
  // Copy howcode styles
  await cp(howcodeStyles, join(srcDir, 'styles.css'), { force: true });

  // Update src/main.tsx to be mobile-friendly
  const mobileMainContent = `import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@xterm/xterm/css/xterm.css'
import '@fontsource-variable/inter'
import './styles.css'
import App from './app'
import { applyStoredPiGuiTheme } from './app/app-shell/usePiGuiTheme'
import { queryClient } from './app/query/query-client'

// Mobile-optimized: no dev-web-bridge, no react-grab
window.howcodeLoaded = true

try {
  applyStoredPiGuiTheme()
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  )
} catch (error) {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = \`<pre class="bootstrap-error">Bootstrap error:\n\${String(error)}</pre>\`
  }

  throw error
}
`;
  await writeFile(join(srcDir, 'main.tsx'), mobileMainContent);

  console.log('\n✅ Sync complete!');
  console.log('   Run: npm run dev   (for local dev at http://localhost:5173)');
  console.log('   Run: npm run build (for production PWA)');
  console.log('');
  console.log('📱 Access on mobile via Tailscale at http://<your-tailnet-ip>:5173');
}

syncHowcode().catch((err) => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
