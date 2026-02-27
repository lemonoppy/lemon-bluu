export const shortenPosition = (position: string) => {
  switch (position) {
    case 'Quarterback':
      return 'QB';
    case 'Running Back':
      return 'RB';
    case 'Wide Receiver':
      return 'WR';
    case 'Tight End':
      return 'TE';
    case 'Offensive Lineman':
      return 'OL';
    case 'Defensive End':
      return 'DE';
    case 'Defensive Tackle':
      return 'DT';
    case 'Linebacker':
      return 'LB';
    case 'Cornerback':
      return 'CB';
    case 'Safety':
      return 'S';
    case 'Kicker':
      return 'K';
    default:
      return position;
  }
}

export const formatBalance = (bankBalance: number) => {
  return `$${bankBalance.toLocaleString('en-US')}`;
}

/**
 * Get the active player for a Discord user
 * @param discordUserId The Discord user ID
 * @returns The player object if found, undefined otherwise
 */
export const getPlayerFromDiscordUser = async (discordUserId: string) => {
  const { getUserByFuzzy } = await import('src/db/portal');
  const { PortalClient } = await import('src/db/portal/PortalClient');
  const { users } = await import('src/db/users');

  const currentUserInfo = await users.get(discordUserId);
  if (!currentUserInfo?.forumName) {
    return undefined;
  }

  const user = await getUserByFuzzy(currentUserInfo.forumName);
  if (!user) {
    return undefined;
  }

  const players = await PortalClient.getActivePlayers();
  return players.find((p) => p.uid === user.uid);
}