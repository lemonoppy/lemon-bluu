import { logger } from 'src/lib/logger';
import { Team } from 'typings/portal';

function GetGameCount(_season: number, _league: string = 'ISFL') {
    if (_league === 'DSFL') {
        return 14;
    }

    if (_season <= 15) {
        return 14;
    }
    if (_season <= 21) {
        return 13;
    }
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
    switch (_name) {
        case 'Austin Copperheads':
            return "AUS";
        case 'Arizona Outlaws':
            return "AZ";
        case 'Honolulu Hahalua':
            return "HON";
        case 'Las Vegas Legion':
            return "LVL";
        case 'New Orleans Secondline':
            return "NOLA";
        case 'New York Silverbacks':
            return "NYS";
        case 'Orange County Otters':
            return "OCO";
        case 'San Jose SaberCats':
            return "SJS";
        case 'Baltimore Hawks':
            return "BAL";
        case 'Berlin Fire Salamanders':
            return 'BER';
        case 'Black Forest Brood':
            return "BFB";
        case 'Chicago Butchers':
            return "CHI";
        case 'Osaka Kaiju':
            return "OSK";
        case 'Colorado Yeti':
            return "COL";
        case 'Cape Town Crash':
            return "CTC";
        case 'Philadelphia Liberty':
            return "PHI";
        case 'Sarasota Sailfish':
            return "SAR";
        case 'Yellowknife Wraiths':
            return "YKW";
        case 'Minnesota Grey Ducks':
            return "MIN";
        case 'London Royals':
            return "LON";
        case 'Kansas City Coyotes':
            return "KCC";
        case 'Portland Pythons':
            return "POR";
        case 'Norfolk Seawolves':
            return "NOR";
        case 'Tijuana Luchadores':
            return "TIJ";
        case 'Bondi Beach Buccaneers':
            return "BBB";
        case 'Myrtle Beach Buccaneers':
            return "MBB";
        case 'Dallas Birddogs':
            return "DAL";
        case 'San Antonio Marshals':
            return "SAN";
        case 'Palm Beach Solar Bears':
            return "PBS";
        default:
            return _name;
    }
}

function ParseTeamName(_name: string) {
    switch (_name) {
        case 'Copperheads':
            return "AUS";
        case 'Outlaws':
            return "AZ";
        case 'Hahalua':
            return "HON";
        case 'Legion':
            return "LVL";
        case 'Second':
        case 'Secondline':
            return "NOLA";
        case 'Silverbacks':
            return "NYS";
        case 'Otters':
            return "OCO";
        case 'SaberCats':
            return "SJS";
        case 'Hawks':
            return "BAL";
        case 'Fire':
						return 'BER';
				case 'Black':
				case 'Brood':
            return "BFB";
        case 'Butchers':
						return "CHI";
        case 'Kaiju':
            return "OSK";
        case 'Yeti':
            return "COL";
        case 'Crash':
            return "CTC";
        case 'Liberty':
            return "PHI";
        case 'Sailfish':
            return "SAR";
        case 'Wraiths':
            return "YKW";
    }
}

function ParseTeamNameModern(_name: string) {
    switch (_name) {
        case 'Copperheads':
            return "AUS";
        case 'Outlaws':
            return "AZ";
        case 'Hahalua':
            return "HON";
        case 'Legion':
        case 'Second':
        case 'Secondline':
            return "NOLA";
        case 'Silverbacks':
            return "NYS";
        case 'Otters':
            return "OCO";
        case 'SaberCats':
            return "SJS";
        case 'Hawks':
            return "BAL";
        case 'Fire':
				case 'Black':
				case 'Brood':
            return "BFB";
				case 'Butchers':
				case 'Kaiju':
						return "OSK";
        case 'Yeti':
            return "COL";
        case 'Liberty':
        case 'Crash':
            return "CTC";
        case 'Sailfish':
            return "SAR";
        case 'Wraiths':
            return "YKW";
    }
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
    if (_league === 'DSFL') {
        if (_season <= 9) {
            return `https://index.sim-football.com/DSFLS0${_season}/`
        }

        return `https://index.sim-football.com/DSFLS${_season}/`
    }

    if (_season <= 9) {
        return `https://index.sim-football.com/NSFLS0${_season}/`
    }
    if (_season <= 23) {
        return `https://index.sim-football.com/NSFLS${_season}/`
    }
    return `https://index.sim-football.com/ISFLS${_season}/`
}

function GetStandingsSplits(_season: number, _league: string) {
    if (_league === 'DSFL') {
        if (_season <= 20) {
            return [3, 6]
        }
        return [4, 8]
    }

    if (_season <= 1) {
        return [3, 6]
    }
    if (_season <= 15) {
        return [4, 8]
    }
    if (_season <= 21) {
        return [5, 10]
    }
    if (_season <= 24) {
        return [6, 12]
    }
    return [7, 14]
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