// Calls every URL listed in the URLS env variable, then exits.
// Meant to be run by a Render Cron Job (schedule: */10 * * * *).
// Requires Node 18+ (built-in fetch).

const TIMEOUT_MS = Number(process.env.TIMEOUT_MS) || 30000;
const METHOD = (process.env.METHOD || "GET").toUpperCase();

// URLS can be separated by commas, spaces or new lines
const urls = (process.env.URLS || "")
  .split(/[\s,]+/)
  .map((u) => u.trim())
  .filter(Boolean);

async function callUrl(url) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { method: METHOD, signal: controller.signal });
    const ms = Date.now() - started;
    console.log(`[${new Date().toISOString()}] ${res.status} ${url} (${ms}ms)`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { url, ok: true };
  } catch (err) {
    const ms = Date.now() - started;
    const reason = err.name === "AbortError" ? `timeout after ${TIMEOUT_MS}ms` : err.message;
    console.error(`[${new Date().toISOString()}] FAILED ${url} (${ms}ms): ${reason}`);
    return { url, ok: false };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  if (urls.length === 0) {
    console.error("No URLs found. Set the URLS environment variable.");
    process.exit(1);
  }

  console.log(`Calling ${urls.length} URL(s)...`);
  const results = await Promise.all(urls.map(callUrl));

  const failed = results.filter((r) => !r.ok).length;
  console.log(`Done. ${results.length - failed} succeeded, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
