import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type EmbedBuilder,
  type Guild,
  type GuildMember,
  type Interaction,
  type TextChannel,
} from 'discord.js';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { Colors, createEmbed, successEmbed } from '../utils/embeds.js';
import { safeDm } from '../utils/dm.js';
import { logger } from '../utils/logger.js';
import { hasTicketStaffRole } from '../utils/permissions.js';
import { buildTranscript } from './transcript.service.js';

export const TICKET_CATEGORIES = [
  { value: 'hile', label: 'Oyun İçi Hile Bildirimi', emoji: '🎮' },
  { value: 'magaza', label: 'Mağaza-VIP Sorunları', emoji: '🛒' },
  { value: 'sikayet', label: 'Yetkili Şikayeti', emoji: '🛡️' },
  { value: 'diger', label: 'Diğer', emoji: '❓' },
];

export const TICKET_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.value, c.label]),
);

export interface TicketActionResult {
  ok: boolean;
  message: string;
}

type TicketRecord = NonNullable<Awaited<ReturnType<typeof prisma.ticket.findUnique>>>;

async function getTicketChannel(guild: Guild, channelId: string): Promise<TextChannel | null> {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  return channel?.isTextBased() ? (channel as TextChannel) : null;
}

function buildActionRow(ticket: TicketRecord): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  const id = ticket.id;
  if (ticket.claimedBy) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`ticket_release:${id}`).setLabel('Devralmayı Bırak').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
    );
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId(`ticket_claim:${id}`).setLabel('Devral').setStyle(ButtonStyle.Primary).setEmoji('👤'),
    );
  }
  row.addComponents(
    new ButtonBuilder().setCustomId(`ticket_close:${id}`).setLabel('Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );
  return row;
}

function buildTicketEmbed(ticket: TicketRecord): EmbedBuilder {
  return createEmbed({
    title: `🎫 Ticket #${String(ticket.ticketNumber).padStart(4, '0')}`,
    description: [
      `**Kategori:** ${TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}`,
      `**Sahip:** <@${ticket.ownerId}>`,
      `**Oluşturulma:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`,
      ticket.claimedBy ? `**İlgilenen:** <@${ticket.claimedBy}>` : null,
    ].filter(Boolean)
      .join('\n'),
    color: Colors.BRAND,
    footerText: 'Destek',
  });
}

async function refreshPanel(guild: Guild, ticket: TicketRecord | null): Promise<void> {
  if (!ticket?.messageId) return;
  const channel = await getTicketChannel(guild, ticket.channelId);
  if (!channel) return;
  try {
    const message = await channel.messages.fetch(ticket.messageId);
    await message.edit({ embeds: [buildTicketEmbed(ticket)], components: [buildActionRow(ticket)] });
  } catch (error) {
    logger.warn('Ticket panel mesajı güncellenemedi.', error);
  }
}

export async function getOpenTicketForUser(userId: string) {
  return prisma.ticket.findFirst({ where: { ownerId: userId, status: 'open' } });
}

export async function logTicketEvent(guild: Guild, ticket: TicketRecord, action: string, details: string, color: import('discord.js').ColorResolvable) {
  if (!env.TICKET_LOG_CHANNEL_ID || !ticket) return;
  try {
    const logChannel = await guild.channels.fetch(env.TICKET_LOG_CHANNEL_ID).catch(() => null);
    if (logChannel?.isTextBased()) {
      await logChannel.send({
        embeds: [
          createEmbed({
            title: `🎫 Ticket #${String(ticket.ticketNumber).padStart(4, '0')} Log`,
            description: `**İşlem:** ${action}\n**Kategori:** ${TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}\n**Detay:** ${details}`,
            color: color,
            footerText: 'Ticket Log',
          }),
        ],
      });
    }
  } catch (error) {
    logger.warn(`Ticket log atılamadı: ${error}`);
  }
}

export async function getTicketByChannel(channelId: string) {
  return prisma.ticket.findUnique({ where: { channelId } });
}

export async function openTicket(interaction: Interaction, category: string): Promise<TicketActionResult> {
  const member = interaction.member as GuildMember;
  if (!member || !interaction.guild) return { ok: false, message: 'Bu işlem bir sunucu içinde yapılmalı.' };
  const guild = interaction.guild;

  const existing = await getOpenTicketForUser(member.id);
  if (existing) {
    return { ok: false, message: `Zaten açık bir ticket'ınız var: <#${existing.channelId}>` };
  }

  const categoryDef = TICKET_CATEGORIES.find((c) => c.value === category) ?? TICKET_CATEGORIES[3]!;
  if (!env.TICKET_CATEGORY_ID) {
    return { ok: false, message: 'Ticket kategorisi yapılandırılmamış — .env içinde `TICKET_CATEGORY_ID` doldurun.' };
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    let channel: TextChannel | null = null;
    try {
      const max = await prisma.ticket.aggregate({ _max: { ticketNumber: true } });
      const ticketNumber = (max._max.ticketNumber ?? 0) + 1;

      channel = await guild.channels.create({
        name: `ticket-${categoryDef.value}-${String(ticketNumber).padStart(4, '0')}`,
        parent: env.TICKET_CATEGORY_ID,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
          { id: env.GUILD_ID, deny: [PermissionFlagsBits.ViewChannel] },
          ...env.TICKET_STAFF_ROLE_IDS.map((roleId) => ({
            id: roleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          })),
        ],
        topic: `Ticket sahibi: ${member.user.tag} • Kategori: ${categoryDef.value}`,
      });

      const record = await prisma.ticket.create({
        data: { ticketNumber, channelId: channel.id, category: categoryDef.value, ownerId: member.id },
      });

      const panel = await channel.send({
        embeds: [buildTicketEmbed(record)],
        components: [buildActionRow(record)],
      });
      await prisma.ticket.update({ where: { id: record.id }, data: { messageId: panel.id } });

      await logTicketEvent(guild, record, 'Ticket Açıldı', `Oluşturan: <@${member.id}>`, Colors.SUCCESS);

      return { ok: true, message: `Ticket #${ticketNumber} açıldı — <#${channel.id}>` };
    } catch (error) {
      if (channel) {
        await channel.delete().catch(() => null);
        channel = null;
      }
      if (attempt === 3) {
        logger.error('Ticket oluşturulamadı:', error);
        return { ok: false, message: 'Ticket oluşturulamadı — lütfen tekrar deneyin.' };
      }
    }
  }

  return { ok: false, message: 'Ticket oluşturulamadı.' };
}

