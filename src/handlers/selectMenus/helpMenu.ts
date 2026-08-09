import type { SelectMenuHandler } from './index.js';
import { createEmbed, Colors } from '../../utils/embeds.js';
import { MessageFlags } from 'discord.js';

const handler: SelectMenuHandler = {
  customIdPrefix: 'helpMenu',
  async run(interaction) {
    const value = interaction.values[0];

    let embed;

    if (value === 'genel') {
      embed = createEmbed({
        title: '🌐 Genel Komutlar (Kullanıcı)',
        description: `Sunucudaki tüm üyelerin kullanabileceği komutlar:\n\n` +
          `</sunucu:0> - Minecraft sunucusunun anlık durumunu ve aktif oyuncuları gösterir.\n` +
          `</yardım:0> - Şu an görüntülediğiniz yardım menüsünü açar.\n\n` +
          `🎫 **Destek (Ticket) Komutları:**\n` +
          `</kapat:0> - Bulunduğunuz aktif destek talebini sonlandırır.\n` +
          `</yetkili-sıralama:0> - Yetkililerin ticket çözme ve puan sıralamasını gösterir.`,
        color: Colors.BRAND,
      });
    } else if (value === 'moderasyon') {
      embed = createEmbed({
        title: '🛡️ Moderasyon Komutları (Yetkili)',
        description: `Sadece yetkililerin kullanabileceği sunucu yönetim komutları:\n\n` +
          `</ban:0> - Kullanıcıyı sunucudan yasaklar.\n` +
          `</kick:0> - Kullanıcıyı sunucudan atar.\n` +
          `</mute:0> - Kullanıcıya zaman aşımı (timeout) uygular.\n` +
          `</unmute:0> - Kullanıcının zaman aşımını kaldırır.\n` +
          `</unban:0> - Kullanıcının yasağını kaldırır.\n` +
          `</warn:0> - Kullanıcıya uyarı verir.\n` +
          `</uyarılar:0> - Kullanıcının aktif uyarılarını listeler.\n` +
          `</vaka:0> - Belirli bir vaka numarasının detaylarını gösterir.\n` +
          `</geçmiş:0> - Kullanıcının tüm sicil geçmişini gösterir.\n` +
          `</işlemler:0> - Bir yetkilinin yaptığı tüm işlemleri listeler.\n\n` +
          `🎫 **Ticket Yönetimi:**\n` +
          `</ticket-ekle:0> - Destek talebine başka bir üyeyi dahil eder.\n` +
          `</ticket-cikar:0> - Destek talebinden bir üyeyi çıkarır.`,
        color: Colors.BRAND,
      });
    } else if (value === 'yonetici') {
      embed = createEmbed({
        title: '⚙️ Kurulum Komutları (Yönetici)',
        description: `Sunucu sahiplerinin ve üst düzey yöneticilerin (Admin) kullanabileceği komutlar:\n\n` +
          `</panel-oluştur:0> - Destek talebi açma butonunu seçtiğiniz kanala gönderir.\n` +
          `</başvuru-paneli:0> - Yetkili başvuru formunu bulunduğunuz kanala gönderir.`,
        color: Colors.BRAND,
      });
    } else {
      await interaction.reply({ content: 'Bilinmeyen seçenek.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.update({ embeds: [embed] });
  },
};

export default handler;
