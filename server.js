const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const VOTES_FILE = path.join(__dirname, 'votes.json');

const COOKIE_NAME = 'levski_voted';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  const match = header.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return match ? match.split('=')[1] : null;
}

function setCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=1; Max-Age=${COOKIE_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax`);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function loadVotes() {
  if (!fs.existsSync(VOTES_FILE)) {
    fs.writeFileSync(VOTES_FILE, JSON.stringify({ totals: {}, voteCount: 0 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(VOTES_FILE, 'utf8'));
}

function saveVotes(data) {
  fs.writeFileSync(VOTES_FILE, JSON.stringify(data, null, 2));
}

const POINTS = [5, 4, 3, 2, 1];

app.get('/api/check-voted', (req, res) => {
  res.json({ voted: !!getCookie(req, COOKIE_NAME) });
});

app.post('/api/vote', (req, res) => {
  if (getCookie(req, COOKIE_NAME)) {
    return res.status(403).json({ error: 'Вече сте гласували. Може да гласувате само веднъж.' });
  }

  const { selections } = req.body;

  if (!Array.isArray(selections) || selections.length !== 5) {
    return res.status(400).json({ error: 'Трябва да изберете точно 5 играча.' });
  }

  const unique = new Set(selections);
  if (unique.size !== 5) {
    return res.status(400).json({ error: 'Всичките 5 играча трябва да са различни.' });
  }

  const data = loadVotes();

  selections.forEach((player, index) => {
    data.totals[player] = (data.totals[player] || 0) + POINTS[index];
  });

  data.voteCount = (data.voteCount || 0) + 1;
  saveVotes(data);

  setCookie(res);
  res.json({ success: true, message: 'Гласът е записан!' });
});

app.get('/api/results', (req, res) => {
  const data = loadVotes();
  const sorted = Object.entries(data.totals)
    .sort((a, b) => b[1] - a[1])
    .map(([player, points]) => ({ player, points }));
  res.json({ results: sorted, voteCount: data.voteCount });
});

app.get('/api/download-results', (req, res) => {
  const data = loadVotes();
  const sorted = Object.entries(data.totals)
    .sort((a, b) => b[1] - a[1])
    .map(([player, points]) => ({ player, points }));
  const export_data = { voteCount: data.voteCount, results: sorted, exportedAt: new Date().toISOString() };
  res.setHeader('Content-Disposition', 'attachment; filename="levski-vote-results.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(export_data, null, 2));
});

app.listen(PORT, () => {
  console.log(`Levski Vote app running on port ${PORT}`);
  console.log(`Results stored in: ${VOTES_FILE}`);
});
