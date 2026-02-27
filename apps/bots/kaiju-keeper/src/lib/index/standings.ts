import axios from "axios";
import * as cheerio from "cheerio";
import { GetStandings, GetStandingsSplits } from 'src/lib/index/utils';

export type InternalStandings = {
  name: string;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  homeRecord: {
    wins: number;
    losses: number;
    ties: number;
  },
  awayRecord: {
    wins: number;
    losses: number;
    ties: number;
  },
  conferenceRecord: {
    wins: number;
    losses: number;
    ties: number;
  },
  streak: string;
}

const standings = async (season: number, league: string) => {
  const response = await axios.request({
    method: "GET",
    url: GetStandings(season, league),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
    }
  })

  const $ = cheerio.load(response.data);
  const hiliteRows = $('tr.hilite');

  const standings: { ASFC: InternalStandings[], NSFC: InternalStandings[]} = {
    ASFC: [],
    NSFC: []
  }

  const dsflStandings: { North: InternalStandings[], South: InternalStandings[]} = {
    North: [],
    South: []
  }

  const parseTeam = (el: any) => {
    return {
      name: $(el).find('td').eq(0).text().trim(),
      wins: Number($(el).find('td').eq(1).text().trim()),
      losses: Number($(el).find('td').eq(2).text().trim()),
      ties: Number($(el).find('td').eq(3).text().trim()),
      winPct: Number($(el).find('td').eq(4).text().trim()),
      pointsFor: Number($(el).find('td').eq(5).text().trim()),
      pointsAgainst: Number($(el).find('td').eq(6).text().trim()),
      homeRecord: {
        wins: Number($(el).find('td').eq(7).text().trim().split('-')[0]),
        losses: Number($(el).find('td').eq(7).text().trim().split('-')[1]),
        ties: Number($(el).find('td').eq(7).text().trim().split('-')[2])
      },
      awayRecord: {
        wins: Number($(el).find('td').eq(8).text().trim().split('-')[0]),
        losses: Number($(el).find('td').eq(8).text().trim().split('-')[1]),
        ties: Number($(el).find('td').eq(8).text().trim().split('-')[2])
      },
      conferenceRecord: {
        wins: Number($(el).find('td').eq(9).text().trim().split('-')[0]),
        losses: Number($(el).find('td').eq(9).text().trim().split('-')[1]),
        ties: Number($(el).find('td').eq(9).text().trim().split('-')[2])
      },
      streak: $(el).find('td').eq(11).text().trim()
    }
  }

  hiliteRows.slice(0, GetStandingsSplits(season, league)[0]).each((i, el) => {
    if (league === 'DSFL') {
      dsflStandings.North.push(parseTeam(el))
    } else {
      standings.ASFC.push(parseTeam(el))
    }
  })

  hiliteRows.slice(GetStandingsSplits(season, league)[0], GetStandingsSplits(season, league)[1]).each((i, el) => {
    if (league === 'DSFL') {
      dsflStandings.South.push(parseTeam(el))
    } else {
      standings.NSFC.push(parseTeam(el))
    }
  })

  if (league === 'DSFL') {
    return dsflStandings;
  }
  return standings;
}

export default standings;