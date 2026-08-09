import type { ButtonInteraction } from 'discord.js';
import { buildCloseReasonModal } from '../modals/ticketCloseReason.js';

export default {
  customIdPrefix: 'ticket_close',
  async run(interaction: ButtonInteraction): Promise<void> {
    const ticketId = Number(interaction.customId.split(':')[1]);
    await interaction.showModal(buildCloseReasonModal(ticketId));
  },
};