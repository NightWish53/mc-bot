import type { EmbedBuilder, Guild, GuildMember, User } from 'discord.js';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { Colors, createEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export const TYPE_LABELS: Record<string, string> = {
  ban: 'Yasaklama',
  kick: 'Atma',
  mute: 'Susturma',
  unmute: 'Susturma Kaldırma',
  unban: 'Yasak Kaldırma',
  warn: 'Uyarı',
};

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

export interface ActionResult {
  ok: boolean;
  message: string;
  caseId?: number;
}

export function parseDurationMs(input: string): number | null {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!/^(\d+(\.\d+)?\s*(g|d|h|m|s)\s*)+$/.test(normalized)) return null;

  const parts = normalized.match(/\d+(\.\d+)?\s*(g|d|h|m|s)/g) ?? [];
  let totalMs = 0;
  for (const part of parts) {
    const match = /^(\d+(?:\.\d+)?)\s*(g|d|h|m|s)$/.exec(part);
    if (!match) return null;
    const value = Number(match[1]);
    const unit = match[2] as 'g' | 'd' | 'h' | 'm' | 's';
    const ms =
      unit === 's' ? value * 1000 : unit === 'm' ? value * 60_000 : unit === 'h' ? value * 3_600_000 : value * 86_400_000;
    totalMs += ms;
  }
  if (totalMs <= 0 || totalMs > MAX_TIMEOUT_MS) return null;
  return totalMs;
}

export function formatMinutes(totalMin: number): string {
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} gün`);
  if (hours > 0) parts.push(`${hours} saat`);
  if (minutes > 0) parts.push(`${minutes} dk`);
  return parts.length > 0 ? parts.join(' ') : `${totalMin} dk`;
}

async function resolveUserName(guild: Guild, userId: string): Promise<string> {
  try {
    const member = await guild.members.fetch(userId);
    return member.user.tag;
  } catch {
    try {
      const user = await guild.client.users.fetch(userId);
      return user.tag;
    } catch {
      return `\`${userId}\``;
    }
  }
}

async function logModAction(
  guild: Guild,
  params: { caseId: number; type: string; targetId: string; moderatorId: string; reason?: string; durationMin?: number },
): Promise<void> {
  if (!env.MOD_LOG_CHANNEL_ID) return;
  try {
    const channel = await guild.channels.fetch(env.MOD_LOG_CHANNEL_ID);
    if (!channel?.isTextBased()) return;

    const targetName = await resolveUserName(guild, params.targetId);
    const modName = await resolveUserName(guild, params.moderatorId);

    const fields = [
      { name: 'Kullanıcı', value: `<@${params.targetId}> (${targetName})`, inline: true },
      { name: 'Yetkili', value: `<@${params.moderatorId}> (${modName})`, inline: true },
      { name: 'Sebep', value: params.reason?.slice(0, 1024) || 'Belirtilmedi', inline: false },
    ];
    if (params.durationMin) {
      fields.splice(2, 0, { name: 'Süre', value: formatMinutes(params.durationMin), inline: true });
    }

    const color =
      params.type === 'unmute' || params.type === 'unban'
        ? Colors.SUCCESS
        : params.type === 'warn' || params.type === 'mute'
          ? Colors.WARNING
          : Colors.ERROR;

    await channel.send({
      embeds: [
        createEmbed({
          title: `Vaka #${params.caseId} — ${TYPE_LABELS[params.type] ?? params.type}`,
          color,
          fields,
          footerText: 'Moderasyon Günlüğü',
        }),
      ],
    });
  } catch (error) {
    logger.warn('Mod-log mesajı gönderilemedi.', error);
  }
}

