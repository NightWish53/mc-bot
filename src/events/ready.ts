import { ActivityType, type Client } from 'discord.js';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { startMonitoring } from '../services/mcPing.service.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'clientReady',
  once: true,
  async execute(client: Client) {
    const guild = client.guilds.cache.get(env.GUILD_ID);
    if (guild) {
      const memberCount = guild.memberCount;
      await client.user?.setActivity({ name: 'custom', type: ActivityType.Custom, state: `${memberCount} üye oynuyor` });
      logger.info(`Bot online: ${client.user?.tag} → ${guild.name}`);
    } else {
      await client.user?.setActivity({ name: 'custom', type: ActivityType.Custom, state: `Çevrimdışı` });
      logger.warn(`GUILD_ID bulunamadı: ${env.GUILD_ID}`);
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info('SQLite veritabanı bağlantısı doğrulandı.');
    } catch (error) {
      logger.error('Veritabanı bağlantısı DOĞRULANAMADI.', error);
    }

    startMonitoring(client);
  },
};