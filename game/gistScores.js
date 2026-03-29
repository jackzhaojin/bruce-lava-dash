const GIST_ID = import.meta.env.VITE_GIST_ID;
const GIST_TOKEN = import.meta.env.VITE_GIST_TOKEN;
const FILENAME = 'highscores.json';
const API_URL = `https://api.github.com/gists/${GIST_ID}`;

export const gistEnabled = !!(GIST_ID && GIST_TOKEN);

export async function getScores() {
  const res = await fetch(API_URL, {
    headers: {
      Authorization: `token ${GIST_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch scores: ${res.status}`);
  const gist = await res.json();
  return JSON.parse(gist.files[FILENAME].content);
}

async function saveScores(scores) {
  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${GIST_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      files: {
        [FILENAME]: {
          content: JSON.stringify(scores, null, 2),
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Failed to save scores: ${res.status}`);
  return res.json();
}

export async function submitScore(name, score) {
  const scores = await getScores();

  scores.push({
    name,
    score,
    date: new Date().toISOString(),
  });

  // Keep top 50 sorted descending
  scores.sort((a, b) => b.score - a.score);
  scores.splice(50);

  await saveScores(scores);
  return scores;
}
