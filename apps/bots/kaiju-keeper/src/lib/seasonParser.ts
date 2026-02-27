import { GameStats } from 'typings/db.typings';

export function getSeasonRecords(records: Array<GameStats>) {
  const wins = records.reduce((acc, game) => acc + Number(game.score > game.opponentscore), 0);
  const losses = records.reduce((acc, game) => acc + Number(game.score < game.opponentscore), 0);
  const ties = records.reduce((acc, game) => acc + Number(game.score === game.opponentscore), 0);

  return {
    wins, losses, ties,
  }
}