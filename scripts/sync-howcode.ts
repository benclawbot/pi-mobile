#!/usr/bin/env tsx

/**
 * Sync script - Builds howcode and prepares assets for Pi-Mobile PWA
 * 
 * This script:
 * 1. Checks if howcode submodule exists
 * 2. Installs howcode deps if needed
 * 3. Builds howcode's web UI (src/) and pages
 * 4. Copies built assets to pi-mobile public/
 * 5. Preserves the mobile wrapper index.html
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

  // Clean destination public folder (keep icons, favicon.svg and our custom index.html)
  console.log('🧹 Cleaning previous build...');
  if (existsSync(DEST_PUBLIC)) {
    const files = await readdir(DEST_PUBLIC);
    for (const file of files) {
      if (file !== 'icons' && file !== 'favicon.svg' && file !== 'index.html') {
        await rm(join(DEST_PUBLIC, file), { recursive: true, force: true });
      }
    }
  }
  
  // CRITICAL: Read existing index.html BEFORE copying dist to preserve our mobile wrapper
  const existingIndexPath = join(DEST_PUBLIC, 'index.html');
  const existingIndexContent = await readFile(existingIndexPath, 'utf-8');
  console.log('   ✓ Saved existing mobile wrapper');

  // Copy built assets from main dist
  console.log('📁 Copying main app assets...');
  await copyDir(HOWCODE_DIST, DEST_PUBLIC);
  console.log('   ✓ dist/');
  
  // CRITICAL: Restore our mobile wrapper AFTER copying dist
  await writeFile(existingIndexPath, existingIndexContent);
  console.log('   ✓ index.html (mobile wrapper restored)');

  // Copy pages to public/howcode/
  console.log('📁 Copying landing page...');
  const howcodeDir = join(DEST_PUBLIC, 'howcode');
  await copyDir(HOWCODE_DIST_PAGES, howcodeDir);
  console.log('   ✓ howcode/');

  console.log('\n✅ Sync complete!');
  console.log('   Run: node server.js   (to start the server)');
  console.log('');
  console.log('📱 Access on mobile via Tailscale at http://pcmaison.tail94f992.ts.net:5173');
}

syncHowcode().catch((err) => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});