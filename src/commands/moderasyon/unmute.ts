import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { hasMutePermission, requireModeratorMember } from '../../utils/permissions.js';
import { actionUnmute } from '../../services/moderation.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Susturmayı kaldırır')
    .addUserOption((option) => option.setName('kullanıcı').setDescription('Susturması kaldırılacak kullanıcı').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const moderator = await requireModeratorMember(interaction);
    if (!moderator || !hasMutePermission(moderator)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu kullanmak için yetkiniz yok.')] });
      return;
    }

    const target = interaction.options.getUser('kullanıcı', true);
    const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      await interaction.editReply({ embeds: [errorEmbed('İşlem Başarısız', 'Kullanıcı sunucuda değil.')] });
      return;
    }

    const result = await actionUnmute(interaction.guild!, moderator, targetMember);
    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Susturma Kaldırma Başarısız', result.message)] });
      return;
    }
    await interaction.editReply({
      embeds: [
        successEmbed('Susturma Kaldırıldı', result.message, {
          fields: [{ name: 'Vaka Numarası', value: `#${result.caseId}`, inline: true }],
        }),
      ],
    });
  },
};
