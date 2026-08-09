import { MessageFlags, type ButtonInteraction, GuildMember } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { claimTicket } from '../../services/ticket.service.js';

export default {
  customIdPrefix: 'ticket_claim',
  async run(interaction: ButtonInteraction): Promise<void> {
    const ticketId = Number(interaction.customId.split(':')[1]);
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('Hata', 'Bu işlem sunucu içinde yapılmalı.')], flags: MessageFlags.Ephemeral });
      return;
    }
    const actor = interaction.member as GuildMember;

    const result = await claimTicket(interaction.guild, ticketId, actor);
    if (!result.ok) {
      await interaction.reply({ embeds: [errorEmbed('Devralma Başarısız', result.message)], flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ embeds: [successEmbed('Devralındı', result.message)], flags: MessageFlags.Ephemeral });
  },
};