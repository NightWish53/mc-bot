import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ChannelType, type ChatInputCommandInteraction } from 'discord.js';
import { env } from '../../config/env.js';
import { errorEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';
import { isAdmin } from '../../utils/permissions.js';
import { requireModeratorMember } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('panel-oluştur')
    .setDescription('Ticket panelini belirtilen kanala kurar')
    .addChannelOption((option) =>
      option.setName('kanal').setDescription('Panelin yerleştirileceği kanal').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const member = await requireModeratorMember(interaction);
    if (!member || !isAdmin(member)) {
      await interaction.editReply({ embeds: [errorEmbed('Yetki Hatası', 'Bu komutu yalnızca adminler kullanabilir.')] });
      return;
    }

    const channelId = interaction.options.getChannel('kanal', true).id;
    const channel = await interaction.guild!.channels.fetch(channelId).catch(() => null);
    
    if (!channel || !channel.isTextBased()) {
      await interaction.editReply({ embeds: [errorEmbed('Geçersiz Kanal', 'Lütfen geçerli bir metin kanalı seçin.')] });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('ticket_create').setLabel('Ticket Oluştur').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
    );

    const embed = warningEmbed('🎫 Destek Merkezi', [
      `Merhaba değerli **${env.SERVER_NAME}** oyuncusu!`,
      '',
      'Sunucumuzda yaşadığın herhangi bir sorun, hile bildirimi veya merak ettiğin bir konu için buradan destek talebi oluşturabilirsin.',
      '',
      '**Destek Kategorilerimiz:**',
      '🎮 **Oyun İçi Hile Bildirimi**',
      '🛒 **Mağaza ve VIP İşlemleri**',
      '🛡️ **Yetkili Şikayeti**',
      '❓ **Diğer Konular**',
      '',
      '*Lütfen destek talebi açarken sorununuzu en detaylı şekilde açıklamaya özen gösterin.*',
    ].join('\n'));

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ embeds: [successEmbed('Panel Kuruldu', `<#${channel.id}> kanalına ticket paneli gönderildi.`)] });
  },
};