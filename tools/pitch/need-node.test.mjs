import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as nodeModule from "node:module";
import { test } from "node:test";

import { NEED_NODE, nodeProblem } from "./need-node.mjs";

test("an old Node, or one without stripTypeScriptTypes, gets a plain sentence", () => {
  assert.match(
    nodeProblem("20.11.0", false),
    /needs Node 22\.18\.0 or newer, and this is Node 20\.11\.0\. Run: mise install/,
  );
  assert.match(nodeProblem("22.12.0", true), /Node 22\.18\.0 or newer/);
  assert.match(nodeProblem("26.7.0", false), /Node 22\.18\.0 or newer/);
  assert.equal(nodeProblem("22.18.0", true), "");
  assert.equal(nodeProblem("26.7.0", true), "");
});

test("this Node passes, and package.json's engines.node is the same minimum", () => {
  assert.equal(
    nodeProblem(process.versions.node, typeof nodeModule.stripTypeScriptTypes === "function"),
    "",
  );
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.engines?.node, `>=${NEED_NODE}`);
});