async function createCase(params: {
  guild: Guild;
  type: string;
  targetId: string;
  moderatorId: string;
  reason?: string;
  durationMin?: number;
}): Promise<number> {
  const modCase = await prisma.modCase.create({
    data: {
      type: params.type,
      targetId: params.targetId,
      moderatorId: params.moderatorId,
      reason: params.reason,
      durationMin: params.durationMin,
    },
  });
  await logModAction(params.guild, { ...params, caseId: modCase.id });
  return modCase.id;
}

function guardAgainst(
  moderator: GuildMember,
  targetMember: GuildMember | null,
  target: User,
): string | null {
  if (target.id === moderator.id) return 'Kendinize moderasyon işlemi uygulayamazsınız.';
  if (!targetMember) return null;
  if (targetMember.permissions.has('Administrator')) return 'Bu üye sunucu yöneticisi — işlem uygulanamadı.';
  if (!moderator.permissions.has('Administrator') && targetMember.roles.highest.position >= moderator.roles.highest.position) {
    return 'Hedef üyenin rolü sizden yüksek veya aynı düzeyde — işlem uygulanamadı.';
  }
  return null;
}

export async function actionBan(guild: Guild, moderator: GuildMember, target: User, reason: string): Promise<ActionResult> {
  const targetMember = await guild.members.fetch(target.id).catch(() => null);
  const guard = guardAgainst(moderator, targetMember, target);
  if (guard) return { ok: false, message: guard };

  await guild.members.ban(target.id, { reason: reason.slice(0, 512) });
  const caseId = await createCase({
    guild,
    type: 'ban',
    targetId: target.id,
    moderatorId: moderator.id,
    reason,
  });
  return { ok: true, message: `\`${target.tag}\` kullanıcısı yasaklandı.`, caseId };
}

export async function actionKick(guild: Guild, moderator: GuildMember, target: User, reason: string): Promise<ActionResult> {
  const targetMember = await guild.members.fetch(target.id).catch(() => null);
  if (!targetMember) return { ok: false, message: 'Kullanıcı sunucuda değil.' };
  const guard = guardAgainst(moderator, targetMember, target);
  if (guard) return { ok: false, message: guard };

  await targetMember.kick(reason.slice(0, 512));
  const caseId = await createCase({ guild, type: 'kick', targetId: target.id, moderatorId: moderator.id, reason });
  return { ok: true, message: `\`${target.tag}\` kullanıcısı atıldı.`, caseId };
}

export async function actionMute(guild: Guild, moderator: GuildMember, target: GuildMember, durationMin: number, reason: string): Promise<ActionResult> {
  const guard = guardAgainst(moderator, target, target.user);
  if (guard) return { ok: false, message: guard };

  const durationMs = durationMin * 60_000;
  if (durationMs > MAX_TIMEOUT_MS) return { ok: false, message: 'Susturmalar en fazla 28 gün olabilir.' };

  await target.timeout(durationMs, reason.slice(0, 512));
  const caseId = await createCase({
    guild,
    type: 'mute',
    targetId: target.id,
    moderatorId: moderator.id,
    reason,
    durationMin,
  });
  return { ok: true, message: `\`${target.user.tag}\` ${formatMinutes(durationMin)} süreyle susturuldu.`, caseId };
}

export async function actionUnmute(guild: Guild, moderator: GuildMember, target: GuildMember): Promise<ActionResult> {
  const guard = guardAgainst(moderator, target, target.user);
  if (guard) return { ok: false, message: guard };
  if (!target.communicationDisabledUntil) return { ok: false, message: 'Bu üyenin aktif bir susturması yok.' };

  await target.timeout(null);
  const caseId = await createCase({ guild, type: 'unmute', targetId: target.id, moderatorId: moderator.id });
  return { ok: true, message: `\`${target.user.tag}\` için susturma kaldırıldı.`, caseId };
}

