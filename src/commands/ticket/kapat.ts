import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';
import { getTicketByChannel } from '../../services/ticket.service.js';
import { buildCloseReasonModal } from '../../handlers/modals/ticketCloseReason.js';

export default {
  data: new SlashCommandBuilder().setName('kapat').setDescription('Aktif ticket kanalını kapatır'),

  async execute(interaction: ChatInputCommandInteraction) {
    const ticket = await getTicketByChannel(interaction.channelId);
    if (!ticket || ticket.status !== 'open') {
      await interaction.reply({ embeds: [errorEmbed('Ticket Bulunamadı', "Bu kanal açık bir ticket'a bağlı değil.")], flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.showModal(buildCloseReasonModal(ticket.id));
  },
};