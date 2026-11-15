import { lookAsk } from "@/content/look";
import { hands } from "@/look/handPaint";
import { WallPaint } from "./paint";

export interface PosterLook {
  ground: string;
  text: string;
  quiet: string;
  spray: string;
  cream: string;
  words: string;
  mono: string;
}

/**
 * The end of /look, the page the visitor has just left, as a paper poster: the Questions, "ask me"
 * and Tom's signature. It has the screen's own shape, so when the wall opens on it, it fills the
 * screen as the page did, and then the camera pulls back from it.
 */
export function makePoster(aspect: number, look: PosterLook): HTMLCanvasElement {
  const H = 1400;
  const W = Math.round(H * aspect);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  g.fillStyle = look.ground;
  g.fillRect(0, 0, W, H);
  const side = Math.round(Math.min(W, H) * 0.07);
  // Room at the top for the wall page's Close, which sits over the poster at first.
  const head = side + Math.round(H * 0.05);

  // 04 / 04 — Questions
  const label = Math.round(H * 0.018);
  g.font = `500 ${label}px ${look.mono}`;
  g.fillStyle = look.quiet;
  g.textBaseline = "alphabetic";
  g.fillText("04 / 04", side, head + label);
  g.fillText("QUESTIONS", side + label * 9, head + label);

  // Hiring? A project? A question? as big as the longest fits across.
  const longest = Math.max(...lookAsk.lines.map((l) => l.length));
  const size = Math.min((W - side * 2) / (longest * 0.6), H * 0.13);
  g.font = `900 ${size}px ${look.words}`;
  lookAsk.lines.forEach((line, i) => {
    g.fillStyle = i === lookAsk.lines.length - 1 ? look.spray : look.text;
    g.fillText(line.toUpperCase(), side, H * 0.22 + size * 0.92 * (i + 1));
  });
  const under = H * 0.22 + size * 0.92 * lookAsk.lines.length;

  // The links, then "ask me" pointing at them.
  g.font = `500 ${label * 1.2}px ${look.mono}`;
  g.fillStyle = look.text;
  const links = lookAsk.links.map((l) => l.label).join("     ");
  g.fillText(links, side, under + size * 0.7);
  const ask = new WallPaint(hands.askMe, look.spray, 1, Math.min(W * 0.26, 420));
  ask.draw(Infinity);
  // Beside the links when there is room, under them on a narrow screen.
  const after = side + g.measureText(links).width + label * 2;
  if (after + ask.canvas.width <= W - side) g.drawImage(ask.canvas, after, under + size * 0.2);
  else g.drawImage(ask.canvas, side, under + size * 0.85);

  // Tom's signature and his name, bottom right.
  const sign = new WallPaint(hands.signature, look.cream, 1, Math.min(W * 0.36, 620));
  sign.draw(Infinity);
  g.drawImage(sign.canvas, W - side - sign.canvas.width, H - side - sign.canvas.height - label * 2);
  g.font = `400 ${label}px ${look.mono}`;
  g.fillStyle = look.quiet;
  const who = lookAsk.sign;
  g.fillText(who, W - side - g.measureText(who).width, H - side);
  return cv;
}
