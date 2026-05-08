#!/usr/bin/env tsx

/**
 * Sync script - Copies howcode build to Pi-Mobile public/
 */

import { cp, rm, readdir, appendFile, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const HOWCODE_PATH = join(PROJECT_ROOT, 'howcode-submodule');
const HOWCODE_DIST = join(HOWCODE_PATH, 'dist');
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
    await cp(join(src, file), join(dest, file), { recursive: true });
  }
}

async function syncHowcode(): Promise<void> {
  console.log('🔄 Syncing howcode...\n');

  if (!existsSync(HOWCODE_PATH)) {
    console.error('❌ howcode-submodule not found.');
    process.exit(1);
  }

  // Install deps
  console.log('📦 Installing dependencies...');
  await runCommand('npm', ['install', '--ignore-scripts'], HOWCODE_PATH);
  
  // Build howcode
  console.log('🔨 Building howcode...');
  await runCommand('npm', ['exec', '--', 'vite', 'build'], HOWCODE_PATH);
  
  // Clean public (keep icons and our mobile wrapper index.html)
  console.log('🧹 Cleaning public folder...');
  const keepFiles = ['icons', 'favicon.svg', 'index.html'];
  const files = await readdir(DEST_PUBLIC);
  for (const file of files) {
    if (!keepFiles.includes(file)) {
      await rm(join(DEST_PUBLIC, file), { recursive: true, force: true });
    }
  }

  // Copy dist to public
  console.log('📁 Copying howcode build...');
  await copyDir(HOWCODE_DIST, DEST_PUBLIC);
  
  // Append mobile CSS to howcode's stylesheet
  console.log('📱 Appending mobile CSS...');
  const mobileCss = `

/* Mobile CSS - Pi-Mobile */
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
html, body { height: 100%; width: 100%; overflow: hidden; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; touch-action: manipulation; -webkit-font-smoothing: antialiased; overscroll-behavior: none; }
#tailscale-indicator { position: fixed; top: 8px; right: 8px; z-index: 9999; display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 500; backdrop-filter: blur(10px); }
#tailscale-indicator.connected { background: rgba(80, 197, 116, 0.2); border: 1px solid rgba(80, 197, 116, 0.4); color: #50c574; }
#tailscale-indicator.disconnected { background: rgba(255, 107, 107, 0.2); border: 1px solid rgba(255, 107, 107, 0.4); color: #ff6b6b; }
@media (max-width: 768px) {
  [data-app-shell], #root > div { height: 100vh !important; height: 100dvh !important; display: flex !important; flex-direction: column !important; }
  [data-workspace], [data-workspace-view], .workspace-view { flex: 1 !important; overflow: hidden !important; min-height: 0 !important; }
  [data-thread], [data-timeline], .thread-timeline, .thread-container { flex: 1 !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; min-height: 0 !important; }
  .terminal-drawer, [data-terminal-drawer], .artifact-drawer, [data-artifact-drawer], .agent-view, .artifacts-view { display: none !important; }
  .motion-terminal-drawer[data-open="true"] { display: none !important; }
}
`;
  const cssFiles = await readdir(join(DEST_PUBLIC, 'assets'));
  const mainCss = cssFiles.find(f => f.startsWith('index-') && f.endsWith('.css'));
  if (mainCss) {
    const cssPath = join(DEST_PUBLIC, 'assets', mainCss);
    let existingCss = await readFile(cssPath, 'utf8');
    const marker = '/* Mobile CSS - Pi-Mobile */';
    if (existingCss.includes(marker)) {
      existingCss = existingCss.substring(0, existingCss.indexOf(marker));
    }
    await writeFile(cssPath, existingCss + mobileCss);
  }

  console.log('\n✅ Sync complete!');
  console.log('   Run: node server.js');
  console.log('   Access: http://pcmainen.tail94f992.ts.net:5173');
}

syncHowcode().catch((err) => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
