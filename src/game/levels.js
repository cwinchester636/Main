const HEIGHT = 15;

function buildLevel({
  name,
  width,
  groundGaps = [],
  platforms = [],
  spikes = [],
  coins = [],
  enemies = [],
  playerStart,
  flag,
  theme,
}) {
  const grid = Array.from({ length: HEIGHT }, () => new Array(width).fill('.'));

  for (let r = HEIGHT - 2; r < HEIGHT; r++) {
    for (let c = 0; c < width; c++) grid[r][c] = '#';
  }
  for (const [s, e] of groundGaps) {
    for (let c = s; c <= e; c++) {
      grid[HEIGHT - 2][c] = '.';
      grid[HEIGHT - 1][c] = '.';
    }
  }

  for (const { row, start, end } of platforms) {
    for (let c = start; c <= end; c++) grid[row][c] = '~';
  }

  for (const [r, c] of spikes) grid[r][c] = '^';
  for (const [r, c] of coins) grid[r][c] = 'C';

  grid[flag[0]][flag[1]] = 'F';

  return {
    name,
    width,
    height: HEIGHT,
    grid,
    enemies: enemies.map((e) => ({ ...e })),
    playerStart,
    theme,
  };
}

export const LEVELS = [
  buildLevel({
    name: 'Grassy Start',
    width: 46,
    groundGaps: [
      [12, 13],
      [24, 26],
      [34, 34],
    ],
    platforms: [
      { row: 10, start: 16, end: 19 },
      { row: 9, start: 28, end: 30 },
    ],
    spikes: [
      [12, 20],
      [12, 21],
    ],
    coins: [
      [11, 6], [11, 7], [11, 8],
      [9, 17], [9, 18],
      [12, 29],
      [8, 38], [8, 39], [8, 40],
    ],
    enemies: [
      { col: 20, row: 12, minCol: 16, maxCol: 23 },
      { col: 37, row: 12, minCol: 33, maxCol: 43 },
    ],
    playerStart: { col: 2, row: 12 },
    flag: [11, 44],
    theme: 'meadow',
  }),
  buildLevel({
    name: 'Rocky Gorge',
    width: 60,
    groundGaps: [
      [8, 9],
      [18, 20],
      [30, 32],
      [42, 44],
      [50, 51],
    ],
    platforms: [
      { row: 11, start: 10, end: 12 },
      { row: 9, start: 21, end: 23 },
      { row: 10, start: 33, end: 35 },
      { row: 8, start: 37, end: 39 },
      { row: 11, start: 45, end: 48 },
    ],
    spikes: [
      [12, 15], [12, 16],
      [12, 37], [12, 38], [12, 39],
      [12, 54], [12, 55],
    ],
    coins: [
      [10, 11],
      [8, 22],
      [9, 34],
      [7, 38],
      [10, 46], [10, 47],
      [6, 25], [6, 26], [6, 27],
    ],
    enemies: [
      { col: 14, row: 12, minCol: 11, maxCol: 17 },
      { col: 25, row: 12, minCol: 21, maxCol: 29 },
      { col: 40, row: 12, minCol: 36, maxCol: 41 },
      { col: 53, row: 12, minCol: 46, maxCol: 58 },
    ],
    playerStart: { col: 2, row: 12 },
    flag: [11, 58],
    theme: 'canyon',
  }),
  buildLevel({
    name: 'Sky Spire',
    width: 70,
    groundGaps: [
      [6, 7],
      [14, 16],
      [22, 23],
      [28, 30],
      [38, 40],
      [48, 50],
      [58, 60],
    ],
    platforms: [
      { row: 11, start: 9, end: 11 },
      { row: 9, start: 17, end: 18 },
      { row: 12, start: 24, end: 26 },
      { row: 10, start: 32, end: 33 },
      { row: 8, start: 35, end: 36 },
      { row: 10, start: 42, end: 44 },
      { row: 7, start: 45, end: 46 },
      { row: 11, start: 52, end: 54 },
      { row: 9, start: 61, end: 63 },
    ],
    spikes: [
      [12, 19], [12, 20],
      [12, 41],
      [12, 47], [12, 48],
      [12, 64], [12, 65], [12, 66],
    ],
    coins: [
      [10, 10],
      [8, 17], [8, 18],
      [11, 25],
      [9, 32],
      [7, 35], [7, 36],
      [6, 43], [6, 44],
      [10, 53],
      [5, 46],
      [8, 62],
    ],
    enemies: [
      { col: 13, row: 12, minCol: 9, maxCol: 13 },
      { col: 26, row: 11, minCol: 24, maxCol: 26 },
      { col: 34, row: 9, minCol: 32, maxCol: 33 },
      { col: 43, row: 9, minCol: 42, maxCol: 44 },
      { col: 53, row: 10, minCol: 52, maxCol: 54 },
      { col: 62, row: 12, minCol: 55, maxCol: 68 },
    ],
    playerStart: { col: 2, row: 12 },
    flag: [8, 67],
    theme: 'sky',
  }),
];
