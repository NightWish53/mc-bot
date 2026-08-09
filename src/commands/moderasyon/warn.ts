import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { hasModRole, requireModeratorMember } from '../../utils/permissions.js';
import { actionWarn } from '../../services/moderation.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Bir kullanıcıya uyarı verir')
    .addUserOption((option) => option.setName('kullanıcı').setDescription('Uyarılacak kullanıcı').setRequired(true))
    .addStringOption((option) => option.setName('sebep').setDescription('Uyarı sebebi').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const moderator = await requireModeratorMember(interaction);
    if (!moderator || !hasModRole(moderator)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu kullanmak için yetkiniz yok.')] });
      return;
    }

    const target = interaction.options.getUser('kullanıcı', true);
    const reason = interaction.options.getString('sebep', true);

    const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      await interaction.editReply({ embeds: [errorEmbed('Uyarı Başarısız', 'Kullanıcı sunucuda değil.')] });
      return;
    }

    const result = await actionWarn(interaction.guild!, moderator, targetMember, reason);
    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Uyarı Başarısız', result.message)] });
      return;
    }
    await interaction.editReply({
      embeds: [
        successEmbed('Uyarı Verildi', result.message, {
          fields: [{ name: 'Vaka Numarası', value: `#${result.caseId}`, inline: true }],
        }),
      ],
    });
  },
};
