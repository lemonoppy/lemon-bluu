import { logger } from 'src/lib/logger';
import { Team } from 'typings/portal';

// Team name mappings
const FULL_NAME_TO_ABV: Record<string, string> = {
    'Austin Copperheads': 'AUS',
    'Arizona Outlaws': 'AZ',
    'Honolulu Hahalua': 'HON',
    'Las Vegas Legion': 'LVL',
    'New Orleans Secondline': 'NOLA',
    'New York Silverbacks': 'NYS',
    'Orange County Otters': 'OCO',
    'San Jose SaberCats': 'SJS',
    'Baltimore Hawks': 'BAL',
    'Berlin Fire Salamanders': 'BER',
    'Black Forest Brood': 'BFB',
    'Chicago Butchers': 'CHI',
    'Osaka Kaiju': 'OSK',
    'Colorado Yeti': 'COL',
    'Cape Town Crash': 'CTC',
    'Philadelphia Liberty': 'PHI',
    'Sarasota Sailfish': 'SAR',
    'Yellowknife Wraiths': 'YKW',
    'Minnesota Grey Ducks': 'MIN',
    'London Royals': 'LON',
    'Kansas City Coyotes': 'KCC',
    'Portland Pythons': 'POR',
    'Norfolk Seawolves': 'NOR',
    'Tijuana Luchadores': 'TIJ',
    'Bondi Beach Buccaneers': 'BBB',
    'Myrtle Beach Buccaneers': 'MBB',
    'Dallas Birddogs': 'DAL',
    'San Antonio Marshals': 'SAN',
    'Palm Beach Solar Bears': 'PBS',
};

const SHORT_NAME_TO_ABV: Record<string, string> = {
    'Copperheads': 'AUS',
    'Outlaws': 'AZ',
    'Hahalua': 'HON',
    'Legion': 'LVL',
    'Second': 'NOLA',
    'Secondline': 'NOLA',
    'Silverbacks': 'NYS',
    'Otters': 'OCO',
    'SaberCats': 'SJS',
    'Hawks': 'BAL',
    'Fire': 'BER',
    'Black': 'BFB',
    'Brood': 'BFB',
    'Butchers': 'CHI',
    'Kaiju': 'OSK',
    'Yeti': 'COL',
    'Crash': 'CTC',
    'Liberty': 'PHI',
    'Sailfish': 'SAR',
    'Wraiths': 'YKW',
};

const SHORT_NAME_TO_ABV_MODERN: Record<string, string> = {
    'Copperheads': 'AUS',
    'Outlaws': 'AZ',
    'Hahalua': 'HON',
    'Legion': 'NOLA',
    'Second': 'NOLA',
    'Secondline': 'NOLA',
    'Silverbacks': 'NYS',
    'Otters': 'OCO',
    'SaberCats': 'SJS',
    'Hawks': 'BAL',
    'Fire': 'BFB',
    'Black': 'BFB',
    'Brood': 'BFB',
    'Butchers': 'OSK',
    'Kaiju': 'OSK',
    'Yeti': 'COL',
    'Liberty': 'CTC',
    'Crash': 'CTC',
    'Sailfish': 'SAR',
    'Wraiths': 'YKW',
};

function GetGameCount(_season: number, _league: string = 'ISFL') {
    if (_league === 'DSFL') return 14;
    if (_season <= 15) return 14;
    if (_season <= 21) return 13;
    return 16;
}

function ParseWeekNumber(_index: number, _season: number) {
    // S2 is fucked cause they didn't fix the scheduling yet
    if (_season === 2) {
        if(_index >= 16 && _index <= 47)
            return Math.ceil((_index + 1) / GetGameCount(_season)) - 4

        if(_index >= 48 && _index <= 66)
            return Math.ceil((_index + 2) / GetGameCount(_season)) - 4

        if(_index >= 67)
            return Math.ceil((_index + 3) / GetGameCount(_season)) - 4
    }

    return Math.ceil(_index / GetGameCount(_season)) - 5 < 0
        ? Math.ceil(_index / GetGameCount(_season)) - 5
        : Math.ceil(_index / GetGameCount(_season)) - 4
}

