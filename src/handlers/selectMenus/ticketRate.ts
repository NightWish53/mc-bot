import { MessageFlags, type StringSelectMenuInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { rateTicket } from '../../services/ticket.service.js';

export default {
  customIdPrefix: 'ticket_rate',
  async run(interaction: StringSelectMenuInteraction): Promise<void> {
    const [, rawId] = interaction.customId.split(':');
    const ticketId = Number(rawId);
    const rating = Number(interaction.values[0]);

    const result = await rateTicket(ticketId, rating, interaction.user.id, interaction.client);
    if (!result.ok) {
      await interaction.reply({ embeds: [errorEmbed('Puanlama Başarısız', result.message)], flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await interaction.message.edit({ components: [] });
    } catch {
      // Puan mesajı artık düzenlenemiyorsa sorun değil
    }
    await interaction.reply({ embeds: [successEmbed('Teşekkürler', result.message)], flags: MessageFlags.Ephemeral });
  },
};
