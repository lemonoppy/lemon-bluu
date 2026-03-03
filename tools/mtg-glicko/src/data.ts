export interface MatchRecord {
  draft: number;
  round: number;
  pA: string;
  pB: string;
  sA: number;
  sB: number;
  winner: string;
}

const games: MatchRecord[] = [
  {
    "draft": 1,
    "round": 1,
    "pA": "Ana",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 1,
    "round": 1,
    "pA": "Kyle",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 1,
    "round": 1,
    "pA": "Nelson",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 1,
    "round": 1,
    "pA": "Luka",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 1,
    "round": 2,
    "pA": "Jake",
    "pB": "Kyle",
    "sA": 0,
    "sB": 1,
    "winner": "Kyle"
  },
  {
    "draft": 1,
    "round": 2,
    "pA": "Nelson",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 1,
    "round": 2,
    "pA": "Ana",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 1,
    "round": 2,
    "pA": "Hersh",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 1,
    "round": 3,
    "pA": "Kyle",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 1,
    "round": 3,
    "pA": "Jake",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 1,
    "round": 3,
    "pA": "Sam",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 1,
    "round": 3,
    "pA": "Ana",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 2,
    "round": 4,
    "pA": "Markus",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 2,
    "round": 4,
    "pA": "Hersh",
    "pB": "Ana",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 2,
    "round": 4,
    "pA": "Kyle",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 2,
    "round": 4,
    "pA": "Luka",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 2,
    "round": 5,
    "pA": "Sam",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 2,
    "round": 5,
    "pA": "Nelson",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 2,
    "round": 5,
    "pA": "Markus",
    "pB": "Ana",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 2,
    "round": 5,
    "pA": "Kyle",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 2,
    "round": 6,
    "pA": "Sam",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 2,
    "round": 6,
    "pA": "Hersh",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 2,
    "round": 6,
    "pA": "Markus",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 2,
    "round": 6,
    "pA": "Ana",
    "pB": "Kyle",
    "sA": 0,
    "sB": 1,
    "winner": "Kyle"
  },
  {
    "draft": 3,
    "round": 7,
    "pA": "Hersh",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 3,
    "round": 7,
    "pA": "Kyle",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 3,
    "round": 7,
    "pA": "Luka",
    "pB": "Ana",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 3,
    "round": 7,
    "pA": "Jake",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 3,
    "round": 8,
    "pA": "Nelson",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 3,
    "round": 8,
    "pA": "Luka",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 3,
    "round": 8,
    "pA": "Hersh",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 3,
    "round": 8,
    "pA": "Ana",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 3,
    "round": 9,
    "pA": "Sam",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 3,
    "round": 9,
    "pA": "Nelson",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 3,
    "round": 9,
    "pA": "Hersh",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 3,
    "round": 9,
    "pA": "Kyle",
    "pB": "Ana",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 4,
    "round": 10,
    "pA": "Markus",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 4,
    "round": 10,
    "pA": "Luka",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 4,
    "round": 10,
    "pA": "Sam",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 4,
    "round": 10,
    "pA": "Kyle",
    "pB": "Ana",
    "sA": 0,
    "sB": 1,
    "winner": "Ana"
  },
  {
    "draft": 4,
    "round": 11,
    "pA": "Hersh",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 4,
    "round": 11,
    "pA": "Nelson",
    "pB": "Ana",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 4,
    "round": 11,
    "pA": "Markus",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 4,
    "round": 11,
    "pA": "Sam",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 4,
    "round": 12,
    "pA": "Hersh",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 4,
    "round": 12,
    "pA": "Luka",
    "pB": "Ana",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 4,
    "round": 12,
    "pA": "Markus",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 4,
    "round": 12,
    "pA": "Jake",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 5,
    "round": 13,
    "pA": "Nelson",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 5,
    "round": 13,
    "pA": "Hersh",
    "pB": "Ana",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 5,
    "round": 13,
    "pA": "Markus",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 5,
    "round": 13,
    "pA": "Sam",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 5,
    "round": 14,
    "pA": "Nelson",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 5,
    "round": 14,
    "pA": "Markus",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 5,
    "round": 14,
    "pA": "Luka",
    "pB": "Ana",
    "sA": 0,
    "sB": 1,
    "winner": "Ana"
  },
  {
    "draft": 5,
    "round": 14,
    "pA": "Kyle",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 5,
    "round": 15,
    "pA": "Nelson",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 5,
    "round": 15,
    "pA": "Hersh",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 5,
    "round": 15,
    "pA": "Ana",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 5,
    "round": 15,
    "pA": "Luka",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 6,
    "round": 16,
    "pA": "Markus",
    "pB": "Nelson",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 6,
    "round": 16,
    "pA": "Sam",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 6,
    "round": 16,
    "pA": "Hersh",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 6,
    "round": 16,
    "pA": "Ana",
    "pB": "Kyle",
    "sA": 0,
    "sB": 1,
    "winner": "Kyle"
  },
  {
    "draft": 6,
    "round": 17,
    "pA": "Markus",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 6,
    "round": 17,
    "pA": "Hersh",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 6,
    "round": 17,
    "pA": "Nelson",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 6,
    "round": 17,
    "pA": "Jake",
    "pB": "Ana",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 6,
    "round": 18,
    "pA": "Markus",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 6,
    "round": 18,
    "pA": "Sam",
    "pB": "Kyle",
    "sA": 0,
    "sB": 1,
    "winner": "Kyle"
  },
  {
    "draft": 6,
    "round": 18,
    "pA": "Nelson",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 6,
    "round": 18,
    "pA": "Luka",
    "pB": "Ana",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 7,
    "round": 19,
    "pA": "Nelson",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 7,
    "round": 19,
    "pA": "Ana",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Ana"
  },
  {
    "draft": 7,
    "round": 19,
    "pA": "Kyle",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 7,
    "round": 19,
    "pA": "Markus",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 7,
    "round": 20,
    "pA": "Hersh",
    "pB": "Ana",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 7,
    "round": 20,
    "pA": "Kyle",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 7,
    "round": 20,
    "pA": "Nelson",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 7,
    "round": 20,
    "pA": "Jake",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 7,
    "round": 21,
    "pA": "Hersh",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 7,
    "round": 21,
    "pA": "Ana",
    "pB": "Kyle",
    "sA": 0,
    "sB": 1,
    "winner": "Kyle"
  },
  {
    "draft": 7,
    "round": 21,
    "pA": "Sam",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 7,
    "round": 21,
    "pA": "Nelson",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 8,
    "round": 1,
    "pA": "Boudsey",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 8,
    "round": 1,
    "pA": "Hersh",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 8,
    "round": 1,
    "pA": "Luka",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 8,
    "round": 1,
    "pA": "Kyle",
    "pB": "Nelson",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 8,
    "round": 2,
    "pA": "Jake",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 8,
    "round": 2,
    "pA": "Luka",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 8,
    "round": 2,
    "pA": "Boudsey",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 8,
    "round": 2,
    "pA": "Sam",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 8,
    "round": 3,
    "pA": "Jake",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 8,
    "round": 3,
    "pA": "Hersh",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 8,
    "round": 3,
    "pA": "Markus",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 8,
    "round": 3,
    "pA": "Boudsey",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 9,
    "round": 4,
    "pA": "Hersh",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 9,
    "round": 4,
    "pA": "Boudsey",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 9,
    "round": 4,
    "pA": "Sam",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 9,
    "round": 4,
    "pA": "Kyle",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 9,
    "round": 5,
    "pA": "Nelson",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 9,
    "round": 5,
    "pA": "Markus",
    "pB": "Kyle",
    "sA": 0,
    "sB": 1,
    "winner": "Kyle"
  },
  {
    "draft": 9,
    "round": 5,
    "pA": "Hersh",
    "pB": "Boudsey",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 9,
    "round": 5,
    "pA": "Sam",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 9,
    "round": 6,
    "pA": "Jake",
    "pB": "Kyle",
    "sA": 0,
    "sB": 1,
    "winner": "Kyle"
  },
  {
    "draft": 9,
    "round": 6,
    "pA": "Nelson",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 9,
    "round": 6,
    "pA": "Hersh",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 9,
    "round": 6,
    "pA": "Boudsey",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 10,
    "round": 7,
    "pA": "Hersh",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 10,
    "round": 7,
    "pA": "Sam",
    "pB": "Boudsey",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 10,
    "round": 7,
    "pA": "Nelson",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 10,
    "round": 7,
    "pA": "Kyle",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 10,
    "round": 8,
    "pA": "Luka",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 10,
    "round": 8,
    "pA": "Nelson",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 10,
    "round": 8,
    "pA": "Hersh",
    "pB": "Boudsey",
    "sA": 0,
    "sB": 1,
    "winner": "Boudsey"
  },
  {
    "draft": 10,
    "round": 8,
    "pA": "Markus",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 10,
    "round": 9,
    "pA": "Sam",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 10,
    "round": 9,
    "pA": "Luka",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 10,
    "round": 9,
    "pA": "Boudsey",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 10,
    "round": 9,
    "pA": "Hersh",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 11,
    "round": 10,
    "pA": "Jake",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 11,
    "round": 10,
    "pA": "Kyle",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 11,
    "round": 10,
    "pA": "Hersh",
    "pB": "Boudsey",
    "sA": 0,
    "sB": 1,
    "winner": "Boudsey"
  },
  {
    "draft": 11,
    "round": 10,
    "pA": "Nelson",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 11,
    "round": 11,
    "pA": "Jake",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 11,
    "round": 11,
    "pA": "Boudsey",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 11,
    "round": 11,
    "pA": "Luka",
    "pB": "Kyle",
    "sA": 0,
    "sB": 1,
    "winner": "Kyle"
  },
  {
    "draft": 11,
    "round": 11,
    "pA": "Hersh",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 11,
    "round": 12,
    "pA": "Jake",
    "pB": "Nelson",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 11,
    "round": 12,
    "pA": "Markus",
    "pB": "Boudsey",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 11,
    "round": 12,
    "pA": "Kyle",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 11,
    "round": 12,
    "pA": "Luka",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 12,
    "round": 13,
    "pA": "Sam",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 12,
    "round": 13,
    "pA": "Kyle",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 12,
    "round": 13,
    "pA": "Hersh",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 12,
    "round": 13,
    "pA": "Boudsey",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 12,
    "round": 14,
    "pA": "Nelson",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 12,
    "round": 14,
    "pA": "Luka",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 12,
    "round": 14,
    "pA": "Sam",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 12,
    "round": 14,
    "pA": "Hersh",
    "pB": "Boudsey",
    "sA": 0,
    "sB": 1,
    "winner": "Boudsey"
  },
  {
    "draft": 12,
    "round": 15,
    "pA": "Nelson",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 12,
    "round": 15,
    "pA": "Markus",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 12,
    "round": 15,
    "pA": "Sam",
    "pB": "Boudsey",
    "sA": 0,
    "sB": 1,
    "winner": "Boudsey"
  },
  {
    "draft": 12,
    "round": 15,
    "pA": "Kyle",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 13,
    "round": 16,
    "pA": "Boudsey",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 13,
    "round": 16,
    "pA": "Jake",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 13,
    "round": 16,
    "pA": "Sam",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 13,
    "round": 16,
    "pA": "Markus",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 13,
    "round": 17,
    "pA": "Luka",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 13,
    "round": 17,
    "pA": "Sam",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 13,
    "round": 17,
    "pA": "Boudsey",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 13,
    "round": 17,
    "pA": "Hersh",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 13,
    "round": 18,
    "pA": "Jake",
    "pB": "Nelson",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 13,
    "round": 18,
    "pA": "Luka",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 13,
    "round": 18,
    "pA": "Boudsey",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 13,
    "round": 18,
    "pA": "Kyle",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 14,
    "round": 19,
    "pA": "Nelson",
    "pB": "Boudsey",
    "sA": 0,
    "sB": 1,
    "winner": "Boudsey"
  },
  {
    "draft": 14,
    "round": 19,
    "pA": "Kyle",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 14,
    "round": 19,
    "pA": "Jake",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 14,
    "round": 19,
    "pA": "Hersh",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 14,
    "round": 20,
    "pA": "Boudsey",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 14,
    "round": 20,
    "pA": "Jake",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 14,
    "round": 20,
    "pA": "Nelson",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 14,
    "round": 20,
    "pA": "Markus",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 14,
    "round": 21,
    "pA": "Boudsey",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 14,
    "round": 21,
    "pA": "Kyle",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 14,
    "round": 21,
    "pA": "Luka",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 14,
    "round": 21,
    "pA": "Nelson",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 15,
    "round": 22,
    "pA": "Hersh",
    "pB": "Boudsey",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 15,
    "round": 22,
    "pA": "Nelson",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 15,
    "round": 22,
    "pA": "Jake",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 15,
    "round": 22,
    "pA": "Markus",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 15,
    "round": 23,
    "pA": "Hersh",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 15,
    "round": 23,
    "pA": "Jake",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 15,
    "round": 23,
    "pA": "Boudsey",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 15,
    "round": 23,
    "pA": "Kyle",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 15,
    "round": 24,
    "pA": "Hersh",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 15,
    "round": 24,
    "pA": "Sam",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 15,
    "round": 24,
    "pA": "Nelson",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 15,
    "round": 24,
    "pA": "Boudsey",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 16,
    "round": 25,
    "pA": "Kyle",
    "pB": "Boudsey",
    "sA": 0,
    "sB": 1,
    "winner": "Boudsey"
  },
  {
    "draft": 16,
    "round": 25,
    "pA": "Sam",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 16,
    "round": 25,
    "pA": "Nelson",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 16,
    "round": 25,
    "pA": "Markus",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 16,
    "round": 26,
    "pA": "Boudsey",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 16,
    "round": 26,
    "pA": "Jake",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 16,
    "round": 26,
    "pA": "Kyle",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 16,
    "round": 26,
    "pA": "Nelson",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 16,
    "round": 27,
    "pA": "Boudsey",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 16,
    "round": 27,
    "pA": "Hersh",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 16,
    "round": 27,
    "pA": "Sam",
    "pB": "Nelson",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 16,
    "round": 27,
    "pA": "Kyle",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 17,
    "round": 28,
    "pA": "Boudsey",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 17,
    "round": 28,
    "pA": "Hersh",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 17,
    "round": 28,
    "pA": "Nelson",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 17,
    "round": 28,
    "pA": "Sam",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 17,
    "round": 29,
    "pA": "Boudsey",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 17,
    "round": 29,
    "pA": "Nelson",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 17,
    "round": 29,
    "pA": "Luka",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 17,
    "round": 29,
    "pA": "Kyle",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 17,
    "round": 30,
    "pA": "Hersh",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 17,
    "round": 30,
    "pA": "Boudsey",
    "pB": "Nelson",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 17,
    "round": 30,
    "pA": "Luka",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 17,
    "round": 30,
    "pA": "Markus",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 18,
    "round": 31,
    "pA": "Kyle",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 18,
    "round": 31,
    "pA": "Boudsey",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 18,
    "round": 31,
    "pA": "Hersh",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 18,
    "round": 31,
    "pA": "Sam",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 18,
    "round": 32,
    "pA": "Nelson",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 18,
    "round": 32,
    "pA": "Hersh",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 18,
    "round": 32,
    "pA": "Kyle",
    "pB": "Boudsey",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 18,
    "round": 32,
    "pA": "Markus",
    "pB": "Sam",
    "sA": 1,
    "sB": 0,
    "winner": "Markus"
  },
  {
    "draft": 18,
    "round": 33,
    "pA": "Jake",
    "pB": "Luka",
    "sA": 0,
    "sB": 1,
    "winner": "Luka"
  },
  {
    "draft": 18,
    "round": 33,
    "pA": "Nelson",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 18,
    "round": 33,
    "pA": "Kyle",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 18,
    "round": 33,
    "pA": "Boudsey",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 19,
    "round": 34,
    "pA": "Sam",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 19,
    "round": 34,
    "pA": "Boudsey",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 19,
    "round": 34,
    "pA": "Luka",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 19,
    "round": 34,
    "pA": "Kyle",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 19,
    "round": 35,
    "pA": "Sam",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 19,
    "round": 35,
    "pA": "Luka",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 19,
    "round": 35,
    "pA": "Jake",
    "pB": "Boudsey",
    "sA": 0,
    "sB": 1,
    "winner": "Boudsey"
  },
  {
    "draft": 19,
    "round": 35,
    "pA": "Markus",
    "pB": "Kyle",
    "sA": 0,
    "sB": 1,
    "winner": "Kyle"
  },
  {
    "draft": 19,
    "round": 36,
    "pA": "Hersh",
    "pB": "Nelson",
    "sA": 1,
    "sB": 0,
    "winner": "Hersh"
  },
  {
    "draft": 19,
    "round": 36,
    "pA": "Sam",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 19,
    "round": 36,
    "pA": "Boudsey",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 19,
    "round": 36,
    "pA": "Jake",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 20,
    "round": 37,
    "pA": "Sam",
    "pB": "Kyle",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 20,
    "round": 37,
    "pA": "Luka",
    "pB": "Boudsey",
    "sA": 0,
    "sB": 1,
    "winner": "Boudsey"
  },
  {
    "draft": 20,
    "round": 37,
    "pA": "Markus",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 20,
    "round": 37,
    "pA": "Nelson",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 20,
    "round": 38,
    "pA": "Sam",
    "pB": "Boudsey",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 20,
    "round": 38,
    "pA": "Jake",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 20,
    "round": 38,
    "pA": "Kyle",
    "pB": "Luka",
    "sA": 1,
    "sB": 0,
    "winner": "Kyle"
  },
  {
    "draft": 20,
    "round": 38,
    "pA": "Markus",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 20,
    "round": 39,
    "pA": "Sam",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 20,
    "round": 39,
    "pA": "Boudsey",
    "pB": "Jake",
    "sA": 1,
    "sB": 0,
    "winner": "Boudsey"
  },
  {
    "draft": 20,
    "round": 39,
    "pA": "Kyle",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 20,
    "round": 39,
    "pA": "Luka",
    "pB": "Markus",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  },
  {
    "draft": 21,
    "round": 40,
    "pA": "Luka",
    "pB": "Kyle",
    "sA": 0,
    "sB": 1,
    "winner": "Kyle"
  },
  {
    "draft": 21,
    "round": 40,
    "pA": "Markus",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 21,
    "round": 40,
    "pA": "Sam",
    "pB": "Boudsey",
    "sA": 1,
    "sB": 0,
    "winner": "Sam"
  },
  {
    "draft": 21,
    "round": 40,
    "pA": "Nelson",
    "pB": "Hersh",
    "sA": 1,
    "sB": 0,
    "winner": "Nelson"
  },
  {
    "draft": 21,
    "round": 41,
    "pA": "Kyle",
    "pB": "Jake",
    "sA": 0,
    "sB": 1,
    "winner": "Jake"
  },
  {
    "draft": 21,
    "round": 41,
    "pA": "Sam",
    "pB": "Nelson",
    "sA": 0,
    "sB": 1,
    "winner": "Nelson"
  },
  {
    "draft": 21,
    "round": 41,
    "pA": "Luka",
    "pB": "Markus",
    "sA": 0,
    "sB": 1,
    "winner": "Markus"
  },
  {
    "draft": 21,
    "round": 41,
    "pA": "Boudsey",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 21,
    "round": 42,
    "pA": "Jake",
    "pB": "Nelson",
    "sA": 1,
    "sB": 0,
    "winner": "Jake"
  },
  {
    "draft": 21,
    "round": 42,
    "pA": "Kyle",
    "pB": "Sam",
    "sA": 0,
    "sB": 1,
    "winner": "Sam"
  },
  {
    "draft": 21,
    "round": 42,
    "pA": "Markus",
    "pB": "Hersh",
    "sA": 0,
    "sB": 1,
    "winner": "Hersh"
  },
  {
    "draft": 21,
    "round": 42,
    "pA": "Luka",
    "pB": "Boudsey",
    "sA": 1,
    "sB": 0,
    "winner": "Luka"
  }
]

export { games };