export async function actionUnban(guild: Guild, moderator: GuildMember, targetId: string, reason?: string): Promise<ActionResult> {
  try {
    await guild.bans.fetch(targetId);
  } catch {
    return { ok: false, message: 'Bu kullanıcının aktif bir yasağı yok.' };
  }
  await guild.bans.remove(targetId, reason);
  const caseId = await createCase({
    guild,
    type: 'unban',
    targetId,
    moderatorId: moderator.id,
    reason: reason || 'Belirtilmedi',
  });
  return { ok: true, message: `<@${targetId}> kullanıcısının yasağı kaldırıldı.`, caseId };
}

export async function actionWarn(guild: Guild, moderator: GuildMember, target: GuildMember, reason: string): Promise<ActionResult> {
  const guard = guardAgainst(moderator, target, target.user);
  if (guard) return { ok: false, message: guard };

  await prisma.warning.create({ data: { userId: target.id, moderatorId: moderator.id, reason } });
  const caseId = await createCase({ guild, type: 'warn', targetId: target.id, moderatorId: moderator.id, reason });

  if (env.WARN_LIMIT_MUTE > 0) {
    const activeCount = await prisma.warning.count({ where: { userId: target.id, active: true } });
    if (activeCount >= env.WARN_LIMIT_MUTE) {
      await target.timeout(86_400_000, `Uyarı limiti aşıldı (${activeCount}/${env.WARN_LIMIT_MUTE}) — otomatik susturma`);
      const reason = `Otomatik susturma: uyarı limiti aşıldı (${activeCount}/${env.WARN_LIMIT_MUTE})`;
      await createCase({ guild, type: 'mute', targetId: target.id, moderatorId: moderator.id, reason, durationMin: 1440 });
      return {
        ok: true,
        message: `Uyarı kaydedildi; ayrıca uyarı limiti (${env.WARN_LIMIT_MUTE}) aşıldığı için 1 günlük otomatik susturma uygulandı.`,
        caseId,
      };
    }
  }
  return { ok: true, message: 'Uyarı kaydedildi.', caseId };
}

export async function getCase(caseId: number) {
  return prisma.modCase.findUnique({ where: { id: caseId } });
}

