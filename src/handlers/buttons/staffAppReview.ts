import { type ButtonInteraction, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { Colors, createEmbed, successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { safeDm } from '../../utils/dm.js';
import { env } from '../../config/env.js';

async function handleStaffAppReview(interaction: ButtonInteraction, action: 'accept' | 'reject', appIdStr: string) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      embeds: [errorEmbed('Yetki Yok', 'Başvuruları yalnızca yöneticiler değerlendirebilir.')],
      ephemeral: true,
    });
    return;
  }

  const appId = parseInt(appIdStr, 10);
  if (isNaN(appId)) {
    await interaction.reply({ embeds: [errorEmbed('Hata', 'Geçersiz başvuru ID.')], ephemeral: true });
    return;
  }

  const application = await prisma.staffApplication.findUnique({ where: { id: appId } });

  if (!application) {
    await interaction.reply({ embeds: [errorEmbed('Bulunamadı', 'Bu başvuru veritabanında bulunamadı.')], ephemeral: true });
    return;
  }

  if (application.status !== 'pending') {
    await interaction.reply({ embeds: [errorEmbed('Zaten Değerlendirildi', 'Bu başvuru zaten değerlendirilmiş.')], ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  const isAccepted = action === 'accept';
  const newStatus = isAccepted ? 'accepted' : 'rejected';

  try {
    await prisma.staffApplication.update({
      where: { id: appId },
      data: {
        status: newStatus,
        reviewedBy: interaction.user.id,
      },
    });

    const oldEmbed = interaction.message.embeds[0];
    if (!oldEmbed) return;

    const newFields = oldEmbed.fields.map((f) => {
      if (f.name === 'Durum') {
        return { name: 'Durum', value: isAccepted ? '✅ Kabul Edildi' : '❌ Reddedildi', inline: true };
      }
      return f;
    });

    newFields.push({ name: 'Değerlendiren', value: `<@${interaction.user.id}>`, inline: true });

    const updatedEmbed = createEmbed({
      title: isAccepted ? '✅ Başvuru Kabul Edildi' : '❌ Başvuru Reddedildi',
      description: oldEmbed.description || '',
      color: isAccepted ? Colors.SUCCESS : Colors.ERROR,
      fields: newFields,
      thumbnail: oldEmbed.thumbnail?.url,
    });

    await interaction.message.edit({
      embeds: [updatedEmbed],
      components: [],
    });

    const dmEmbed = createEmbed({
      title: isAccepted ? 'Tebrikler! 🎉' : 'Başvurunuz Reddedildi',
      description: isAccepted
        ? `**${env.SERVER_NAME}** sunucusuna yaptığınız yetkili başvurusu **kabul edildi**! Ekibimize hoş geldiniz, yetkililer en kısa sürede sizinle iletişime geçecektir.`
        : `**${env.SERVER_NAME}** sunucusuna yaptığınız yetkili başvurusu maalesef reddedildi. İlginiz için teşekkür ederiz.`,
      color: isAccepted ? Colors.SUCCESS : Colors.ERROR,
    });
    try {
      const user = await interaction.client.users.fetch(application.userId);
      await safeDm(user, { embeds: [dmEmbed] });
    } catch (dmError) {
      logger.warn(`Başvuru DM'i gönderilemedi (${application.userId}): ${dmError}`);
    }

  } catch (error) {
    logger.error(`Başvuru (${appId}) güncellenirken hata:`, error);
  }
}

export default [
  {
    customIdPrefix: 'staff_app_accept',
    async run(interaction: ButtonInteraction) {
      const appId = interaction.customId.split(':')[1];
      if (appId) await handleStaffAppReview(interaction, 'accept', appId);
    },
  },
  {
    customIdPrefix: 'staff_app_reject',
    async run(interaction: ButtonInteraction) {
      const appId = interaction.customId.split(':')[1];
      if (appId) await handleStaffAppReview(interaction, 'reject', appId);
    },
  },
];
