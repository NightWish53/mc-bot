import { SlashCommandBuilder, type ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Colors, createEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('başvuru-paneli')
    .setDescription('Sunucu yetkili başvuru formunu bulunduğunuz kanala gönderir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        embeds: [errorEmbed('Yetki Yok', 'Bu komutu sadece yöneticiler kullanabilir.')],
        ephemeral: true,
      });
      return;
    }

    const embed = createEmbed({
      title: '🛡️ Yetkili Başvurusu',
      description: 'Sunucumuzun yetkili ekibine katılmak ister misiniz?\n\nAşağıdaki butona tıklayarak başvuru formunu doldurabilirsiniz. Başvurunuz yetkili ekibimiz tarafından titizlikle incelenecek ve size en kısa sürede dönüş sağlanacaktır. Başarılar dileriz! ✨',
      color: Colors.BRAND,
      thumbnail: interaction.guild?.iconURL() ?? undefined,
    });

    const button = new ButtonBuilder()
      .setCustomId('staff_app_start')
      .setLabel('Başvuru Yap')
      .setEmoji('📝')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    const channel = interaction.channel as TextChannel;
    if (channel && channel.isTextBased() && 'send' in channel) {
      await channel.send({ embeds: [embed], components: [row] });
    }

    await interaction.reply({
      content: 'Başvuru paneli başarıyla oluşturuldu.',
      ephemeral: true,
    });
  },
};
