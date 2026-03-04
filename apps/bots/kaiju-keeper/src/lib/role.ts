import { APIInteractionGuildMember, GuildMember } from 'discord.js';

import { Config, UserRole } from './config/config';

export const checkRole = async (
  member: GuildMember | APIInteractionGuildMember | null,
  minRole: UserRole,
) => {
  if (!member) return false;
  if (Config.devTeamIds.includes(member.user.id)) {
    return minRole <= UserRole.BOT_OWNERS;
  }
  if (Config.teamGMs.includes(member.user.id)) {
    return minRole <= UserRole.SERVER_ADMIN;
  }
  return UserRole.REGULAR >= minRole;
};
