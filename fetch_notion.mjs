// Notion se Daily Log ka data padh kar data.json bana deta hai.
// Isko GitHub Actions chalata hai. Token kabhi code mein mat likho.
import { writeFileSync } from "node:fs";

const TOKEN = process.env.NOTION_TOKEN;
// Aapke "Daily Log" database ka ID (chahein to GitHub variable NOTION_DB_ID se badal sakte hain)
const DB_ID = process.env.NOTION_DB_ID || "41e212f99af38132a8a3ccc3ec784644";

if (!TOKEN) {
  console.error("NOTION_TOKEN missing. GitHub Secrets mein NOTION_TOKEN daalo.");
  process.exit(1);
}

async function queryPage(cursor) {
  const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
  });
  if (!res.ok) {
    throw new Error(`Notion error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

const num = (p) => {
  if (!p) return 0;
  if (p.type === "formula") return p.formula?.number ?? 0;
  if (p.type === "rollup") return p.rollup?.number ?? 0;
  if (p.type === "number") return p.number ?? 0;
  return 0;
};

const days = [];
let cursor;
do {
  const data = await queryPage(cursor);
  for (const page of data.results) {
    const p = page.properties;
    const date = p["Date"]?.date?.start?.slice(0, 10);
    if (!date) continue;
    days.push({
      date,
      name: (p["Name"]?.title ?? []).map((t) => t.plain_text).join(""),
      percent: Math.max(0, Math.min(100, Math.round(num(p["Percent"])))),
      completed: num(p["Completed"]),
      total: num(p["Total"]),
    });
  }
  cursor = data.has_more ? data.next_cursor : undefined;
} while (cursor);

days.sort((a, b) => a.date.localeCompare(b.date));
writeFileSync(
  "data.json",
  JSON.stringify({ updated: new Date().toISOString(), sample: false, days }, null, 2)
);
console.log(`Saved ${days.length} days to data.json`);
