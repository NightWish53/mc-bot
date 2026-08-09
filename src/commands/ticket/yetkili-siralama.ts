import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getLeaderboard } from '../../services/ticket.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('yetkili-sıralama')
    .setDescription('Destek yetkililerinin puan ve çözüm sıralamasını gösterir')
    .addUserOption((option) =>
      option
        .setName('yetkili')
        .setDescription('Özel olarak istatistiklerini görmek istediğiniz yetkili (İsteğe bağlı)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('yetkili');

    const board = await getLeaderboard();
    
    if (targetUser) {
      const userIndex = board.findIndex((entry) => entry.userId === targetUser.id);
      if (userIndex === -1) {
        await interaction.editReply({
          embeds: [
            createEmbed({
              title: '🔍 Yetkili İstatistikleri',
              description: `<@${targetUser.id}> adlı kullanıcının henüz puanlanmış bir destek talebi bulunmuyor.`,
            }),
          ],
        });
        return;
      }

      const entry = board[userIndex]!;
      await interaction.editReply({
        embeds: [
          createEmbed({
            title: '🔍 Yetkili İstatistikleri',
            description: `Aşağıda <@${targetUser.id}> adlı yetkilinin destek performans detayları yer almaktadır.\n\n🏆 **Genel Sıralama:** ${userIndex + 1}.\n⭐ **Ortalama Puan:** ${entry.average.toFixed(2)} / 5.00\n📝 **Çözülen Ticket:** ${entry.count} adet`,
          }),
        ],
      });
      return;
    }

    if (board.length === 0) {
      await interaction.editReply({
        embeds: [
          createEmbed({
            title: '🏆 Destek Ekibi Liderlik Tablosu',
            description: 'Henüz puanlanmış destek talebi yok — ilk değerlendirmeyi heyecanla bekliyoruz! 🌟',
          }),
        ],
      });
      return;
    }

    const top = board.slice(0, 10);
    const medals = ['🥇', '🥈', '🥉'];
    
    const lines = top.map((entry, index) => {
      const rank = medals[index] ?? `🏅 **${index + 1}.**`;
      return `${rank} <@${entry.userId}>\n└ ⭐ **${entry.average.toFixed(2)}** Ortalama Puan (*${entry.count} Ticket Çözüldü*)\n`;
    });

    await interaction.editReply({
      embeds: [
        createEmbed({
          title: '🏆 Destek Ekibi Liderlik Tablosu',
          description: `Aşağıda, sunucumuzda en çok ticket çözen ve oyunculardan en yüksek değerlendirmeyi alan yetkililerimiz listelenmektedir.\n\n${lines.join('\n')}`,
        }),
      ],
    });
  },
};