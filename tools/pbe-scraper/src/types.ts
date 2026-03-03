export interface PlayerLink {
  name: string;
  url: string;
}

export interface FieldingStatRow {
  [key: string]: string;
}

export interface PlayerData {
  name: string;
  url: string;
  scrapedFromYear?: number; // 2B scraper
  lastActiveSeason?: number; // all-players scraper
  scrapedDate?: string;
  careerFieldingStats: FieldingStatRow[];
}
