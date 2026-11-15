/** The new look's words (/look, Tom OK'd the still 11-13). */

/** The address Tom picked (11-15). It is in the code, so local runs, walks and Vercel all show the same link. */
export const lookMail = "hello@ttdevs.com";

export const lookWho = ["Tom Larsson", "Fullstack engineer", "Sweden"];

/** The four parts, one per letter of tlxq. */
export const lookParts = [
  { id: "tom", label: "Tom", mark: 0, note: "Who I am, what I use", photo: "/images/c5.avif" },
  { id: "live", label: "Live", mark: 0, note: "What runs now", photo: "/images/c0.avif" },
  {
    id: "experiments",
    label: "Experiments",
    mark: 1,
    note: "Things I'm trying",
    photo: "/images/c3.avif",
  },
  {
    id: "questions",
    label: "Questions",
    mark: 0,
    note: "Ask me, by mail",
    photo: "/images/c1.avif",
  },
];

export const lookHero = {
  lines: ["I build", "and run", "things", "myself."],
  lead: "Fullstack engineer, from the data model to the server.",
  cue: "Scroll to follow the line",
};

/** The Tom part. Stand-in words (Tom 11-13: "generate some and we change later"). Each fact is said
 * once on the page: the stack only in its list, the live count only in its line. */
export const lookTom = {
  headline: ["Screens,", "code and", "servers."],
  about:
    "I plan the data, build what you see and what runs behind it, and look after the servers myself. You talk to one person about all of it.",
  stack: ["TypeScript · React", "C# · .NET", "Postgres · Linux"],
};

/** The Questions part, the end: who it is for, then where to reach Tom. GitHub and LinkedIn as on
 * the old page, and the mail address. */
export const lookAsk = {
  lines: ["Hiring?", "A project?", "A question?"],
  links: [
    { label: "Email me", href: `mailto:${lookMail}`, external: false },
    { label: "GitHub ↗", href: "https://github.com/tlxq", external: true },
    { label: "LinkedIn ↗", href: "https://linkedin.com/in/tlxq", external: true },
  ],
  sign: "Tom Larsson, 2026",
};

/** The Experiments part: Tom's own tools, from the old page's Experiments (Tom OK'd the words
 * there). `turn` is how each poster hangs on the wall, in degrees. The AI toolbox moved to Live as
 * a main project (launch plan A1, 11-14). */
export const lookLab: {
  name: string;
  line: string;
  built: string[];
  links?: { label: string; href: string }[];
  turn: number;
}[] = [
  {
    name: "Desktop tools",
    line: "linux · hyprland",
    built: ["bar · thermals · headset · bench"],
    // Public since 11-15
    links: [{ label: "Code for tthermal", href: "https://github.com/tlxq/tthermal" }],
    turn: 2.5,
  },
];

/** A project's screens: a laptop shot (960 × 600), a phone shot (300 wide, `height` tall; a tall
 * one scrolls as the page passes), and
 * `frame`, the site shown live in the laptop, with `from`, the addresses it lets show it (its
 * frame-ancestors). Anywhere else the shot stays. */
/** A terminal on a screen: a title, then lines of real output (host names made neutral, long lines
 * cut or put in short, never made up). `cmd` lines are typed by Tom, `ok` lines passed, `quiet` lines are notes. */
export type Term = {
  title: string;
  lines: { text: string; kind?: "cmd" | "ok" | "quiet" }[];
};

type Screens = {
  /** The laptop shows a drawing of how a project is built instead of a shot */
  diagram?: "home";
  /** The laptop or the phone plays a film of the site scrolling instead of a shot (made by
   * tools/previews.sh from recordings.json: the path without .mp4/.webp) */
  laptopFilm?: string;
  phoneFilm?: string;
  /** The laptop or the phone shows a terminal instead of a shot */
  laptopTerm?: Term;
  phoneTerm?: Term;
  laptop?: string;
  phone?: { src: string; height: number };
  frame?: { src: string; from: string[] };
};

/** The Live part: the main projects, in the CV's order (launch plan A1, 11-14). Each is a small
 * case study: what it is and for whom, Tom's part, what he did with the CV's numbers, the stack,
 * its screens, and where to open it. Stand-in words from the CV: Tom reads them before launch.
 * Each of Tom's notes is used once on the page (Tom 11-13: "we can't duplicate ourselves"):
 * `note` names the one a project carries. tthome has no public address, so no link. */
