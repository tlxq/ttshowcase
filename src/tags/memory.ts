/**
 * The tag store in memory, for the unit tests and for the pitch's local store (tools/tags/local.mjs). Same rules as
 * the live one in api/tags.ts, nothing is kept after the process ends.
 */
import { randomUUID } from "node:crypto";
import type { Deps, Status } from "../../api/tags.ts";

type Row = Parameters<Deps["db"]["insert"]>[0] & {
  id: string;
  created_at: string;
  status: Status;
};

export function memoryDeps(secret: string, mail: Deps["mail"], adminKey: string | null = null) {
  const rows: Row[] = [];
  const sends: string[] = [];
  const deps: Deps = {
    secret,
    adminKey,
    db: {
      async byDevice(device) {
        return rows.filter((r) => r.device === device).length;
      },
      async byAddress(ipHash) {
        return sends.filter((s) => s === ipHash).length;
      },
      async waiting() {
        return rows.filter((r) => r.status === "waiting").length;
      },
      async held() {
        return rows.filter((r) => r.status === "waiting");
      },
      async taken() {
        return [...rows];
      },
      async insert(t) {
        if (rows.some((r) => r.device === t.device)) return null;
        const id = randomUUID();
        sends.push(t.ip_hash);
        rows.push({ ...t, id, created_at: new Date().toISOString(), status: "waiting" });
        return id;
      },
      async refund(ipHash) {
        const i = sends.lastIndexOf(ipHash);
        if (i >= 0) sends.splice(i, 1);
      },
      async drop(id) {
        const i = rows.findIndex((r) => r.id === id);
        if (i >= 0) rows.splice(i, 1);
      },
      async get(id) {
        return rows.find((r) => r.id === id) ?? null;
      },
      async approve(id) {
        rows.find((r) => r.id === id)!.status = "up";
      },
      async everything(most) {
        const up = rows.filter((r) => r.status === "up").slice(-most);
        return rows.filter((r) => r.status === "waiting" || up.includes(r));
      },
      async update(id, spot) {
        const r = rows.find((r) => r.id === id);
        if (r) Object.assign(r, spot);
      },
      async insertUp(t) {
        const id = t.id ?? randomUUID();
        if (rows.some((r) => r.id === id || r.device === t.device))
          throw Object.assign(new Error("duplicate"), { code: "23505" });
        rows.push({ ...t, ip_hash: "", id, created_at: t.created_at ?? new Date().toISOString() });
        return id;
      },
      async full(id) {
        return rows.find((r) => r.id === id) ?? null;
      },
      async up(most) {
        return rows.filter((r) => r.status === "up").slice(-most);
      },
      async statuses(ids) {
        return rows.filter((r) => ids.includes(r.id)).map(({ id, status }) => ({ id, status }));
      },
    },
    mail,
  };
  return { rows, sends, deps };
}
