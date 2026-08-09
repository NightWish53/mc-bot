import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { hasModRole, requireModeratorMember } from '../../utils/permissions.js';
import { actionUnban } from '../../services/moderation.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Yasaklı bir kullanıcının yasağını kaldırır')
    .addStringOption((option) =>
      option.setName('kullanici_id').setRequired(true).setDescription('Yasağı kaldırılacak kullanıcının Discord ID si (Sayılarla)'),
    )
    .addStringOption((option) => option.setName('sebep').setDescription('Yasağı kaldırma sebebi')),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const moderator = await requireModeratorMember(interaction);
    if (!moderator || !hasModRole(moderator)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu kullanmak için yetkiniz yok.')] });
      return;
    }

    const targetId = interaction.options.getString('kullanici_id', true).trim();
    if (!/^\d{15,20}$/.test(targetId)) {
      await interaction.editReply({ embeds: [errorEmbed('Geçersiz ID', 'Lütfen geçerli bir Discord kullanıcı ID si girin.')] });
      return;
    }

    const reason = interaction.options.getString('sebep') ?? undefined;
    const result = await actionUnban(interaction.guild!, moderator, targetId, reason);

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Yasak Kaldırma Başarısız', result.message)] });
      return;
    }
    await interaction.editReply({
      embeds: [
        successEmbed('Yasak Kaldırıldı', result.message, {
          fields: [{ name: 'Vaka Numarası', value: `#${result.caseId}`, inline: true }],
        }),
      ],
    });
  },
};
