// Ask My Site — minimal FAQ chatbot server. No dependencies, no API keys.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const KB_PATH = process.env.KNOWLEDGE_FILE || path.join(__dirname, 'knowledge.md');
const STOP = new Set('a an the is are was do does did i you your my me we our of to in on for and or how what who when where why can it this that with be any'.split(' '));

const tokenize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));

function loadKnowledge() {
  const text = fs.readFileSync(KB_PATH, 'utf8');
  const sections = text.split(/^##\s+/m).slice(1).map((chunk) => {
    const [title, ...body] = chunk.split('\n');
    return { title: title.trim(), answer: body.join('\n').trim() };
  });
  const docs = sections.map((s) => tokenize(s.title + ' ' + s.title + ' ' + s.answer));
  const df = {};
  docs.forEach((d) => new Set(d).forEach((w) => (df[w] = (df[w] || 0) + 1)));
  const idf = (w) => Math.log((docs.length + 1) / ((df[w] || 0) + 1)) + 1;
  return { sections, docs, idf };
}

let kb = loadKnowledge();

function answer(question) {
  const q = tokenize(question);
  let best = { score: 0, i: -1 };
  kb.docs.forEach((d, i) => {
    const tf = {};
    d.forEach((w) => (tf[w] = (tf[w] || 0) + 1));
    const score = q.reduce((s, w) => s + (tf[w] ? (tf[w] / d.length) * kb.idf(w) : 0), 0);
    if (score > best.score) best = { score, i };
  });
  if (best.i < 0) return { answer: "Sorry, I don't know that yet. Try asking another way.", source: null };
  const s = kb.sections[best.i];
  return { answer: s.answer, source: s.title, score: +best.score.toFixed(3) };
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/ask') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e4) req.destroy(); });
    req.on('end', () => {
      try {
        const { question } = JSON.parse(body || '{}');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(answer(String(question || ''))));
      } catch {
        res.writeHead(400); res.end('{"error":"bad request"}');
      }
    });
    return;
  }
  const pathname = req.url.split('?')[0];
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return fs.createReadStream(path.join(__dirname, 'public', 'index.html')).pipe(res);
  }
  res.writeHead(404); res.end('Not found');
});

if (require.main === module) {
  fs.watchFile(KB_PATH, () => { kb = loadKnowledge(); console.log('knowledge reloaded'); });
  server.listen(PORT, () => console.log(`Ask My Site running at http://localhost:${PORT}`));
}
module.exports = { answer };
