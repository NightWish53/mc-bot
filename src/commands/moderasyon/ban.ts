import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { hasModRole, requireModeratorMember } from '../../utils/permissions.js';
import { actionBan } from '../../services/moderation.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bir kullanıcıyı sunucudan yasaklar')
    .addUserOption((opt) => opt.setName('kullanıcı').setDescription('Yasaklanacak kullanıcı').setRequired(true))
    .addStringOption((opt) => opt.setName('sebep').setDescription('Yasaklama sebebi').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const moderator = await requireModeratorMember(interaction);
    if (!moderator || !hasModRole(moderator)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu kullanmak için yetkiniz yok.')] });
      return;
    }

    const target = interaction.options.getUser('kullanıcı', true);
    const reason = interaction.options.getString('sebep', true);
    const result = await actionBan(interaction.guild!, moderator, target, reason);

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Yasaklama Başarısız', result.message)] });
      return;
    }
    await interaction.editReply({
      embeds: [
        successEmbed('Yasaklama Uygulandı', result.message, {
          fields: [{ name: 'Vaka Numarası', value: `#${result.caseId}`, inline: true }],
        }),
      ],
    });
  },
};
