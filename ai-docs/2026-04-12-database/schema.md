# Database Schema: `bruce_lava_dash`

## Overview

The `bruce_lava_dash` schema stores game data for the Lava Dash game. It uses an append-only design — scores are inserted and never modified or deleted via the API.

## Tables

### `"bruce_lava_dash".scores`

Append-only log of every game score submitted. Used to build leaderboards across time periods (daily, weekly, monthly, yearly, all-time).

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | `BIGINT` | NO | auto-increment (GENERATED ALWAYS AS IDENTITY) | PRIMARY KEY |
| `player_name` | `TEXT` | NO | — | `char_length(player_name) BETWEEN 1 AND 30` |
| `score` | `INTEGER` | NO | — | `score >= 0` |
| `player_mode` | `SMALLINT` | NO | — | `player_mode IN (1, 2)` — single player or 2-player co-op |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | auto-set on insert |

#### Indexes

| Name | Columns | Purpose |
|---|---|---|
| `idx_scores_created_at_score` | `(created_at DESC, score DESC)` | Fast leaderboard queries filtered by time period |
| `idx_scores_score_desc` | `(score DESC)` | Fast all-time top scores lookup |

#### Row Level Security (RLS)

RLS is **enabled**. Policies apply to the `anon` role (unauthenticated client-side access):

| Policy | Operation | Rule | Effect |
|---|---|---|---|
| `scores_select` | `SELECT` | `USING (true)` | Anyone can read all scores |
| `scores_insert` | `INSERT` | `WITH CHECK (true)` | Anyone can insert new scores |
| *(none)* | `UPDATE` | — | **Blocked** — no policy exists, so updates are denied |
| *(none)* | `DELETE` | — | **Blocked** — no policy exists, so deletes are denied |

#### Example Queries

**Insert a score:**
```sql
INSERT INTO "bruce_lava_dash".scores (player_name, score, player_mode)
VALUES ('Bruce', 1250, 1);
```

**Top 10 all-time:**
```sql
SELECT player_name, score, player_mode, created_at
FROM "bruce_lava_dash".scores
ORDER BY score DESC
LIMIT 10;
```

**Top 10 today:**
```sql
SELECT player_name, score, player_mode, created_at
FROM "bruce_lava_dash".scores
WHERE created_at >= CURRENT_DATE
ORDER BY score DESC
LIMIT 10;
```

**Top 10 this week (Monday start):**
```sql
SELECT player_name, score, player_mode, created_at
FROM "bruce_lava_dash".scores
WHERE created_at >= date_trunc('week', CURRENT_DATE)
ORDER BY score DESC
LIMIT 10;
```

**Top 10 this month:**
```sql
SELECT player_name, score, player_mode, created_at
FROM "bruce_lava_dash".scores
WHERE created_at >= date_trunc('month', CURRENT_DATE)
ORDER BY score DESC
LIMIT 10;
```

**Top 10 this year:**
```sql
SELECT player_name, score, player_mode, created_at
FROM "bruce_lava_dash".scores
WHERE created_at >= date_trunc('year', CURRENT_DATE)
ORDER BY score DESC
LIMIT 10;
```

## Migration History

| Date | Migration Name | Description |
|---|---|---|
| 2026-04-12 | `create_bruce_schema_and_scores_table` | Created `bruce` schema, `scores` table, indexes, and RLS policies |
| 2026-04-12 | `rename_schema_to_bruce_lava_dash` | Renamed schema from `bruce` to `bruce_lava_dash` |
| 2026-04-12 | `rename_schema_to_underscores` | Renamed schema from `bruce-lava-dash` to `bruce_lava_dash` (hyphens caused PostgREST issues) |
| 2026-04-12 | `seed_initial_high_scores` | Seeded 6 initial scores migrated from localStorage |
| 2026-04-12 | *(manual SQL)* | `GRANT USAGE ON SCHEMA` + `GRANT SELECT, INSERT ON TABLE` to `anon` and `authenticated` roles |

## Seed Data

Initial scores migrated from the game's localStorage high scores:

| Score | Player | Date | Purpose |
|---|---|---|---|
| 7917 | Bruce & Dad | 2026-04-01 | All-time / Yearly / Monthly high score |
| 7214 | Bruce & Dad | 2026-04-08 | Weekly high score |
| 5200 | Bruce & Dad | 2026-04-03 | Historical run |
| 3800 | Bruce & Dad | 2026-04-09 | Historical run |
| 146 | Bruce & Dad | 2026-04-12 | Daily high score |
| 82 | Bruce & Dad | 2026-04-12 | Historical run |

## Design Decisions

- **Append-only:** Scores are never updated or deleted. This provides a complete audit trail and prevents tampering via the public API.
- **Custom schema (`bruce_lava_dash`):** Keeps game tables separate from the default `public` schema. Exposed via PostgREST config.
- **`player_name` default:** The game currently does not prompt for a name. Client defaults to `"Bruce & Dad"` on insert.
- **`player_mode`:** Tracks whether the score was from a 1-player or 2-player game, so leaderboards can be filtered by mode if desired.
