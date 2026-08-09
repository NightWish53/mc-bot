import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, warningEmbed } from '../../utils/embeds.js';
import { hasModRole, requireModeratorMember } from '../../utils/permissions.js';
import { buildHistoryEmbed, getUserHistory } from '../../services/moderation.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('geçmiş')
    .setDescription('Bir kullanıcının tüm cezasını gösterir')
    .addUserOption((option) => option.setName('kullanıcı').setDescription('Geçmişi görüntülenecek kullanıcı').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const moderator = await requireModeratorMember(interaction);
    if (!moderator || !hasModRole(moderator)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu kullanmak için yetkiniz yok.')] });
      return;
    }

    const target = interaction.options.getUser('kullanıcı', true);
    const data = await getUserHistory(target.id);
    const embed = buildHistoryEmbed(target.id, data);

    if (data.cases.length === 0 && data.warnings.length === 0) {
      await interaction.editReply({
        embeds: [warningEmbed('Ceza Geçmişi Boş', `<@${target.id}> kullanıcısının hiç ceza kaydı yok.`)],
      });
      return;
    }

    await interaction.editReply({ embeds: [embed] });
  },
};