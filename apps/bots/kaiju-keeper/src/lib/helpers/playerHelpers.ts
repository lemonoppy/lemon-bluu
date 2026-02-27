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