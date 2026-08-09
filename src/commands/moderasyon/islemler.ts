import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, warningEmbed } from '../../utils/embeds.js';
import { hasModRole, requireModeratorMember } from '../../utils/permissions.js';
import { buildActionsEmbed, getModeratorActions } from '../../services/moderation.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('işlemler')
    .setDescription('Bir yetkilinin gerçekleştirdiği tüm moderasyon işlemlerini gösterir')
    .addUserOption((option) => option.setName('yetkili').setDescription('İşlemleri görüntülenecek yetkili').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const moderator = await requireModeratorMember(interaction);
    if (!moderator || !hasModRole(moderator)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu kullanmak için yetkiniz yok.')] });
      return;
    }

    const target = interaction.options.getUser('yetkili', true);
    const data = await getModeratorActions(target.id);

    if (data.cases.length === 0 && data.warnings.length === 0) {
      await interaction.editReply({
        embeds: [warningEmbed('İşlem Geçmişi Boş', `<@${target.id}> henüz hiçbir moderasyon işlemi gerçekleştirmemiş.`)],
      });
      return;
    }

    await interaction.editReply({ embeds: [buildActionsEmbed(target.id, data)] });
  },
};