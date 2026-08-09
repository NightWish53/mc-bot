import type { GuildMember, TextChannel } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { renderWelcomeCard } from '../services/welcomeCard.service.js';
import { AttachmentBuilder } from 'discord.js';

export default {
  name: 'guildMemberRemove',
  once: false,
  async execute(member: GuildMember) {
    if (!env.LOBBY_CHANNEL_ID) return;


    try {
      await member.guild.members.fetch(member.id);
    } catch {
      // Üye artık sunucuda yok — cache'deki bilgiyle devam et.
    }

    try {
      const channel = (await member.guild.channels.fetch(env.LOBBY_CHANNEL_ID)) as TextChannel | null;
      if (!channel?.isTextBased()) return;

      const buffer = await renderWelcomeCard({
        member,
        type: 'leave',
        memberCount: member.guild.memberCount,
      });

      const attachment = buffer ? new AttachmentBuilder(buffer, { name: 'leave.png' }) : null;

      if (!attachment) {
        logger.warn('Ayrılış resmi oluşturulamadı, mesaj gönderilmedi.');
        return;
      }

      await channel.send({ files: [attachment] });
    } catch (error) {
      logger.warn('Ayrılış mesajı gönderilemedi.', error);
    }
  },
};