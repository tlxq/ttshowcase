// The tag alphabet for tools/write/tag.mjs. Units: the capital height is 1000, y is up from the
// baseline (negative), small letters are 560 high, tails go 380 below. Each letter is the points
// the pen passes through, from where it comes in to where it leaves for the next letter; "s" is a
// sharp corner. The rules (writers' guides, see the plan): one height, one lean and one width for
// all letters; joins stay small; where a stroke must go back, it goes back over itself.
const S = "s";

export const LETTERS = {
  // Stem down, a hook, up into the cross, across to the left and back over it into the next letter.
  t: {
    w: 260,
    path: [
      [110, -900, S],
      [80, -60],
      [150, 0, S],
      [250, -560, S],
      [-60, -575, S],
      [280, -548],
    ],
  },
  l: {
    w: 150,
    path: [
      [70, -1000, S],
      [30, -50],
      [110, 0],
    ],
  },
  // Up to the right, a small arch over the top back to the left, down to the right.
  x: {
    w: 300,
    path: [
      [0, 0, S],
      [280, -560, S],
      [190, -660],
      [50, -650],
      [0, -560, S],
      [300, 0, S],
    ],
  },
  q: {
    w: 280,
    path: [
      [250, -500],
      [130, -575],
      [20, -430],
      [30, -110],
      [140, 0],
      [240, -170],
      [265, -560, S],
      [230, 380, S],
    ],
  },
  // Written from the foot up, so it leaves at the top for the tall h.
  s: {
    w: 260,
    path: [
      [0, -70, S],
      [120, 0],
      [240, -120],
      [190, -280],
      [60, -350],
      [40, -480],
      [150, -570],
      [260, -530],
    ],
  },
  h: {
    w: 300,
    path: [
      [50, -1000, S],
      [10, 0, S],
      [30, -380],
      [150, -560],
      [250, -450],
      [240, -70],
      [320, 0],
    ],
  },
  o: {
    w: 300,
    path: [
      [190, -560],
      [50, -480],
      [10, -200],
      [120, 0],
      [250, -120],
      [260, -420],
      [150, -570],
      [320, -545],
    ],
  },
  w: {
    w: 340,
    path: [
      [0, -560, S],
      [70, 0, S],
      [170, -400, S],
      [250, 0, S],
      [340, -560, S],
    ],
  },
  c: {
    w: 270,
    path: [
      [240, -480],
      [140, -570],
      [30, -450],
      [10, -160],
      [120, 0],
      [270, -60],
    ],
  },
  a: {
    w: 320,
    path: [
      [240, -500],
      [120, -570],
      [10, -400],
      [30, -100],
      [130, 0],
      [245, -220],
      [265, -560, S],
      [250, -60],
      [330, 0],
    ],
  },
  e: {
    w: 280,
    path: [
      [30, -260],
      [250, -330, S],
      [200, -540],
      [90, -565],
      [0, -400],
      [20, -120],
      [140, 0],
      [280, -60],
    ],
  },
  b: {
    w: 280,
    path: [
      [60, -1000, S],
      [20, 0, S],
      [35, -380],
      [160, -560],
      [260, -400],
      [230, -110],
      [100, 0],
      [30, -50, S],
      [300, -20],
    ],
  },
  u: {
    w: 330,
    path: [
      [0, -560, S],
      [10, -120],
      [120, 0],
      [240, -160],
      [260, -560, S],
      [250, -60],
      [330, 0],
    ],
  },
  r: {
    w: 260,
    path: [
      [0, -540, S],
      [10, 0, S],
      [30, -380],
      [150, -560],
      [270, -500],
    ],
  },
  k: {
    w: 300,
    path: [
      [60, -1000, S],
      [20, 0, S],
      [35, -300],
      [240, -560, S],
      [60, -280, S],
      [260, 0],
      [320, 10],
    ],
  },
  n: {
    w: 320,
    path: [
      [0, -560, S],
      [10, 0, S],
      [30, -380],
      [150, -560],
      [250, -440],
      [240, -60],
      [320, 0],
    ],
  },
  // Capitals: the first letter stands tall.
  A: {
    w: 470,
    path: [
      [0, 0, S],
      [220, -1000, S],
      [420, 0, S],
      [90, -360, S],
      [520, -420],
    ],
  },
  W: {
    w: 520,
    path: [
      [0, -1000, S],
      [110, 0, S],
      [250, -640, S],
      [380, 0, S],
      [520, -1000, S],
    ],
  },
  L: {
    w: 380,
    path: [
      [60, -1000, S],
      [20, 0, S],
      [400, -30],
    ],
  },
  C: {
    w: 450,
    path: [
      [420, -860],
      [250, -1010],
      [60, -860],
      [0, -450],
      [100, -90],
      [300, 0],
      [450, -90],
    ],
  },
};

/** A swoosh under the word: from the end, down and back under it, to a sharp stop. */
const underline = (at) => [
  [at + 60, 160],
  [at * 0.55, 290],
  [-80, 210, S],
];

export const WORDS = [{ name: "tlxq", text: "tlxq", bar: underline, style: { space: -10 } }];
