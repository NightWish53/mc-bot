import { SlashCommandBuilder, type ChatInputCommandInteraction, TextChannel, GuildMember } from 'discord.js';
import { Colors, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { prisma } from '../../database/prisma.js';
import { hasTicketStaffRole } from '../../utils/permissions.js';
import { logTicketEvent } from '../../services/ticket.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket-çıkar')
    .setDescription('Destek talebinden bir kullanıcıyı çıkarır.')
    .addUserOption((option) =>
      option.setName('kullanıcı').setDescription("Ticket'tan çıkarılacak kullanıcı").setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('kullanıcı', true);
    const channel = interaction.channel;

    if (!channel || !(channel instanceof TextChannel)) {
      await interaction.reply({ embeds: [errorEmbed('Hata', 'Bu komut sadece metin kanallarında kullanılabilir.')], ephemeral: true });
      return;
    }

    const ticket = await prisma.ticket.findUnique({ where: { channelId: channel.id } });
    if (!ticket || ticket.status !== 'open') {
      await interaction.reply({ embeds: [errorEmbed('Geçersiz İşlem', 'Bu komut sadece aktif destek taleplerinde kullanılabilir.')], ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    const isOwner = ticket.ownerId === member.id;
    const isClaimer = ticket.claimedBy === member.id;
    const isStaff = hasTicketStaffRole(member);

    if (!isOwner && !isClaimer && !isStaff) {
      await interaction.reply({ embeds: [errorEmbed('Yetki Yok', "Bu ticket'tan kullanıcı çıkarma yetkiniz yok.")], ephemeral: true });
      return;
    }

    if (targetUser.id === ticket.ownerId) {
      await interaction.reply({ embeds: [errorEmbed('Geçersiz İşlem', 'Ticket sahibini kanaldan çıkaramazsınız.')], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      await channel.permissionOverwrites.delete(targetUser.id);

      await interaction.editReply({
        embeds: [successEmbed('Kullanıcı Çıkarıldı', `<@${targetUser.id}> adlı kullanıcının bu talebe erişimi kesildi.`)],
      });

      await logTicketEvent(interaction.guild!, ticket, 'Kullanıcı Çıkarıldı', `<@${targetUser.id}> ticket'tan çıkarıldı. İşlemi Yapan: <@${interaction.user.id}>`, Colors.BRAND);
    } catch {
      await interaction.editReply({
        embeds: [errorEmbed('Hata', 'Kullanıcı çıkarılırken bir sorun oluştu. Botun yetkilerini kontrol edin.')],
      });
    }
  },
};
