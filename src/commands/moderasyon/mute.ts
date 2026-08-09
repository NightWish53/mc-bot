import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { hasMutePermission, requireModeratorMember } from '../../utils/permissions.js';
import { actionMute, parseDurationMs, formatMinutes } from '../../services/moderation.service.js';

export default {
data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Bir kullanıcıyı geçal olarak susturur')
    .addUserOption((option) => option.setName('kullanıcı').setDescription('Susturulacak kullanıcı').setRequired(true))
    .addStringOption((option) =>
      option.setName('sure').setRequired(true).setDescription('Süre — örn: 30m, 2h, 1g, 1g 2h').setMinLength(2).setMaxLength(16),
    )
    .addStringOption((option) => option.setName('sebep').setDescription('Susturma sebebi').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const moderator = await requireModeratorMember(interaction);
    if (!moderator || !hasMutePermission(moderator)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu kullanmak için yetkiniz yok.')] });
      return;
    }

    const target = interaction.options.getUser('kullanıcı', true);
    const durationInput = interaction.options.getString('sure', true);
    const reason = interaction.options.getString('sebep', true);

    const durationMs = parseDurationMs(durationInput);
    if (durationMs === null) {
      await interaction.editReply({
        embeds: [errorEmbed('Süre Geçersiz', 'Süre formatı tanınmadı. Örnekler: `30m`, `2h`, `1g`, `1g 2sa`')],
      });
      return;
    }

    const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      await interaction.editReply({ embeds: [errorEmbed('Susturma Başarısız', 'Kullanıcı sunucuda değil.')] });
      return;
    }

    const durationMin = Math.round(durationMs / 60_000);
    const result = await actionMute(interaction.guild!, moderator, targetMember, durationMin, reason);

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Susturma Başarısız', result.message)] });
      return;
    }
    await interaction.editReply({
      embeds: [
        successEmbed('Susturma Uygulandı', result.message, {
          fields: [
            { name: 'Süre', value: formatMinutes(durationMin), inline: true },
            { name: 'Vaka Numarası', value: `#${result.caseId}`, inline: true },
          ],
        }),
      ],
    });
  },
};
