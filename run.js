const { JSDOM } = require('jsdom');
const fs = require('fs');

async function localFetch(url) {
  if (url.endsWith('item.json')) {
    const data = await fs.promises.readFile('./item.json', 'utf-8');
    return { ok: true, status: 200, json: async () => JSON.parse(data) };
  } else if (url.endsWith('regions.json')) {
    const data = await fs.promises.readFile('./regions.json', 'utf-8');
    return { ok: true, status: 200, json: async () => JSON.parse(data) };
  }
  throw new Error('Unknown URL: ' + url);
}

async function main() {
  const scriptContent = await fs.promises.readFile('./main.js', 'utf-8');
  const html = `<!DOCTYPE html><html><body>
  <div id="chatMessages"></div>
  <form data-name="Chat Form"></form>
  <script>window.NOFEE_BASE_URL='./';</script>
  <script>${scriptContent}</script>
  </body></html>`;

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/',
    beforeParse(window) { window.fetch = localFetch; }
  });

  await new Promise(res => dom.window.document.addEventListener('DOMContentLoaded', res));

  for (let i = 0; i < 20; i++) {
    const nb = dom.window.NofeeChatbot;
    if (nb && nb.state && Array.isArray(nb.state.phoneData) && nb.state.phoneData.length) {
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  const state = dom.window.NofeeChatbot?.state || {};
  console.log('Phones:', state.phoneData?.length || 0);
  console.log('Regions:', state.regionData?.length || 0);
}

main().catch(err => console.error(err));
