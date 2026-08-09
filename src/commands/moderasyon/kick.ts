import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { hasModRole, requireModeratorMember } from '../../utils/permissions.js';
import { actionKick } from '../../services/moderation.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Bir kullanıcıyı sunucudan atar')
    .addUserOption((option) => option.setName('kullanıcı').setDescription('Atılacak kullanıcı').setRequired(true))
    .addStringOption((option) => option.setName('sebep').setDescription('Atma sebebi').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const moderator = await requireModeratorMember(interaction);
    if (!moderator || !hasModRole(moderator)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu kullanmak için yetkiniz yok.')] });
      return;
    }

    const target = interaction.options.getUser('kullanıcı', true);
    const reason = interaction.options.getString('sebep', true);
    const result = await actionKick(interaction.guild!, moderator, target, reason);

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Atma Başarısız', result.message)] });
      return;
    }
    await interaction.editReply({
      embeds: [
        successEmbed('Atma Uygulandı', result.message, {
          fields: [{ name: 'Vaka Numarası', value: `#${result.caseId}`, inline: true }],
        }),
      ],
    });
  },
};
