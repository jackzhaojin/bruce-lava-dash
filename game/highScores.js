export function getCurrentPeriods() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const tmp = new Date(Date.UTC(year, now.getMonth(), now.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const weekNum = Math.ceil(((tmp - new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
  return {
    daily: `${year}-${month}-${day}`,
    weekly: `${year}-W${String(weekNum).padStart(2, "0")}`,
    monthly: `${year}-${month}`,
    yearly: `${year}`,
  };
}

export function loadHighScores() {
  try {
    const raw = localStorage.getItem("lavadash_scores");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        allTime: parsed.allTime || 0,
        yearly: parsed.yearly || { period: "", score: 0 },
        monthly: parsed.monthly || { period: "", score: 0 },
        weekly: parsed.weekly || { period: "", score: 0 },
        daily: parsed.daily || { period: "", score: 0 },
      };
    }
  } catch (e) {}
  return {
    allTime: 0,
    yearly: { period: "", score: 0 },
    monthly: { period: "", score: 0 },
    weekly: { period: "", score: 0 },
    daily: { period: "", score: 0 },
  };
}

export function saveHighScores(scores) {
  try {
    localStorage.setItem("lavadash_scores", JSON.stringify(scores));
  } catch (e) {}
}

export function updateHighScores(currentScore) {
  const scores = loadHighScores();
  const periods = getCurrentPeriods();
  const newRecords = [];

  if (currentScore > scores.allTime) {
    scores.allTime = currentScore;
    newRecords.push("allTime");
  }

  for (const cat of ["yearly", "monthly", "weekly", "daily"]) {
    if (scores[cat].period !== periods[cat]) {
      scores[cat] = { period: periods[cat], score: currentScore };
      newRecords.push(cat);
    } else if (currentScore > scores[cat].score) {
      scores[cat].score = currentScore;
      newRecords.push(cat);
    }
  }

  saveHighScores(scores);
  return { scores, newRecords };
}
