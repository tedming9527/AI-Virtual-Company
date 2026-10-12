// lockfile.js —— 本地生效版本账本（FR-4/FR-5：版本号唯一权威来源）

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const LOCK_NAME = 'lockfile.json';

function defaults() {
  return { current: null, packages: {}, overrides: {}, updatedAt: null };
}

export function lockPath(runtimeDir) {
  return join(runtimeDir, LOCK_NAME);
}

export function readLock(runtimeDir) {
  const file = lockPath(runtimeDir);
  if (!existsSync(file)) return defaults();
  try {
    const json = JSON.parse(readFileSync(file, 'utf8'));
    return { ...defaults(), ...json };
  } catch {
    return defaults();
  }
}

export function writeLock(runtimeDir, lock) {
  const file = lockPath(runtimeDir);
  mkdirSync(dirname(file), { recursive: true });
  const data = { ...defaults(), ...lock, updatedAt: new Date().toISOString() };
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return data;
}
