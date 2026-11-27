import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DESCRIPTION,
  FRONT_TITLE,
  NOINDEX,
  PRIVATE_PATHS,
  PUBLIC_PAGES,
  SHARE_IMAGE,
  pageTitle,
  personJsonLd,
  personJsonLdText,
  themeColor,
  tokenColour,
} from "./head.ts";
import { inlineHashes } from "../../tools/csp/manifest.mjs";
import { ico, SIZES } from "../../tools/icons/favicon.mjs";

const read = (path: string) => readFileSync(path, "utf8");

test("the description is Tom's text, and it is written in one place", () => {
  assert.equal(
    DESCRIPTION,
    "Tom Larsson, product engineer from Sweden. I build and run web and mobile products myself, from sketch to live, with AI in the work every day.",
  );
  assert.equal(FRONT_TITLE, "Tom Larsson, product engineer");
  const front = read("app/page.tsx");
  assert.doesNotMatch(front, /product engineer from/); // no second copy
  assert.match(front, /twitter: \{ card: "summary_large_image", title, description \}/);
  assert.match(front, /openGraph: \{[\s\S]*title,\s*description,/);
});

test("the JSON-LD block is valid JSON with exactly the approved fields", () => {
  const block = JSON.parse(personJsonLdText());
  assert.deepEqual(block, {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Tom Larsson",
    jobTitle: "Product engineer",
    url: "https://ttdevs.com",
    image: SHARE_IMAGE,
    address: { "@type": "PostalAddress", addressCountry: "SE" },
    sameAs: ["https://github.com/tlxq", "https://linkedin.com/in/tlxq"],
  });
  assert.equal(SHARE_IMAGE, "https://ttdevs.com/share.jpg");
  assert.deepEqual(Object.keys(block).sort(), [
    "@context",
    "@type",
    "address",
    "image",
    "jobTitle",
    "name",
    "sameAs",
    "url",
  ]);
  const hosts = block.sameAs.map((u: string) => new URL(u).hostname).sort();
  assert.deepEqual(hosts, ["github.com", "linkedin.com"]);
  assert.doesNotMatch(personJsonLdText(), /mailto|email|[\w.]+@[\w.]+/i);
  assert.doesNotMatch(personJsonLdText(), /</); // can never close its own tag
});

test("the block is data for the CSP: it needs no hash, and the front page carries it once", () => {
  const html = `<script type="application/ld+json">${personJsonLdText()}</script>`;
  assert.deepEqual(inlineHashes(html), []);
  assert.equal((read("app/page.tsx").match(/application\/ld\+json/g) ?? []).length, 1);
  assert.doesNotMatch(read("app/layout.tsx"), /ld\+json/);
});

test("the person's profile links come from the site's own content", () => {
  assert.deepEqual(
    personJsonLd().sameAs,
    ["github.com/tlxq", "linkedin.com/in/tlxq"].map((p) => "https://" + p),
  );
  assert.match(read("src/content/look.ts"), /"https:\/\/linkedin\.com\/in\/tlxq"/);
});

test("every other page is 'Page · Tom Larsson'", () => {
  assert.equal(pageTitle("Privacy"), "Privacy · Tom Larsson");
  for (const [file, name] of [
    ["app/privacy/page.tsx", "Privacy"],
    ["app/admin/page.tsx", "Sign in"],
    ["app/wall/page.tsx", "The wall"],
    ["app/not-found.tsx", "Page not found"],
  ] as const) {
    assert.match(read(file), new RegExp(`title: pageTitle\\("${name}"\\)`), file);
  }
});

test("private pages say noindex, and no private path is in the sitemap list", () => {
  assert.deepEqual(NOINDEX, { index: false, follow: false });
  for (const file of ["app/admin/page.tsx", "app/wall/page.tsx"]) {
    assert.match(read(file), /robots: NOINDEX/, file);
  }
  const headers: { source: string; headers: { key: string; value: string }[] }[] = JSON.parse(
    read("vercel.json"),
  ).headers;
  for (const source of ["/admin", "/next(.*)"]) {
    const rule = headers.find((h) => h.source === source);
    assert.match(
      rule?.headers.find((h) => h.key === "X-Robots-Tag")?.value ?? "",
      /noindex/,
      source,
    );
  }
  assert.deepEqual([...PUBLIC_PAGES], ["/", "/privacy"]);
  for (const page of PUBLIC_PAGES as readonly string[]) {
    assert.ok(!PRIVATE_PATHS.some((p) => page === p || page.startsWith(p + "/")), page);
  }
  assert.match(
    read("app/sitemap.ts"),
    /PUBLIC_PAGES\.map\(\(path\) => \(\{ url: SITE \+ path \}\)\)/,
  );
});

test("the bar's colour is the page's ground, read from tokens.css", () => {
  assert.equal(tokenColour(":root { --a: #123abc; }", "--a"), "#123abc");
  assert.throws(() => tokenColour(":root {}", "--a"));
  assert.equal(themeColor(), tokenColour(read("src/design/tokens.css"), "--look-ground"));
  assert.match(read("app/layout.tsx"), /themeColor: themeColor\(\)/);
});

test("favicon.ico holds the 16, 32 and 48 px pictures, linked and cached", () => {
  assert.deepEqual(SIZES, [16, 32, 48]);
  const file = readFileSync("public/favicon.ico");
  assert.deepEqual([...file.subarray(0, 6)], [0, 0, 1, 0, 3, 0]);
  const sizes = [0, 1, 2].map((i) => file[6 + 16 * i]);
  assert.deepEqual(sizes, [16, 32, 48]);
  for (let i = 0; i < 3; i++) {
    const at = file.readUInt32LE(6 + 16 * i + 12);
    assert.equal(file.subarray(at + 1, at + 4).toString(), "PNG");
  }
  // the packer round-trips: a made file has the same layout
  const png = Buffer.from("\x89PNG-test");
  assert.equal(ico(SIZES.map((size) => ({ size, png }))).readUInt16LE(4), 3);
  assert.match(read("app/layout.tsx"), /url: "\/favicon\.ico"/);
  const rule = JSON.parse(read("vercel.json")).headers.find(
    (h: { source: string }) => h.source === "/favicon.ico",
  );
  assert.match(JSON.stringify(rule), /max-age=604800/);
});
