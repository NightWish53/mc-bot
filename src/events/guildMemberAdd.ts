import type { GuildMember, TextChannel } from 'discord.js';
import { env } from '../config/env.js';
import { createEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

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

      const joinedAt = member.joinedAt ?? new Date();
      const embed = createEmbed({
        title: 'Yeni Üye',
        description: `${member.user} sunucuya katıldı!`,
        fields: [
          { name: 'Üye Sırası', value: `${member.guild.memberCount}. üye`, inline: true },
          {
            name: 'Katılım Tarihi',
            value: `<t:${Math.floor(joinedAt.getTime() / 1000)}:D>`,
            inline: true,
          },
        ],
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
      });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.warn('Karşılama mesajı gönderilemedi.', error);
    }
  },
};