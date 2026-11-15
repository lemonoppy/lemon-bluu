import { APIInteractionGuildMember, GuildMember } from 'discord.js';

import { Config, UserRole } from './config/config';

const roleFor = (userId: string): UserRole => {
  if (Config.devTeamIds.includes(userId)) return UserRole.BOT_OWNER;
  if (Config.adminTeamIds.includes(userId)) return UserRole.ADMIN;
  if (Config.modTeamIds.includes(userId)) return UserRole.MODERATOR;
  return UserRole.REGULAR;
};

export const checkRole = (
  member: GuildMember | APIInteractionGuildMember | null,
  minRole: UserRole,
): boolean => (member ? roleFor(member.user.id) >= minRole : false);