export async function claimTicket(guild: Guild, ticketId: number, actor: GuildMember): Promise<TicketActionResult> {
  if (!hasTicketStaffRole(actor)) return { ok: false, message: 'Ticket devralmak için yetkiniz yok.' };

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.status !== 'open') return { ok: false, message: 'Bu ticket aktif değil.' };
  if (ticket.claimedBy === actor.id) return { ok: false, message: 'Bu ticket zaten sizde.' };
  if (ticket.claimedBy) return { ok: false, message: `<@${ticket.claimedBy}> tarafından devralınmıştır.` };

  const updated = await prisma.ticket.updateMany({
    where: { id: ticketId, claimedBy: null, status: 'open' },
    data: { claimedBy: actor.id, claimedAt: new Date() },
  });
  if (updated.count === 0) return { ok: false, message: 'Bu ticket az önce başkası tarafından devralındı.' };

  const latest = await prisma.ticket.findUnique({ where: { id: ticketId } });
  await refreshPanel(guild, latest);

  const channel = await getTicketChannel(guild, ticket.channelId);
  if (channel) {
    await channel.send({
      embeds: [successEmbed('Ticket Devralındı', `${actor.user.username} bu ticket ile ilgileniyor.`)],
    });
  }

  await logTicketEvent(guild, latest!, 'Ticket Devralındı', `Devralan: <@${actor.id}>`, Colors.BRAND);

  return { ok: true, message: `Ticket #${ticket.ticketNumber} devralındı.` };
}

