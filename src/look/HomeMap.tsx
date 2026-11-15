import { lookHomeMap as map } from "@/content/look";

/** One box of the drawing: its edge, a name and an optional second line. */
function Box({
  x,
  y,
  w,
  h,
  name,
  note,
  lead,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  note?: string;
  lead?: boolean;
}) {
  return (
    <g className={lead ? "lk-map-box lk-map-lead" : "lk-map-box"}>
      <rect x={x} y={y} width={w} height={h} rx={14} pathLength={1} />
      <text x={x + w / 2} y={y + (note ? h / 2 - 8 : h / 2 + 12)} className="lk-map-name">
        {name}
      </text>
      {note && (
        <text x={x + w / 2} y={y + h / 2 + 34} className="lk-map-note">
          {note}
        </text>
      )}
    </g>
  );
}

/**
 * tthome drawn on the laptop's screen instead of a shot (kept to its left three quarters, clear of
 * the phone in front), since its pages show the family and the
 * house: who reaches it, the way in, what runs in Docker, and how it is run. Its edges and ties draw
 * on with the stage's --rise as the lid opens (look.css).
 */
export function HomeMap() {
  return (
    <svg className="lk-map" viewBox="0 0 1600 1000" aria-hidden="true">
      <Box x={60} y={40} w={340} h={130} name={map.reach[0]!} note={map.reach[1]} />
      <Box x={460} y={40} w={340} h={130} name={map.way[0]!} note={map.way[1]} />
      <Box x={860} y={40} w={340} h={130} name={map.door[0]!} note={map.door[1]} />
      <path className="lk-map-tie" d="M400 105H460M800 105H860M1030 170V250" pathLength={1} />
      <g className="lk-map-box lk-map-group">
        <rect x={60} y={250} width={1160} height={390} rx={18} pathLength={1} />
        <text x={90} y={295} className="lk-map-label">
          {map.runs}
        </text>
      </g>
      {map.parts.map((part, i) => (
        <Box key={part} x={90 + (i % 3) * 375} y={i < 3 ? 320 : 480} w={345} h={130} name={part} />
      ))}
      <Box x={60} y={720} w={400} h={140} name={map.run[0]!} note={map.run[1]} lead />
      <Box x={520} y={720} w={320} h={140} name={map.jobs[0]!} note={map.jobs[1]} />
      <Box x={900} y={720} w={320} h={140} name={map.log[0]!} note={map.log[1]} />
      <path
        className="lk-map-tie lk-map-lead"
        d="M260 720V640M460 790H520M840 790H900"
        pathLength={1}
      />
    </svg>
  );
}
