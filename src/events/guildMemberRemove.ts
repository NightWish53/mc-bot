import type { GuildMember, TextChannel } from 'discord.js';
import { env } from '../config/env.js';
import { createEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'guildMemberRemove',
  once: false,
  async execute(member: GuildMember) {
    if (!env.LOBBY_CHANNEL_ID) return;

    let joinedAt: Date | null = null;
    try {
      const fetched = await member.guild.members.fetch(member.id);
      joinedAt = fetched.joinedAt;
    } catch {
      // Üye artık sunucuda yok — cache'deki bilgiyle devam et.
    }

    const memberName = member.user?.tag ?? `Bilinmeyen üye (${member.id})`;
    const avatar = member.user?.displayAvatarURL({ size: 256 });

    let membershipNote = '';
    if (joinedAt) {
      const days = Math.floor((Date.now() - joinedAt.getTime()) / 86_400_000);
      membershipNote =
        days === 0
          ? ' Aynı gün içinde ayrıldı.'
          : days === 1
            ? ' 1 gündür üyeydi.'
            : ` ${days} gündür üyeydi.`;
    }

    try {
      const channel = (await member.guild.channels.fetch(env.LOBBY_CHANNEL_ID)) as TextChannel | null;
      if (!channel?.isTextBased()) return;

      const embed = createEmbed({
        title: 'Üye Ayrıldı',
        description: `👋 **${memberName}** sunucudan ayrıldı.${membershipNote}`,
        thumbnail: avatar,
      });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.warn('Ayrılış mesajı gönderilemedi.', error);
    }
  },
};