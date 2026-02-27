import { Team } from 'typings/portal';

const LeagueNames = [
  'ISFL',
  'DSFL',
  'WFC'
]

export const Teams = Object.freeze({
  ARIZONA_OUTLAWS: {
    location: 'Arizona',
    name: 'Outlaws',
    abbreviation: 'AZ',
    nameRegex: /arizona|az|outlaws/i,
    logoUrl: "https://i.imgur.com/x5bci4R.png",
    league: 'ISFL',
    conference: 'ASFC',
    colors: {
      primary: '#C21111',
      secondary: '#050505',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 4,
  },
  BALTIMORE_HAWKS: {
    location: 'Baltimore',
    name: 'Hawks',
    abbreviation: 'BAL',
    nameRegex: /baltimore|bal|hawks/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'NSFC',
    colors: {
      primary: '#E9AB00',
      secondary: '#000000',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 1,
  },
  BLACK_FOREST_BROOD: {
    location: 'Black Forest',
    name: 'Brood',
    abbreviation: 'BFB',
    nameRegex: /(black forest)|bfb|brood/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'NSFC',
    colors: {
      primary: '#51075F',
      secondary: '#2EB85E',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 13,
  },
  CAPE_TOWN_CRASH: {
    location: 'Cape Town',
    name: 'Crash',
    abbreviation: 'CTC',
    nameRegex: /(cape town)|ctc|crash/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'NSFC',
    colors: {
      primary: '#6807DE',
      secondary: '#E0912C',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 7,
  },
  COLORADO_YETI: {
    location: 'Colorado',
    name: 'Yeti',
    abbreviation: 'COL',
    nameRegex: /colorado|col|yeti/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'NSFC',
    colors: {
      primary: '#BF0A30',
      secondary: '#FFD700',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 3,
  },
  OSAKA_KAIJU: {
    location: 'Osaka',
    name: 'Kaiju',
    abbreviation: 'OSK',
    nameRegex: /osaka|osk|kaiju/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'NSFC',
    colors: {
      primary: '#1C3994',
      secondary: '#FFFFFF',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 9,
  },
  SARASOTA_SAILFISH: {
    location: 'Sarasota',
    name: 'Sailfish',
    abbreviation: 'SAR',
    nameRegex: /sarasota|sar|sailfish/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'NSFC',
    colors: {
      primary: '#38A6FA',
      secondary: '#24AA3D',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 11,
  },
  YELLOWKNIFE_WRAITHS: {
    location: 'Yellowknife',
    name: 'Wraiths',
    abbreviation: 'YKW',
    nameRegex: /yellowknife|ykw|wraiths/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'NSFC',
    colors: {
      primary: '#040404',
      secondary: '#119ED8',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 2,
  },
  AUSTIN_COPPERHEADS: {
    location: 'Austin',
    name: 'Copperheads',
    abbreviation: 'AUS',
    nameRegex: /austin|aus|copperheads/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'ASFC',
    colors: {
      primary: '#008080',
      secondary: '#9C4728',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 10
  },
  HONOLULU_HAHALUA: {
    location: 'Honolulu',
    name: 'Hahalua',
    abbreviation: 'HON',
    nameRegex: /honolulu|hon|hahalua/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'ASFC',
    colors: {
      primary: '#0B52DB',
      secondary: '#FBD90F',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 12,
  },
  NEW_ORLEANS_SECOND_LINE: {
    location: 'New Orleans',
    name: 'Second Line',
    abbreviation: 'NOLA',
    nameRegex: /(new orleans)|nola|(second line)/i,
    logoUrl:
      'https://i.imgur.com/wUJYXw7.png',
    league: 'ISFL',
    conference: 'ASFC',
    colors: {
      primary: '#412879',
      secondary: '#FFD700',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 8,
  },
  NEW_YORK_SILVERBACKS: {
    location: 'New York',
    name: 'Silverbacks',
    abbreviation: 'NYS',
    nameRegex: /(new york)|nys|silverbacks/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'ASFC',
    colors: {
      primary: '#2F4F4F',
      secondary: '#B7E4CF',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 14,
  },
  ORANGE_COUNTY_OTTERS: {
    location: 'Orange County',
    name: 'Otters',
    abbreviation: 'OCO',
    nameRegex: /(orange county)|oco|otters/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'ASFC',
    colors: {
      primary: '#E75900',
      secondary: '#311600',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 5,
  },
  SAN_JOSE_SABERCATS: {
    location: 'San Jose',
    name: 'Sabercats',
    abbreviation: 'SJS',
    nameRegex: /(san jose)|sjs|sabercats/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'ISFL',
    conference: 'ASFC',
    colors: {
      primary: '#8F825F',
      secondary: '#043028',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 6,
  },
  KANSAS_CITY_COYOTES: {
    location: 'Kansas City',
    name: 'Coyotes',
    abbreviation: 'KCC',
    nameRegex: /(kansas city)|kcc|coyotes/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'DSFL',
    conference: 'North',
    colors: {
      primary: '#892FDB',
      secondary: '#CFB42D',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 4,
  },
  LONDON_ROYALS: {
    location: 'London',
    name: 'Royals',
    abbreviation: 'LON',
    nameRegex: /london|lon|royals/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'DSFL',
    conference: 'North',
    colors: {
      primary: '#D3AF4A',
      secondary: '#333333',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 8,
  },
  MINNESOTA_GREY_DUCKS: {
    location: 'Minnesota',
    name: 'Grey Ducks',
    abbreviation: 'MIN',
    nameRegex: /minnesota|min|(grey ducks)/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'DSFL',
    conference: 'North',
    colors: {
      primary: '#00B3F4',
      secondary: '#87939C',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 6,
  },
  DALLAS_BIRDDOGS: {
    location: 'Dallas',
    name: 'Birddogs',
    abbreviation: 'DAL',
    nameRegex: /dallas|dal|birddogs/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'DSFL',
    conference: 'South',
    colors: {
      primary: '#0020ab',
      secondary: '#FFBE34',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 7,
  },
  PORTLAND_PYTHONS: {
    location: 'Portland',
    name: 'Pythons',
    abbreviation: 'POR',
    nameRegex: /portland|por|pythons/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'DSFL',
    conference: 'South',
    colors: {
      primary: '#008625',
      secondary: '#6B4D35',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 1,
  },
  BONDI_BEACH_BUCCANEERS: {
    location: 'Bondi Beach',
    name: 'Buccaneers',
    abbreviation: 'BBB',
    nameRegex: /(bondi beach)|bbb|buccaneers/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'DSFL',
    conference: 'South',
    colors: {
      primary: '#00843D',
      secondary: '#FFCD00',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 3,
  },
  NORFOLK_SEAWOLVES: {
    location: 'Norfolk',
    name: 'Seawolves',
    abbreviation: 'NOR',
    nameRegex: /norfolk|nor|seawolves/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'DSFL',
    conference: 'South',
    colors: {
      primary: '#031E4B',
      secondary: '#003F87',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 2,
  },
  TIJUANA_LUCHADORES: {
    location: 'Tijuana',
    name: 'Luchadores',
    abbreviation: 'TIJ',
    nameRegex: /tijuana|tij|luchadores/i,
    logoUrl:
      'https://i.imgur.com/x5bci4R.png',
    league: 'DSFL',
    conference: 'South',
    colors: {
      primary: '#AB2010',
      secondary: '#6B4D35',
      text: '#FFFFFF',
    },
    emoji: '',
    id: 5,
  },
} satisfies Record<string, Team>);

export const findTeamByName = (teamName: string, leagueType: string | undefined = undefined): Team | undefined => {
  if (!teamName) return undefined;
  if (leagueType)
    return Object.values(Teams).find((team) => team.nameRegex.test(teamName) && team.league === leagueType)

  return Object.values(Teams).find((team) => team.nameRegex.test(teamName));
};

export const findTeamsByLeague = (league: number) => {
  return Object.values(Teams).filter((team) => {
    if (team.league === LeagueNames[league])
      return team
  })
}