import axios from "axios";
import * as cheerio from "cheerio";
import { GetGameCount, GetTeamPage, ParseFullToAbbreviation } from 'src/lib/index/utils';
import { Team } from 'typings/portal';

export type InternalSchedule = {
  week: number;
  opponent: string;
  home: boolean;
  homeScore: number;
  awayScore: number;
  result: string;
}

const schedule = async (season: number, team: Team) => {
  const response = await axios.request({
    method: "GET",
    url: GetTeamPage(season, team),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
    }
  })

  const $ = cheerio.load(response.data);
  const tables = $('table.Grid');
  const scheduleTable = tables.eq(6).get(0);
  const scheduleRows = $(scheduleTable).find('tr');

  const results: InternalSchedule[] = []

  const parseWeek = (el: any) => {
    const weekString = $(el).find('td').eq(1).text().trim();
    const home = weekString.split(' (')[0][0] !== '@'
    const rawOpponent = weekString.split(' (')[0]
    const opponent = ParseFullToAbbreviation(home ? rawOpponent : rawOpponent.slice(1, rawOpponent.length))
    const rawScore = $(el).find('a').text().trim()
    let homeScore
    let awayScore

    if (rawScore.includes('  ')) {
      homeScore = rawScore.length ? Number(rawScore.split('  ')[1].trim().split('-')[0]) : 0
      awayScore = rawScore.length ? Number(rawScore.split('  ')[1].trim().split('-')[1]) : 0
    }
    else {
      homeScore = rawScore.length ? Number(rawScore.split(' ')[1].trim().split('-')[0]) : 0
      awayScore = rawScore.length ? Number(rawScore.split(' ')[1].trim().split('-')[1]) : 0
    }

    return {
      week: Number($(el).find('td').eq(0).text().trim()),
      opponent,
      home,
      homeScore,
      awayScore,
      result: rawScore ? rawScore[0] : '',
    }
  }

  scheduleRows.slice(6, 6 + GetGameCount(season, team.league)).each((i, el) => {
    results.push(parseWeek(el))
  })

  return results
}

export default schedule;