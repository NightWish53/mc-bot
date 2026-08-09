import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';
import { hasModRole, requireModeratorMember } from '../../utils/permissions.js';
import { buildCaseEmbed, getCase } from '../../services/moderation.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('vaka')
    .setDescription('Vaka numarası ile bir moderasyon işleminin detayını gösterir')
    .addIntegerOption((option) => option.setName('numara').setRequired(true).setDescription('Sorgulanacak vaka numarası').setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const moderator = await requireModeratorMember(interaction);
    if (!moderator || !hasModRole(moderator)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu kullanmak için yetkiniz yok.')] });
      return;
    }

    const caseId = interaction.options.getInteger('numara', true);
    const modCase = await getCase(caseId);
    if (!modCase) {
      await interaction.editReply({ embeds: [errorEmbed('Vaka Bulunamadı', `\`#${caseId}\` numaralı vaka kayıtlarda yok.`)] });
      return;
    }

    await interaction.editReply({ embeds: [buildCaseEmbed(interaction.guild!, modCase)] });
  },
};