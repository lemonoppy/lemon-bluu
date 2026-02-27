import { Player } from 'typings/portal';

const positionValues = {
  'Quarterback': 1,
  'Running Back': 2,
  'Wide Receiver': 3,
  'Tight End': 4,
  'Offensive Lineman': 5,
  'Defensive Tackle': 6,
  'Defensive End': 7,
  'Linebacker': 8,
  'Cornerback': 9,
  'Safety': 10,
  'Kicker': 11,
}

export const playerSorter = (roster: Player[] | undefined) => {
  if (roster) {
    return roster.sort((a, b) => {
      if (a.position === b.position) {
        return a.totalTPE > b.totalTPE ? -1 : 1;
      }
      return positionValues[a.position] > positionValues[b.position] ? 1 : -1;
    });
  }
  return []
}