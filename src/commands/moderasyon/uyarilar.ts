import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';
import { hasModRole, requireModeratorMember } from '../../utils/permissions.js';
import { buildWarningsEmbed } from '../../services/moderation.service.js';
import { prisma } from '../../database/prisma.js';

export default {
  data: new SlashCommandBuilder()
    .setName('uyarılar')
    .setDescription('Bir kullanıcının tüm uyarılarını listeler')
    .addUserOption((option) => option.setName('kullanıcı').setDescription('Uyarıları görüntülenecek kullanıcı').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const moderator = await requireModeratorMember(interaction);
    if (!moderator || !hasModRole(moderator)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu kullanmak için yetkiniz yok.')] });
      return;
    }

    const target = interaction.options.getUser('kullanıcı', true);
    const warnings = await prisma.warning.findMany({
      where: { userId: target.id },
      orderBy: { createdAt: 'desc' },
    });

    await interaction.editReply({ embeds: [buildWarningsEmbed(target.id, warnings)] });
  },
};