export const lookLive: {
  name: string;
  line: string;
  role: string;
  did: string[];
  stack: string;
  links?: { label: string; href: string }[];
  /** Open to anyone now, at its address: counted as live in the Tom part */
  live?: true;
  /** Why a project has no link, where that needs saying */
  away?: string;
  screens: Screens;
  photo: string;
  note?: { hand: "tryIt" | "server"; label: string };
}[] = [
  {
    name: "tthome",
    line: "My home's server: Home Assistant, plus the apps it was missing.",
    role: "Runs in my home, built alone",
    did: [
      "A deploy tool that shows what will restart, asks, then logs it",
      "1,302 commits and 352 merged pull requests",
      "1,114 tests: 418 in Vitest, 696 in pytest",
    ],
    stack: "TypeScript · Hono · Next.js · Python · Docker · Caddy · Tailscale",
    away: "Runs at home, so it has no public address.",
    // A drawing, not a shot: its pages show the family and the house (never public, Tom 11-14)
    screens: {
      diagram: "home",
      phoneTerm: {
        title: "tthome",
        lines: [
          { text: "tthome status", kind: "cmd" },
          { text: "desk · 27 on the list in place, 0 to fix, 0 linked but not listed" },
          { text: "repo: clean, up to date with GitHub", kind: "ok" },
          { text: "tthome deploy", kind: "cmd" },
          { text: "shows the commits and what restarts, asks, logs it", kind: "quiet" },
          { text: "tthome install", kind: "cmd" },
          { text: "links this PC's units from its list", kind: "quiet" },
        ],
      },
    },
    photo: "/images/c4.avif",
    note: { hand: "server", label: "my own server" },
  },
  {
    name: "epaRadar",
    line: "Friends on a live map. Only friends see where you are.",
    role: "Degree project, built by me",
    did: [
      "Row-level security: only friends can read your position",
      "511 database checks in pgTAP, 168 Jest tests",
      "Checked on my desk before every merge, 333 commits",
    ],
    stack: "React Native · Expo · Supabase · Postgres · pgTAP",
    // The repo is public since 11-15; the numbers above are counted on its master (11-15)
    links: [
      { label: "Open the site", href: "https://eparadar.se" },
      { label: "Code for epaRadar", href: "https://github.com/tlxq/eparadar" },
    ],
    // The laptop shot is eparadar.se on 11-15; the phone is the map with demo data on the desk
    // emulator (epaRadar's mise run pictures, master 11-13)
    screens: {
      laptop: "/projects/eparadar-laptop.webp",
      phone: { src: "/projects/eparadar-karta.webp", height: 650 },
      // eparadar.se's frame-ancestors (its PR #8, 11-15)
      frame: {
        src: "https://www.eparadar.se",
        from: ["ttdevs.com", "www.ttdevs.com", "ttshowcase.vercel.app"],
      },
    },
    photo: "/images/c1.avif",
  },
  {
    name: "ttoolbox",
    line: "Claude Code plugins and a CLI that keep my two PCs the same.",
    role: "Built and used daily by me",
    did: [
      "The ttoolbox plugin: 9 skills, 4 agents that review, verify, fix and research, 23 bats tests",
      "The dot CLI: 2,302 lines of Bash, 92 bats tests",
      "One setup on two PCs, kept in step through git",
    ],
    stack: "Claude Code · Bash · bats · GNU Stow · mise",
    // Both repos are public at launch (Tom 11-14: "link both repos"); the numbers above are per repo
    links: [
      { label: "Code for ttoolbox", href: "https://github.com/tlxq/ttoolbox" },
      { label: "Code for dot", href: "https://github.com/tlxq/dot" },
    ],
    // Real output from 11-14: the verifier's report on raddavarfruberga #34 (its findings in short) and
    // the dot repo's bats run, as in the public repo (the last lines as printed, long ones cut with …)
    screens: {
      laptopTerm: {
        title: "claude · verifier",
        lines: [
          { text: "verify raddavarfruberga #34 on the live site", kind: "cmd" },
          { text: "VERDICT: PASS", kind: "ok" },
          {
            text: "[pass] live headers: frame-ancestors https://ttdevs.com …, no X-Frame-Options",
            kind: "ok",
          },
          {
            text: "[pass] check:page against the live site: PAGE CHECK PASSED, 9 of 9",
            kind: "ok",
          },
          { text: "[pass] framed from another site: refused (frame-ancestors)", kind: "ok" },
          { text: "[pass] framed from the portfolio's address: the site loads", kind: "ok" },
          { text: "not tested: ttdevs.com itself", kind: "quiet" },
        ],
      },
      phoneTerm: {
        title: "bats",
        lines: [
          { text: "bats tests/", kind: "cmd" },
          {
            text: "ok 87 status --json: today lists today's commits with the PC that made them",
            kind: "ok",
          },
          {
            text: "ok 88 pick theirs: drops this PC's edit (saved), then pulls the other PC's",
            kind: "ok",
          },
          {
            text: "ok 89 pick mine: pulls the other PC's change, then shares this PC's …",
            kind: "ok",
          },
          { text: "ok 90 pick: refuses a file that isn't shared", kind: "ok" },
          { text: "ok 91 revert: takes one shared change back on both PCs", kind: "ok" },
          { text: "ok 92 revert: refuses while a file in that change is edited here", kind: "ok" },
          { text: "bats --count tests/", kind: "cmd" },
          { text: "92" },
        ],
      },
    },
    photo: "/images/c3.avif",
  },
  {
    name: "raddavarfruberga.se",
    line: "Petition site for our preschool's parents. I'm one of the parents.",
    role: "Volunteer project, live",
    did: [
      "1,000+ signatures, stored in the EU, no one's row public",
      "A security audit of the database rules",
      "Page rebuilds on Vercel cut by 79% with on-demand updates",
    ],
    stack: "Next.js · TypeScript · Supabase · Resend · Vercel",
    live: true,
    links: [{ label: "Open the site", href: "https://raddavarfruberga.se" }],
    screens: {
      laptop: "/projects/raddavarfruberga-laptop.webp",
      phone: { src: "/projects/raddavarfruberga-phone.webp", height: 2462 },
      // raddavarfruberga.se's frame-ancestors (its PR #34, 11-14)
      frame: {
        src: "https://raddavarfruberga.se",
        from: ["ttdevs.com", "www.ttdevs.com", "ttshowcase.vercel.app"],
      },
    },
    photo: "/images/c5.avif",
    note: { hand: "tryIt", label: "try it" },
  },
  {
    // Public sites Tom built for EDGE Associates (Tom 11-13: "we can show"); nothing about its
    // clients or his job here (never-public list). Recording + link only (Tom 11-14).
    name: "app-utveckling.se",
    line: "Two landing pages for EDGE Associates, on one code base.",
    role: "Work project, built alone",
    did: [
      "51 pull requests, from the first sketch to live",
      "Scroll-driven scenes",
      "SEO and Core Web Vitals checked",
    ],
    stack: "Astro · TypeScript",
    live: true,
    links: [
      { label: "app-utveckling.se", href: "https://app-utveckling.se" },
      { label: "mjukvaruutvecklare.com", href: "https://mjukvaruutvecklare.com" },
    ],
    // Films, since both sites refuse to be shown in a frame (mise run previews)
    screens: {
      laptopFilm: "/projects/app-utveckling-laptop",
      phoneFilm: "/projects/mjukvaruutvecklare-phone",
    },
    photo: "/images/c2.avif",
  },
];

/** tthome drawn on the laptop's screen (HomeMap.tsx): who reaches it, the way in, what runs, and how
 * it is run. Parts only, no names or addresses (never public). */
export const lookHomeMap = {
  reach: ["Phones · laptops", "and the TV"],
  way: ["Tailscale", "private network"],
  door: ["Caddy", "HTTPS"],
  runs: "Docker Compose",
  parts: ["Home Assistant", "MQTT", "Home pages", "Photos", "Media"],
  run: ["tthome CLI", "status · install · deploy"],
  jobs: ["systemd", "units + timers"],
  log: ["Activity log", "every job and deploy"],
};
