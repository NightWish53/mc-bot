import { MessageFlags, ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction, } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { closeTicket } from '../../services/ticket.service.js';

export function buildCloseReasonModal(ticketId: number): ModalBuilder {
  const reasonInput = new TextInputBuilder()
    .setCustomId('sebep')
    .setLabel('Kapanış sebebi (opsiyonel)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Örn: Sorun çözüldü, multi hesap şüphesi…')
    .setMaxLength(500)
    .setRequired(false);

  return new ModalBuilder()
    .setCustomId(`ticket_close_reason:${ticketId}`)
    .setTitle('🔒 Ticket Kapat')
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
}

export default {
  customIdPrefix: 'ticket_close_reason',
  async run(interaction: ModalSubmitInteraction): Promise<void> {
    const ticketId = Number(interaction.customId.split(':')[1]);
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('Hata', 'Bu işlem sunucu içinde yapılmalı.')], flags: MessageFlags.Ephemeral });
      return;
    }
    const actor = interaction.member as import('discord.js').GuildMember;
    const reason = interaction.fields.getTextInputValue('sebep') || null;

    await interaction.reply({ embeds: [successEmbed('Kapatılıyor', 'Ticket kapatılıyor, bir saniye…')], flags: MessageFlags.Ephemeral });

    const result = await closeTicket(interaction.guild, ticketId, actor, reason);
    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Kapatma Başarısız', result.message)] });
      return;
    }
    // No editReply on success because the channel (and thus the interaction message) has been deleted.
  },
};