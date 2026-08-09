import type { MessageCreateOptions, User } from 'discord.js';
import { logger } from './logger.js';

/**
 * Kullanıcıya DM göndermek için tek güvenli nokta.
 * DM kapalıysa (DiscordAPIError 50007) veya başka bir hata olursa asla istisna fırlatmaz —
 * logger.warn basar ve false döner. Bot bu fonksiyon yüzünden asla çökmez.
 *
 * AGENTS.md kuralı: Hiçbir DM akışı bu fonksiyon dışına çıkamaz.
 */
export async function safeDm(user: User, options: MessageCreateOptions): Promise<boolean> {
  try {
    await user.send(options);
    return true;
  } catch (error) {
    logger.warn(`DM gönderilemedi (${user.id}): DM kapalı veya kullanıcıya ulaşılamıyor.`, {
      code: error instanceof Error && 'code' in error ? (error as { code?: unknown }).code : undefined,
      message: error instanceof Error ? error.message : undefined,
    });
    return false;
  }
}