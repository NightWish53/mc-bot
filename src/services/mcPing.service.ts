import { status, type JavaStatusResponse } from 'minecraft-server-util';
import { ActivityType, type Client, type Guild, type TextChannel } from 'discord.js';
import type { EmbedBuilder } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { createEmbed, successEmbed, warningEmbed } from '../utils/embeds.js';

const PING_TIMEOUT_MS = 5000;
const OFFLINE_TRIGGER = 2;

let consecutiveFailures = 0;
let offlineAlertActive = false;
let recordPlayers = 0;
let lastStatsCheckAt = 0;
let lastPlayerCountName = '';
let lastRecordName = '';

// Cache for /sunucu command
let cachedPingData: JavaStatusResponse | null = null;
let lastPingTime: number = 0;

function address(): string {
  return env.MC_SERVER_PORT === 25565 ? env.MC_SERVER_IP : `${env.MC_SERVER_IP}:${env.MC_SERVER_PORT}`;
}

export async function pingServer(): Promise<JavaStatusResponse | null> {
  if (!env.MC_SERVER_IP) return null;
  try {
    return await status(env.MC_SERVER_IP, env.MC_SERVER_PORT, { timeout: PING_TIMEOUT_MS });
  } catch {
    return null;
  }
}

export function getCachedPing(): { data: JavaStatusResponse | null; time: number } {
  return { data: cachedPingData, time: lastPingTime };
}

async function resolveChannel(guild: Guild, channelId: string): Promise<TextChannel | undefined> {
  if (!channelId) return undefined;
  try {
    const channel = (await guild.channels.fetch(channelId)) as TextChannel | undefined;
    return channel?.isTextBased() ? channel : undefined;
  } catch {
    return undefined;
  }
}

async function updateStatsChannels(guild: Guild): Promise<void> {
  const now = Date.now();
  const checkInterval = env.STAT_CHANNEL_UPDATE_MINUTES * 60_000;
  if (now - lastStatsCheckAt < checkInterval) return;

  const data = await pingServer();
  if (!data && !env.STATS_CHANNEL_PLAYERCOUNT_ID && !env.STATS_CHANNEL_RECORD_ID) return;

  if (data) recordPlayers = Math.max(recordPlayers, data.players.online);

  const playerCountName = data ? `🟢 Aktif: ${data.players.online}/${data.players.max}` : '🔴 Çevrimdışı';
  const recordName = `🏆 Rekor: ${recordPlayers}`;

  let changed = false;

  if (env.STATS_CHANNEL_PLAYERCOUNT_ID && playerCountName !== lastPlayerCountName) {
    const channel = await resolveChannel(guild, env.STATS_CHANNEL_PLAYERCOUNT_ID);
    if (channel) {
      try {
        await channel.setName(playerCountName, 'İstatistik kanalı güncellemesi');
        lastPlayerCountName = playerCountName;
        changed = true;
      } catch (error) {
        logger.warn('Oyuncu sayısı kanalı güncellenemedi.', error);
      }
    }
  }

  if (data && env.STATS_CHANNEL_RECORD_ID && recordName !== lastRecordName) {
    const channel = await resolveChannel(guild, env.STATS_CHANNEL_RECORD_ID);
    if (channel) {
      try {
        await channel.setName(recordName, 'İstatistik kanalı güncellemesi');
        lastRecordName = recordName;
        changed = true;
      } catch (error) {
        logger.warn('Rekor kanalı güncellenemedi.', error);
      }
    }
  }

  if (changed) lastStatsCheckAt = now;
}

async function handleOfflineAlert(guild: Guild, data: JavaStatusResponse | null): Promise<void> {
  const channel = await resolveChannel(guild, env.SERVER_OFFLINE_ALERT_CHANNEL_ID);
  if (!channel) return;

  if (data) {
    consecutiveFailures = 0;
    if (offlineAlertActive) {
      offlineAlertActive = false;
      try {
        await channel.send({
          embeds: [successEmbed('Sunucu tekrar çevrimiçi', `${address()} sunucusu yeniden yanıt veriyor.`)],
        });
      } catch (error) {
        logger.warn('Kurtarma mesajı gönderilemedi.', error);
      }
    }
    return;
  }

  consecutiveFailures += 1;
  if (consecutiveFailures >= OFFLINE_TRIGGER && !offlineAlertActive) {
    offlineAlertActive = true;
    const roleMention = env.SERVER_OFFLINE_ALERT_ROLE_ID ? `<@&${env.SERVER_OFFLINE_ALERT_ROLE_ID}>` : undefined;
    try {
      await channel.send({
        content: roleMention,
        embeds: [
          warningEmbed(
            'Sunucu çevrimdışı!',
            `${address()} sunucusuna ${OFFLINE_TRIGGER} ardışık ping başarısız oldu. Sunucu kapalı ya da erişilemiyor olabilir.`,
          ),
        ],
      });
    } catch (error) {
      logger.warn('Çevrimdışı alarmı gönderilemedi.', error);
    }
  }
}

async function updatePresence(client: Client, data: JavaStatusResponse | null): Promise<void> {
  const activityName = data
    ? `${data.players.online} kişi oynuyor`
    : `Çevrimdışı`;
  try {
    await client.user?.setActivity({ name: 'custom', type: ActivityType.Custom, state: activityName });
  } catch (error) {
    logger.debug('Presence güncellenemedi.', error);
  }
}

export function startMonitoring(client: Client): void {
  if (!env.MC_SERVER_IP) {
    logger.warn('MC_SERVER_IP tanımlı değil — sunucu izleme başlatılmadı.');
    return;
  }
  const guild = client.guilds.cache.get(env.GUILD_ID);
  if (!guild) {
    logger.warn('Sunucu izleme başlatılamadı: guild bulunamadı.');
    return;
  }

  const tick = async (): Promise<void> => {
    const data = await pingServer();
    
    // Update cache
    cachedPingData = data;
    lastPingTime = Date.now();

    await Promise.allSettled([
      updateStatsChannels(guild),
      handleOfflineAlert(guild, data),
      updatePresence(client, data),
    ]);
  };

  void tick();
  setInterval(() => void tick(), env.PING_INTERVAL_SECONDS * 1000);
  logger.info(`Sunucu izleme başladı: ${address()} (her ${env.PING_INTERVAL_SECONDS}s)`);
}

export function buildServerEmbed(data: JavaStatusResponse | null): EmbedBuilder {
  if (!data) {
    return warningEmbed(
      'Sunucu Çevrimdışı',
      `${address()} adresindeki sunucuya ulaşılamadı. Sunucu kapalı olabilir ya da IP/port yanlış yapılandırılmış olabilir.`,
    );
  }

  const latency = typeof data.roundTripLatency === 'number' ? `${data.roundTripLatency} ms` : 'Bilinmiyor';
  const players =
    data.players.sample?.length
      ? data.players.sample.slice(0, 12).map((player) => player.name).join(', ')
      : data.players.online > 0
        ? 'Oyuncu listesi sağlanmıyor'
        : 'Şu an kimse çevrimiçi değil';

  return createEmbed({
    title: '🟢 Sunucu Çevrimiçi',
    description: data.motd.clean || undefined,
    fields: [
      { name: 'Adres', value: `\`${address()}\``, inline: true },
      { name: 'Sürüm', value: data.version?.name || 'Bilinmiyor', inline: true },
      { name: 'Gecikme', value: latency, inline: true },
      { name: 'Oyuncular', value: `${data.players.online}/${data.players.max}`, inline: true },
      { name: 'Aktif Oyuncular', value: players, inline: false },
    ],
  });
}