export async function releaseTicket(guild: Guild, ticketId: number, actor: GuildMember): Promise<TicketActionResult> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.status !== 'open') return { ok: false, message: 'Bu ticket aktif değil.' };
  if (ticket.claimedBy !== actor.id && !actor.permissions.has('Administrator')) {
    return { ok: false, message: 'Bu ticket yalnızca devralan yetkili bırakabilir.' };
  }

  const released = await prisma.ticket.updateMany({
    where: { id: ticketId, claimedBy: { not: null } },
    data: { claimedBy: null, claimedAt: null },
  });
  if (released.count === 0) return { ok: false, message: 'Bu ticket üzerinde devralma bulunmuyor.' };

  const latest = await prisma.ticket.findUnique({ where: { id: ticketId } });
  await refreshPanel(guild, latest);

  const channel = await getTicketChannel(guild, ticket.channelId);
  if (channel) {
    await channel.send({
      embeds: [createEmbed({ title: 'Devralma Bırakıldı', description: 'Bu ticket tekrar devralınabilir durumda.' })],
    });
  }

  await logTicketEvent(guild, latest!, 'Ticket Geri Bırakıldı', `Bırakan: <@${actor.id}>`, Colors.WARNING);

  return { ok: true, message: `Ticket #${ticket.ticketNumber} geri bırakıldı.` };
}

export async function closeTicket(
  guild: Guild,
  ticketId: number,
  actor: GuildMember,
  reason?: string | null,
): Promise<TicketActionResult> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.status !== 'open') return { ok: false, message: 'Bu ticket aktif değil.' };

  const isOwner = ticket.ownerId === actor.id;
  const isClaimer = ticket.claimedBy === actor.id;
  const isStaff = hasTicketStaffRole(actor);
  if (!isOwner && !isClaimer && !isStaff) {
    return { ok: false, message: "Bu ticket'ı kapatma yetkiniz yok." };
  }

  const channel = await getTicketChannel(guild, ticket.channelId);
  if (channel) {
    try {
      const transcriptBuffer = await buildTranscript(
        channel,
        ticket.ticketNumber,
        TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category,
        actor.user.username,
        actor.id
      );

      if (env.TICKET_LOG_CHANNEL_ID) {
        const logChannel = await guild.channels.fetch(env.TICKET_LOG_CHANNEL_ID).catch(() => null);
        if (logChannel?.isTextBased()) {
          await logChannel.send({
            embeds: [
              createEmbed({
                title: `🎫 Ticket #${ticket.ticketNumber} — Kapatıldı`,
                description: [
                  `**Kategori:** ${TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}`,
                  `**Sahip:** <@${ticket.ownerId}>`,
                  `**Kapatılma:** <@${actor.id}>`,
                  reason ? `**Sebep:** ${reason}` : null,
                ].filter(Boolean).join('\n'),
                color: Colors.SUCCESS,
                footerText: 'Transcript',
              }),
            ],
            files: [{ attachment: transcriptBuffer, name: `ticket-${String(ticket.ticketNumber).padStart(4, '0')}.txt` }],
          });
        }
      }

      const owner = await guild.client.users.fetch(ticket.ownerId).catch(() => null);
      if (owner) {
        const transcriptSent = await safeDm(owner, {
          embeds: [
            createEmbed({
              title: `🎫 Ticket #${ticket.ticketNumber} Kapatıldı`,
              description: [
                `Açtığınız **Ticket #${ticket.ticketNumber}** kapatıldı.`,
                `**Kategori:** ${TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}`,
                reason ? `**Kapanış sebebi:** ${reason}` : null,
                '',
                'Ticket geçmişiniz ekteki dosyada — isterseniz indirip saklayabilirsiniz.',
              ].filter(Boolean).join('\n'),
              color: Colors.BRAND,
              footerText: 'Destek',
            }),
          ],
          files: [{ attachment: transcriptBuffer, name: `ticket-${String(ticket.ticketNumber).padStart(4, '0')}.txt` }],
        });

        if (transcriptSent) {
          await sendRatingPrompt(guild.client, ticket);
        }
      }
    } catch (error) {
      logger.warn(`Ticket #${ticket.ticketNumber} için transcript gönderilemedi:`, error);
    }
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'closed', closedBy: actor.id, closeReason: reason ?? null, closedAt: new Date() },
  });

  if (channel) {
    await channel.delete('Ticket kapatıldı').catch(() => null);
  }
  return { ok: true, message: `Ticket #${ticket.ticketNumber} kapatıldı.` };
}

