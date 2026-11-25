// Vercel BotID (Tom 11-25): marks the site's mail sends as a person's; api/contact.ts refuses the rest. The pitch
// pages (/next, /next/front) get the same from tools/pitch/build.mjs.
import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/api/tags", method: "POST" },
    { path: "/api/contact", method: "POST" },
  ],
});
