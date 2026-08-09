import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, type ButtonInteraction, MessageFlags } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { env } from '../../config/env.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
  customIdPrefix: 'staff_app_start',
  async run(interaction: ButtonInteraction): Promise<void> {
    const existingApp = await prisma.staffApplication.findFirst({
      where: { userId: interaction.user.id },
    });

    if (existingApp) {
      await interaction.reply({
        embeds: [errorEmbed('Zaten Başvurdunuz', 'Daha önce bir başvuru yapmışsınız. Herkes sadece bir kere başvurabilir.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('staff_application')
      .setTitle('Yetkili Başvuru Formu');

    const questions = [
      env.STAFF_APP_QUESTION_1,
      env.STAFF_APP_QUESTION_2,
      env.STAFF_APP_QUESTION_3,
      env.STAFF_APP_QUESTION_4,
      env.STAFF_APP_QUESTION_5,
    ];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q && q.trim().length > 0) {
        const input = new TextInputBuilder()
          .setCustomId(`q${i + 1}`)
          .setLabel(q.length > 45 ? q.substring(0, 42) + '...' : q)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000);
        
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      }
    }

    if (modal.components.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed('Hata', 'Sistemde ayarlı başvuru sorusu bulunamadı.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.showModal(modal);
  },
};
