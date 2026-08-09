import { SlashCommandBuilder, type ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { createEmbed, Colors } from '../../utils/embeds.js';
import { env } from '../../config/env.js';

export default {
  data: new SlashCommandBuilder()
    .setName('yardım')
    .setDescription('Botun tüm komutlarını ve kullanım detaylarını gösterir.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = createEmbed({
      title: '📚 Yardım Menüsü',
      description: `Aşağıdaki açılır menüyü (select menu) kullanarak **${env.SERVER_NAME}** sunucusundaki komut kategorilerini inceleyebilirsiniz.\n\nLütfen görmek istediğiniz komut grubunu seçin:`,
      color: Colors.BRAND,
    });

    const select = new StringSelectMenuBuilder()
      .setCustomId('helpMenu:select')
      .setPlaceholder('Bir kategori seçin...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Genel Komutlar (Kullanıcı)')
          .setDescription('Herkesin kullanabileceği temel komutlar.')
          .setEmoji('🌐')
          .setValue('genel'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Moderasyon (Yetkili)')
          .setDescription('Sunucu düzenini sağlamak için yetkili komutları.')
          .setEmoji('🛡️')
          .setValue('moderasyon'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Kurulum (Yönetici)')
          .setDescription('Sadece yöneticilerin erişebildiği kurulum ayarları.')
          .setEmoji('⚙️')
          .setValue('yonetici'),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

