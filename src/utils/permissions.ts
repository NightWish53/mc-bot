import { GuildMember, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { env } from '../config/env.js';

export function hasModRole(member: GuildMember): boolean {
  if (member.permissions.has('Administrator')) return true;
  if (env.MOD_ROLE_IDS.length === 0) return false;
  return member.roles.cache.some((role) => env.MOD_ROLE_IDS.includes(role.id));
}

export function hasTimeoutPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ModerateMembers);
}

export function hasMutePermission(member: GuildMember): boolean {
  return hasModRole(member) || hasTimeoutPermission(member);
}

export async function requireModeratorMember(
  interaction: ChatInputCommandInteraction,
): Promise<GuildMember | null> {
  const member = interaction.member;
  if (!member || !('roles' in member)) return null;
  if (member instanceof GuildMember) return member;
  const fetched = await interaction.guild?.members.fetch(member.user.id);
  return fetched ?? null;
}

export function hasTicketStaffRole(member: GuildMember): boolean {
  if (member.permissions.has('Administrator')) return true;
  return member.roles.cache.some((role) => env.TICKET_STAFF_ROLE_IDS.includes(role.id));
}


export function hasRole(member: GuildMember, roleId: string): boolean {
  if (roleId.length === 0) return false;
  return member.roles.cache.has(roleId);
}

export function isAdmin(member: GuildMember): boolean {
  return member.permissions.has('Administrator');
}