async function sendRatingPrompt(client: import('discord.js').Client, ticket: TicketRecord): Promise<void> {
  if (!ticket) return;
  const owner = await client.users.fetch(ticket.ownerId).catch(() => null);
  if (!owner) return;

  const select = new StringSelectMenuBuilder()
    .setCustomId(`ticket_rate:${ticket.id}`)
    .setPlaceholder('Puanınızı seçin...')
    .addOptions(
      { label: 'Mükemmel', value: '5', description: 'Sorunum çok hızlı ve harika bir şekilde çözüldü.', emoji: '🌟' },
      { label: 'İyi', value: '4', description: 'Memnun kaldım, teşekkürler.', emoji: '⭐' },
      { label: 'Ortalama', value: '3', description: 'Sorunum çözüldü fakat gecikmeler oldu.', emoji: '👍' },
      { label: 'Kötü', value: '2', description: 'İlgilenilmedi veya geç cevap verildi.', emoji: '👎' },
      { label: 'Çok Kötü', value: '1', description: 'Hiç yardımcı olunmadı.', emoji: '💩' }
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  await safeDm(owner, {
    embeds: [
      createEmbed({
        title: '⭐ Deneyiminizi Puanlayın',
        description: `Açtığınız **Ticket #${ticket.ticketNumber}** kapatıldı. Sunduğumuz destekten ne kadar memnun kaldınız? (1-5)`,
        color: Colors.BRAND,
        footerText: 'Destek',
      }),
    ],
    components: [row],
  });
}

export async function rateTicket(ticketId: number, rating: number, userId: string, client: import('discord.js').Client): Promise<TicketActionResult> {
  if (rating < 1 || rating > 5) return { ok: false, message: 'Puan 1 ile 5 arasında olmalı.' };

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, message: 'Bu ticket kaydı bulunamadı.' };
  if (ticket.ownerId !== userId) return { ok: false, message: 'Bu ticket yalnızca sahibi tarafından puanlanabilir.' };
  if (ticket.rating != null) return { ok: false, message: 'Bu ticket zaten puanlanmış.' };

  await prisma.ticket.update({ where: { id: ticket.id }, data: { rating } });

  const guild = client.guilds.cache.get(env.GUILD_ID);
  if (guild && env.TICKET_LOG_CHANNEL_ID) {
    try {
      const logChannel = await guild.channels.fetch(env.TICKET_LOG_CHANNEL_ID).catch(() => null);
      if (logChannel?.isTextBased()) {
        const claimerText = ticket.claimedBy ? `<@${ticket.claimedBy}> (${ticket.claimedBy})` : 'Bilinmiyor';

        await logChannel.send({
          embeds: [
            createEmbed({
              title: '⭐ Yetkili Değerlendirmesi',
              fields: [
                { name: '👨‍💻 Destek Yetkilisi', value: claimerText, inline: true },
                { name: '👤 Puanlayan Kullanıcı', value: `<@${userId}> (${userId})`, inline: true },
                { name: '📊 Verilen Puan', value: `${rating}/5\n${'⭐'.repeat(rating)}`, inline: false },
              ],
              color: Colors.WARNING,
              footerText: 'Ticket Log',
            })
          ]
        });
      }
    } catch (error) {
      logger.warn(`Ticket puanlama logu atılamadı: ${error}`);
    }
  }

  return { ok: true, message: `Puanınız kaydedildi — 5 üzerinden **${rating}**. Teşekkürler!` };
}

export async function getLeaderboard() {
  const tickets = await prisma.ticket.findMany({
    where: { status: 'closed', claimedBy: { not: null }, rating: { not: null } },
    select: { claimedBy: true, rating: true },
  });

  const perStaff = new Map<string, { count: number; total: number }>();
  for (const t of tickets) {
    const staffId = t.claimedBy!;
    const entry = perStaff.get(staffId) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += t.rating ?? 0;
    perStaff.set(staffId, entry);
  }

  return [...perStaff.entries()]
    .map(([userId, v]) => ({ userId, count: v.count, average: v.total / v.count }))
    .sort((a, b) => b.average - a.average || b.count - a.count);
}