export async function getUserHistory(userId: string) {
  const [cases, warnings] = await prisma.$transaction([
    prisma.modCase.findMany({ where: { targetId: userId }, orderBy: { createdAt: 'desc' } }),
    prisma.warning.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);
  return { cases, warnings };
}

export async function getModeratorActions(moderatorId: string) {
  const [cases, warnings] = await prisma.$transaction([
    prisma.modCase.findMany({ where: { moderatorId }, orderBy: { createdAt: 'desc' } }),
    prisma.warning.findMany({ where: { moderatorId }, orderBy: { createdAt: 'desc' } }),
  ]);
  return { cases, warnings };
}

export function buildCaseEmbed(guild: Guild, modCase: { id: number; type: string; targetId: string; moderatorId: string; reason: string | null; durationMin: number | null; createdAt: Date }): EmbedBuilder {
  const color =
    modCase.type === 'unmute' || modCase.type === 'unban'
      ? Colors.SUCCESS
      : modCase.type === 'warn' || modCase.type === 'mute'
        ? Colors.WARNING
        : Colors.ERROR;

  const fields = [
    { name: 'Kullanıcı', value: `<@${modCase.targetId}>`, inline: true },
    { name: 'Yetkili', value: `<@${modCase.moderatorId}>`, inline: true },
  ];
  if (modCase.durationMin) {
    fields.push({ name: 'Süre', value: formatMinutes(modCase.durationMin), inline: true });
  }
  fields.push({ name: 'Sebep', value: modCase.reason?.slice(0, 1024) || 'Belirtilmedi', inline: false });

  return createEmbed({
    title: `Vaka #${modCase.id} — ${TYPE_LABELS[modCase.type] ?? modCase.type}`,
    color,
    fields,
    footerText: `Moderasyon • ${new Date(modCase.createdAt).toLocaleString('tr-TR')}`,
  });
}

export function buildWarningsEmbed(targetId: string, warnings: { id: number; reason: string; active: boolean; createdAt: Date }[]): EmbedBuilder {
  const activeCount = warnings.filter((w) => w.active).length;
  if (warnings.length === 0) {
    return createEmbed({
      title: 'Uyarı Geçmişi',
      description: `<@${targetId}> kullanıcısının hiç uyarısı yok.`,
      color: Colors.SUCCESS,
      footerText: 'Moderasyon',
    });
  }
  const lines = warnings
    .map(
      (w) =>
        `\`#${w.id}\` ${w.active ? '🔴' : '🟢'} **${new Date(w.createdAt).toLocaleString('tr-TR')}** — ${w.reason?.slice(0, 180) || 'Sebep belirtilmedi'}`,
    )
    .slice(0, 25)
    .join('\n');
  return createEmbed({
    title: 'Uyarı Geçmişi',
    description: `**<@${targetId}>** — ${warnings.length} uyarı, ${activeCount} aktif.\n\n${lines}`,
    color: activeCount > 0 ? Colors.WARNING : Colors.SUCCESS,
    footerText: 'Moderasyon',
  });
}

export function buildHistoryEmbed(
  targetId: string,
  data: { cases: { id: number; type: string; targetId: string; durationMin: number | null; reason: string | null; createdAt: Date }[]; warnings: { id: number; reason: string; active: boolean; createdAt: Date }[] },
): EmbedBuilder {
  const totalCases = data.cases.length;
  const activeWarnings = data.warnings.filter((w) => w.active).length;
  const counts = data.cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});

  const summary = Object.entries(counts)
    .map(([type, count]) => `${TYPE_LABELS[type] ?? type}: ${count}`)
    .join(', ');

  const caseLines = data.cases.map(
    (c) => `\`#${c.id}\` **${TYPE_LABELS[c.type] ?? c.type}** — ${new Date(c.createdAt).toLocaleString('tr-TR')}`,
  );
  const warningLines = data.warnings.map(
    (w) => `\`#${w.id}\` **Uyarı** ${w.active ? '(aktif)' : '(pasif)'} — ${new Date(w.createdAt).toLocaleString('tr-TR')}`,
  );
  const lines = [...caseLines, ...warningLines].slice(0, 40).join('\n');

  return createEmbed({
    title: 'Ceza Geçmişi',
    description: `**<@${targetId}>**\n\n**Özet:** ${totalCases} vaka • ${data.warnings.length} uyarı (${activeWarnings} aktif)\n${summary ? `**Dağılım:** ${summary}` : ''}\n\n${lines || 'Kayıt yok.'}`,
    color: activeWarnings > 0 || totalCases > 0 ? Colors.WARNING : Colors.SUCCESS,
    footerText: 'Moderasyon',
  });
}

export function buildActionsEmbed(
  moderatorId: string,
  data: { cases: { id: number; type: string; targetId: string; durationMin: number | null; reason: string | null; createdAt: Date }[]; warnings: { id: number; userId: string; reason: string; createdAt: Date }[] },
): EmbedBuilder {
  const lines = data.cases
    .map(
      (c) =>
        `\`#${c.id}\` **${TYPE_LABELS[c.type] ?? c.type}** → <@${c.targetId}> — ${new Date(c.createdAt).toLocaleString('tr-TR')}`,
    )
    .concat(data.warnings.map((w) => `\`#${w.id}\` **Uyarı** → <@${w.userId}> — ${new Date(w.createdAt).toLocaleString('tr-TR')}`))
    .slice(0, 40)
    .join('\n');

  return createEmbed({
    title: 'İşlem Geçmişi',
    description: `**<@${moderatorId}>** yetkilisinin gerçekleştirdiği toplam **${data.cases.length}** vaka ve **${data.warnings.length}** uyarı.\n\n${lines || 'Henüz işlem yok.'}`,
    color: Colors.BRAND,
    footerText: 'Moderasyon',
  });
}