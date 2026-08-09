import { SlashCommandBuilder, type ChatInputCommandInteraction, TextChannel, GuildMember } from 'discord.js';
import { Colors, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { prisma } from '../../database/prisma.js';
import { hasTicketStaffRole } from '../../utils/permissions.js';
import { logTicketEvent } from '../../services/ticket.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket-ekle')
    .setDescription('Destek talebine başka bir kullanıcıyı dahil eder.')
    .addUserOption((option) =>
      option.setName('kullanıcı').setDescription("Ticket'a eklenecek kullanıcı").setRequired(true),
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
      await interaction.reply({ embeds: [errorEmbed('Yetki Yok', "Bu ticket'a kullanıcı ekleme yetkiniz yok.")], ephemeral: true });
      return;
    }

    if (targetUser.id === ticket.ownerId) {
      await interaction.reply({ embeds: [errorEmbed('Geçersiz Kullanıcı', 'Ticket sahibi zaten bu kanalda.')], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      await channel.permissionOverwrites.create(targetUser.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      await interaction.editReply({
        embeds: [successEmbed('Kullanıcı Eklendi', `<@${targetUser.id}> adlı kullanıcı başarıyla bu talebe dahil edildi.`)],
      });

      await logTicketEvent(interaction.guild!, ticket, 'Kullanıcı Eklendi', `<@${targetUser.id}> ticket'a dahil edildi. İşlemi Yapan: <@${interaction.user.id}>`, Colors.BRAND);
    } catch {
      await interaction.editReply({
        embeds: [errorEmbed('Hata', 'Kullanıcı eklenirken bir sorun oluştu. Botun yetkilerini kontrol edin.')],
      });
    }
  },
};
