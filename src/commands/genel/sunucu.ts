import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { env } from '../../config/env.js';
import { getCachedPing, pingServer } from '../../services/mcPing.service.js';
import { renderServerCard } from '../../services/serverCard.service.js';
import { createEmbed, warningEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sunucu')
    .setDescription('Minecraft sunucusunun güncel durumunu gösterir'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!env.MC_SERVER_IP) {
      await interaction.reply({
        embeds: [warningEmbed('Yapılandırma Eksik', 'Sunucu izleme için `MC_SERVER_IP` .env dosyasında tanımlanmamış.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    // Use cached ping data to respond instantly, if available. 
    // Fallback to pingServer() if cache is empty (bot just started).
    let { data, time } = getCachedPing();
    if (time === 0) {
      data = await pingServer();
      time = Date.now();
    }

    const card = await renderServerCard({ data, lastPingTime: time });

    const port = env.MC_SERVER_PORT === 25565 ? '' : `:${env.MC_SERVER_PORT}`;
    const address = `${env.MC_SERVER_IP}${port}`;

    const fields = [
      {
        name: '🎮 Bağlantı Adresi',
        value: `\`${address}\``,
        inline: true,
      }
    ];

    if (env.WEBSITE_URL) {
      const website = env.WEBSITE_URL.replace(/^https?:\/\//, '');
      fields.push({
        name: '🌐 Web Sitesi',
        value: `[${website}](${env.WEBSITE_URL})`,
        inline: true,
      });
    }

    const embed = createEmbed({
      title: data ? '🟢 Sunucu Çevrimiçi' : '🔴 Sunucu Çevrimdışı',
      description: data ? '\u200b' : `${address} adresindeki sunucuya ulaşılamadı.`,
      fields,
    });

    if (card) {
      embed.setImage('attachment://server-card.png');
      await interaction.editReply({ embeds: [embed], files: [{ attachment: card, name: 'server-card.png' }] });
    } else {
      await interaction.editReply({ embeds: [embed] });
    }
  },
};