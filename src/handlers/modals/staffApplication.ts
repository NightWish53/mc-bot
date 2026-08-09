import { type ModalSubmitInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { Colors, createEmbed, successEmbed, errorEmbed } from '../../utils/embeds.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export default {
  customIdPrefix: 'staff_application',
  async run(interaction: ModalSubmitInteraction) {
    const questions = [
      env.STAFF_APP_QUESTION_1,
      env.STAFF_APP_QUESTION_2,
      env.STAFF_APP_QUESTION_3,
      env.STAFF_APP_QUESTION_4,
      env.STAFF_APP_QUESTION_5,
    ];

    const answersObj: Record<string, string> = {};
    const embedFields = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q && q.trim().length > 0) {
        try {
          const answer = interaction.fields.getTextInputValue(`q${i + 1}`);
          answersObj[q] = answer;
          embedFields.push({ name: q.length > 256 ? q.substring(0, 253) + '...' : q, value: answer, inline: false });
        } catch (e) {
          // Input might not exist if modal somehow changed
        }
      }
    }

    const answersJson = JSON.stringify(answersObj);

    await interaction.deferReply({ ephemeral: true });

    let channel: TextChannel | null = null;
    if (env.STAFF_APP_CHANNEL_ID) {
      try {
        const fetched = await interaction.guild?.channels.fetch(env.STAFF_APP_CHANNEL_ID);
        if (fetched instanceof TextChannel) {
          channel = fetched;
        }
      } catch (e) {
        logger.warn(`Başvuru kanalı bulunamadı: ${env.STAFF_APP_CHANNEL_ID}`);
      }
    }

    if (!channel) {
      await interaction.editReply({
        embeds: [errorEmbed('Hata', 'Başvuru sistemi şu anda devre dışı (kanal ayarlanmamış).')],
      });
      return;
    }

    try {
      const app = await prisma.staffApplication.create({
        data: {
          userId: interaction.user.id,
          answers: answersJson,
        },
      });

      embedFields.push({ name: 'Durum', value: '⏳ Bekliyor', inline: true });
      embedFields.push({ name: 'Başvuru ID', value: app.id.toString(), inline: true });

      const embed = createEmbed({
        title: '📝 Yeni Yetkili Başvurusu',
        description: `<@${interaction.user.id}> yetkili ekibine katılmak için başvurdu!`,
        color: Colors.BRAND,
        fields: embedFields,
        thumbnail: interaction.user.displayAvatarURL({ size: 256 }),
      });

      const acceptButton = new ButtonBuilder()
        .setCustomId(`staff_app_accept:${app.id}`)
        .setLabel('Kabul Et')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success);

      const rejectButton = new ButtonBuilder()
        .setCustomId(`staff_app_reject:${app.id}`)
        .setLabel('Reddet')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton, rejectButton);

      await channel.send({ embeds: [embed], components: [row] });

      await interaction.editReply({
        embeds: [successEmbed('Başvuru Gönderildi', 'Yetkili başvurunuz başarıyla alındı ve ekibimize iletildi. Teşekkür ederiz!')],
      });
    } catch (error) {
      logger.error('Başvuru kaydedilirken hata:', error);
      await interaction.editReply({
        embeds: [errorEmbed('Hata', 'Başvurunuz kaydedilirken bir hata oluştu.')],
      });
    }
  },
};