function ParseFullToAbbreviation(_name: string) {
    return FULL_NAME_TO_ABV[_name] ?? _name;
}

function ParseTeamName(_name: string) {
    return SHORT_NAME_TO_ABV[_name];
}

function ParseTeamNameModern(_name: string) {
    return SHORT_NAME_TO_ABV_MODERN[_name];
}

function ParseTeam(_score: any, _modern = false) {
    let teamName = _score.children[0].children[1].data.trim().split(' ')[0];

    if (teamName.length <= 0) {
        try {
            teamName = _score.children[0].children[2].children[0].data.trim().split(' ')[0]
        } catch (e) {
            logger.error(e)
        }
    }

    return {
        team: _modern ? ParseTeamNameModern(teamName) : ParseTeamName(teamName),
        first: parseInt(_score.children[1].children[0].data),
        second: parseInt(_score.children[2].children[0].data),
        third: parseInt(_score.children[3].children[0].data),
        fourth: parseInt(_score.children[4].children[0].data),
        overtime: _score.children.length === 7 ? parseInt(_score.children[5].children[0].data) : -1,
        final: _score.children.length === 7 ? parseInt(_score.children[6].children[0].data) : parseInt(_score.children[5].children[0].data),
    };
}

function GetStandings(_season: number, _league: string) {
    const prefix = 'https://index.sim-football.com/';
    const seasonStr = _season <= 9 ? `0${_season}` : `${_season}`;

    if (_league === 'DSFL') {
        return `${prefix}DSFLS${seasonStr}/`;
    }

    // ISFL changed from NSFL to ISFL at season 24
    const leagueCode = _season <= 23 ? 'NSFL' : 'ISFL';
    return `${prefix}${leagueCode}S${seasonStr}/`;
}

function GetStandingsSplits(_season: number, _league: string): [number, number] {
    if (_league === 'DSFL') {
        return _season <= 20 ? [3, 6] : [4, 8];
    }

    // ISFL splits by season thresholds
    const splits: Array<{maxSeason: number, split: [number, number]}> = [
        { maxSeason: 1, split: [3, 6] },
        { maxSeason: 15, split: [4, 8] },
        { maxSeason: 21, split: [5, 10] },
        { maxSeason: 24, split: [6, 12] },
        { maxSeason: Infinity, split: [7, 14] },
    ];

    return splits.find(s => _season <= s.maxSeason)!.split;
}

function GetTeamPage(_season: number, _team: Team) {
    return GetStandings(_season, _team.league) + `Teams/${_team.id}.html`
}

function GetGameResults(_season: number, _league: string) {
    return GetStandings(_season, _league) + "GameResults.html"
}

function GetPBP(_season: number, _league: string, _gameId: number) {
    if (_season > 23) {
        return GetStandings(_season, _league) + "Logs/PBP.html?id=" + _gameId
    }

    return GetStandings(_season, _league) + "Logs/" + _gameId + ".html"
}

function GetBoxScore(_season: number, _league: string, _gameId: number) {
    if (_season > 23) {
        return GetStandings(_season, _league) + "Boxscores/Boxscore.html?id=" + _gameId
    }

    return GetStandings(_season, _league) + "Boxscores/" + _gameId + ".html"
}

const TEAM_ABV = ["AUS", "AZ", "BAL", "BER", "BFB", "CHI", "COL", "CTC", "HON", "LVL", "NOLA", "NYS", "OCO", "OSK", "PHI", "SAR", "SJS", "YKW"];

const TEAM_ABV_MODERN = ["AUS", "AZ", "BAL", "BFB", "OSK", "COL", "CTC", "HON", "NOLA", "NYS", "OCO", "SAR", "SJS", "YKW"];

export { GetGameCount, ParseWeekNumber, ParseTeamName, ParseTeamNameModern, ParseTeam, GetStandings, GetStandingsSplits, ParseFullToAbbreviation, GetGameResults, GetPBP, GetTeamPage, TEAM_ABV, TEAM_ABV_MODERN, GetBoxScore }