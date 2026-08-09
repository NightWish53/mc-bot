import { MessageFlags, type ButtonInteraction, GuildMember } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { releaseTicket } from '../../services/ticket.service.js';

export default {
  customIdPrefix: 'ticket_release',
  async run(interaction: ButtonInteraction): Promise<void> {
    const ticketId = Number(interaction.customId.split(':')[1]);
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('Hata', 'Bu işlem sunucu içinde yapılmalı.')], flags: MessageFlags.Ephemeral });
      return;
    }
    const actor = interaction.member as GuildMember;

    const result = await releaseTicket(interaction.guild, ticketId, actor);
    if (!result.ok) {
      await interaction.reply({ embeds: [errorEmbed('Bırakma Başarısız', result.message)], flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ embeds: [successEmbed('Bırakıldı', result.message)], flags: MessageFlags.Ephemeral });
  },
};