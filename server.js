const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const VOTES_FILE = path.join(__dirname, 'votes.json');

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

// Points: 1st = 5pts, 2nd = 4pts, 3rd = 3pts, 4th = 2pts, 5th = 1pt
const POINTS = [5, 4, 3, 2, 1];

app.post('/api/vote', (req, res) => {
  const { selections } = req.body;

  if (!Array.isArray(selections) || selections.length !== 5) {
    return res.status(400).json({ error: 'You must select exactly 5 players.' });
  }

  const unique = new Set(selections);
  if (unique.size !== 5) {
    return res.status(400).json({ error: 'All 5 selections must be different players.' });
  }

  const data = loadVotes();

  selections.forEach((player, index) => {
    const pts = POINTS[index];
    data.totals[player] = (data.totals[player] || 0) + pts;
  });

  data.voteCount = (data.voteCount || 0) + 1;
  saveVotes(data);

  res.json({ success: true, message: 'Vote recorded!' });
});

app.get('/api/results', (req, res) => {
  const data = loadVotes();
  const sorted = Object.entries(data.totals)
    .sort((a, b) => b[1] - a[1])
    .map(([player, points]) => ({ player, points }));
  res.json({ results: sorted, voteCount: data.voteCount });
});

app.listen(PORT, () => {
  console.log(`Levski Vote app running at http://localhost:${PORT}`);
  console.log(`Results stored in: ${VOTES_FILE}`);
});
