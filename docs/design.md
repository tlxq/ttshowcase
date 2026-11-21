# Design rules

Confirmed by Tom 2026-11-08. Rewritten 2026-11-14 to match the site as it is now, for Tom to read. Values live in `src/design/tokens.css`; this file says what they're for.

Two parts since 2026-11-21: the front, built against its Direction page, and the walk, the site as it was on 2026-11-14.

## The front
Tom approved the Direction page on 2026-11-21. It is private; its link is in `~/.claude/plans/design-workflow.md`. It is the bar for every build of the front, and the design reviewer judges against it.

- **Recruiter gate.** Before anything is made, an idea passes five rules: readable in 2 seconds; the effect stays behind the words; one effect per screen; the phone gets the same story, under 400 KB per moment; finished without motion.
- **Grounds.** Cream (`--look-cream`) for the first screen, warm dark (`--look-dark-soft`) for the statement, black (`--look-ground`) for the work.
- **The blue.** #4aa8ff, a new token `--front-spray` that comes with the front's PR. It is only the travelling thing and focus rings, never buttons or words. It changes form at every moment: ring, signature, paint drips, ink behind RUN, a wash behind each project, a dot at the end.
- **No line between moving parts.** Two things that scroll at different speeds are never joined by a line (Tom 2026-11-21, on the phone).
- **Type.** Clash Display for big words, Inter for reading.
- **Handwriting.** Each project's note is Tom's own hand, traced like the signature. Never AI handwriting.
- **Assets.** Made on the desk's graphics card first (Z-Image, BiRefNet, Depth Anything, potrace), then moved by small shaders. No video models.

## The walk
The rules below are the walk's. The orange spray (`--look-spray`) stays the walk's colour.

### Colour
Two grounds, black and cream, and one spray colour.

| Token | Use |
|---|---|
| `--look-ground` | The page. Near-black, so the words and the line are the brightest things on it |
| `--look-text` | Text on the black |
| `--look-soft` | Second-line text on the black |
| `--look-quiet` | Labels and tech lists |
| `--look-rule` | Hairlines and button edges |
| `--look-cream` | The cream ground, for the Tom part |
| `--look-dark` | Dark text on the cream, and the dark posters in Experiments |
| `--look-dark-soft`, `--look-dark-quiet` | Second-line text and labels on the cream |
| `--look-spray` | The one colour: the line, Tom's tags and their drips, the ● live dot, and the paint under selected words. Also hover and focus on things you can tap |

- Text passes WCAG AA on every background it sits on.
- This site has no status colours.
- Stand-in photos stay out of git and off the real site.

### Type
- **Inter Tight**, weight 900 for big words and 800 for the rest. Big words are uppercase.
- **JetBrains Mono** for small labels, numbers and tech lists.
- Sizes come from tokens: the first screen's words, the four parts' names, the `tlxq` word, a project's name, label, small and reading. Nothing between them.
- A project's name is as big as fits the screen without breaking a word (`--chars`).
- The tags are Tom's own handwriting, not a font.

### Spacing
- An 8 px grid, using seven steps: 8, 16, 24, 32, 48, 72, 112.
- One side gutter, on every part.
- Anything you tap is at least 44 px.

### The tags
Every piece of handwriting on the page is Tom's. He writes it on the phone with the S Pen (`mise run write`) and `mise run tags` makes it a spray-paint tag in `src/content/hand`. Each stroke is drawn at his own pen speed, then the paint runs. A tag is written as it passes the pen's tip, once. Without motion it is simply there. The studio's own list is the only list of what the page says in handwriting; no word is written twice.

### The line
One line, in the spray colour. It starts where the first tag's last stroke ends, bends round and runs down the right side, then under the `tlxq` letters to the left side and down on. It loops once round each of Tom's tools, and at the end of Questions it turns into Tom's signature. It draws itself as the page scrolls, never further than the pen's tip, and its route is worked out from where things really are, again whenever the page changes size.

On a phone it goes down the side so it never crosses the words.

#### Marking a part
The line finds its way by itself. A part only marks what the line does there:
- `data-line-end` on a tag: the line ends where the tag starts and goes on as it.
- `data-line-under`: the line runs under this word.
- `data-line-stack` on a list and `data-line-loop` on each item: the line loops round each one.
- Never place line points by hand.
- The walks check the line on phone and laptop. Run them on the desk before merge.

### Look rules
Tom 2026-11-11, from the look audit. Every visual change passes these on laptop and phone before Tom sees it.
- **R2** The line never touches words. It keeps clear of every word and letter, except where it loops round one of Tom's tools on purpose.
- **R4** Between parts, the line moves straight, with one size of rounded corner, and goes down the side. No slants or S-bends across the screen. The signature is a drawing and the only exception.
- **R5** Nothing looks broken while it waits for the line. Every screen, at every scroll position, has something to read or watch.
- **R7** One ink. The page line is the only line. No lines inside photos.
- **R8** Nothing stray. Every element on screen belongs to a moment.

R1, R3 and R6 were about the 3D letters and the sticker. They went with them, and their numbers are not used again.

### Motion
One long page the browser scrolls. No snapping and no custom swipe code. Four big moments, everything else calm. The moments are in `brief.md`.

| Kind | What | Rule |
|---|---|---|
| Big moments | The tag writing itself, the `tlxq` letters flying out and locking, a project's laptop opening and its phone sliding out, the line becoming the signature | The only big motion on the site |
| Follows the scroll | The line, the tags, the words rising in, the letters, a project's screens | No timers. Stop scrolling and it settles |
| Timed | The first tag writing itself, the live dot breathing, the tab icon's drip | Plain timers, with the first tag starting a moment after the page opens |
| Small | Hover, press, toggle | Toggle or Panel speed |

- Named speeds: Toggle and Panel, and the tokens for each moment. How fast something catches up with the scroll is a constant next to its code, until Tom says it feels right.
- Screen elements animate only transform and opacity.
- Reduced motion gives a complete still page with all the real text: the tags are written, the line is whole, the tab icon is one still drip.

### Small things
- **Cursor.** On a laptop the pointer is a chisel marker, tip down to the left where you click, in the page's colours. Over a link it has a spray ring round the tip. On a phone and in forced colours it is the browser's own.
- **Paint under selected words.** Selecting words paints a rough chisel stroke under them in the spray colour, and it goes when the selection does. Not in forced colours.
- **Tab icon.** Tom's icon tag. While the visitor is on another tab it drips paint, then it is clean again on return. The title never changes.
- **404.** Tom's 404 tag, the address struck through, one line and the four parts to go back to.
- **Share card.** A link to the page shows the first screen (`public/share.jpg`, made by `mise run share`). The words under it are Tom's.
- **Light page.** Pictures are AVIF and the Live part's films play only while they are near the screen. The speed walk keeps the page under its budget in `tools/walk/budget.json`.

### The wall
On hold. The code is in the repo (`src/wall`, `/wall`), but the site sends `/wall` to the front page and nothing links to it. It comes back only when Tom says so.

### Words and signum
- **Kept:** all of signum's word rules and logic rules.
- **Kept from its look rules:** tap size, AA contrast, transform and opacity only.
- **Replaced here:** signum's fonts, its tokens and "colour is status only". Those are written for tthome.
- The word is always lowercase: `tlxq`.
