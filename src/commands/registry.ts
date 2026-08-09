import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Command } from '../types/index.js';
import { logger } from '../utils/logger.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const commandsRoot = join(moduleDir, '..', 'commands');

function listCommandFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listCommandFiles(fullPath));
    } else if (/\.(ts|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function loadCommands(): Promise<Map<string, Command>> {
  const commands = new Map<string, Command>();
  for (const file of listCommandFiles(commandsRoot)) {
    try {
      const mod = (await import(pathToFileURL(file).href)) as { default?: Command };
      if (!mod.default?.data?.name) continue;
      commands.set(mod.default.data.name, mod.default);
    } catch (error) {
      logger.error(`Komut yüklenemedi: ${file}`, error);
    }
  }
  logger.info(`${commands.size} komut kayıt edildi.`);
  return commands;
}