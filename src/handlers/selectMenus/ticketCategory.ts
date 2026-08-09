import { MessageFlags, type StringSelectMenuInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { openTicket } from '../../services/ticket.service.js';

export default {
  customIdPrefix: 'ticket_cat',
  async run(interaction: StringSelectMenuInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const category = interaction.values[0];
    if (!category) {
      await interaction.editReply({ embeds: [errorEmbed('Kategori Seçilmedi', 'Lütfen bir kategori seçin.')] });
      return;
    }

    const result = await openTicket(interaction, category);
    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Ticket Açılamadı', result.message)] });
      return;
    }
    await interaction.editReply({ embeds: [successEmbed('Ticket Açıldı', result.message)] });
  },
};