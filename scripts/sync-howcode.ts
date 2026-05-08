#!/usr/bin/env tsx

/**
 * Sync script - Copies howcode build to Pi-Mobile public/
 */

import { cp, rm, readdir } from 'fs/promises';
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
  


  // Clean public (keep icons, favicon)
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
  

  console.log('\n✅ Sync complete!');
  console.log('   Run: node server.js');
  console.log('   Access: http://pcmainen.tail94f992.ts.net:5173');
}

syncHowcode().catch((err) => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
