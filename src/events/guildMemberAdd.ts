import type { GuildMember, TextChannel } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { renderWelcomeCard } from '../services/welcomeCard.service.js';
import { AttachmentBuilder } from 'discord.js';

export default {
  name: 'guildMemberAdd',
  once: false,
  async execute(member: GuildMember) {
    if (!env.LOBBY_CHANNEL_ID && !env.AUTO_ROLE_ID) return;

    if (env.AUTO_ROLE_ID && !member.user.bot) {
      try {
        await member.roles.add(env.AUTO_ROLE_ID, 'Otomatik rol (katılım)');
      } catch (error) {
        logger.warn(`AUTO_ROLE verilemedi (${member.id}).`, error);
      }
    }

    if (!env.LOBBY_CHANNEL_ID) return;
    try {
      const channel = (await member.guild.channels.fetch(env.LOBBY_CHANNEL_ID)) as TextChannel | null;
      if (!channel?.isTextBased()) return;

      const buffer = await renderWelcomeCard({
        member,
        type: 'join',
        memberCount: member.guild.memberCount,
      });

      const attachment = buffer ? new AttachmentBuilder(buffer, { name: 'welcome.png' }) : null;

      if (!attachment) {
        logger.warn('Karşılama resmi oluşturulamadı, mesaj gönderilmedi.');
        return;
      }

      await channel.send({ files: [attachment] });
    } catch (error) {
      logger.warn('Karşılama mesajı gönderilemedi.', error);
    }
  },
};