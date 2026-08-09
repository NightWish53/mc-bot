import { MessageFlags, ActionRowBuilder,
  StringSelectMenuBuilder,
  type ButtonInteraction, } from 'discord.js';
import { TICKET_CATEGORIES } from '../../services/ticket.service.js';

export default {
  customIdPrefix: 'ticket_create',
  async run(interaction: ButtonInteraction): Promise<void> {
    const select = new StringSelectMenuBuilder()
      .setCustomId('ticket_cat')
      .setPlaceholder('Kategori seçin…')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        TICKET_CATEGORIES.map((c) => ({
          label: c.label,
          value: c.value,
          emoji: c.emoji,
        })),
      );

    await interaction.reply({
      content: 'Hangi konuda yardıma ihtiyacınız var?',
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  },
};