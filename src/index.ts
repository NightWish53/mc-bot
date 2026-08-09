import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { logger } from './utils/logger.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const eventsDir = join(moduleDir, 'events');

interface EventHandler {
  name: string;
  once?: boolean;
  execute: (...args: never[]) => unknown;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
});

for (const file of readdirSync(eventsDir)) {
  if (!/\.(ts|js)$/.test(file)) continue;
  const mod = (await import(pathToFileURL(join(eventsDir, file)).href)) as {
    default?: EventHandler;
  };
  if (!mod.default) continue;
  const { name, execute, once } = mod.default;
  if (once) {
    client.once(name as keyof typeof Events, execute as never);
  } else {
    client.on(name as keyof typeof Events, execute as never);
  }
  logger.info(`Event yüklendi: ${name}`);
}

client.login(env.DISCORD_TOKEN).catch((error) => {
  logger.error('Bot giriş yapamadı (token hatalı olabilir).', error);
  process.exit(1);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
  logger.info('Bot kapatılıyor...');
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
}