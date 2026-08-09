import { REST, Routes } from 'discord.js';
import { env } from '../config/env.js';
import { loadCommands } from '../commands/registry.js';
import { logger } from '../utils/logger.js';

const commands = await loadCommands();
const body = [...commands.values()].map((command) => command.data.toJSON());

const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

try {
  logger.info(`Guild-scoped komut kaydediliyor: ${body.length} komut → guild ${env.GUILD_ID}`);
  await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), { body });
  logger.info('Komutlar başarıyla kaydedildi.');
} catch (error) {
  logger.error('Komut kaydı başarısız oldu.', error);
  process.exit(1);
}