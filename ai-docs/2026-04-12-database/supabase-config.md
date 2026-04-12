# Supabase Configuration

## Project

- **Project ID:** `lmbrqiwzowiquebtsfyc`
- **API URL:** `https://lmbrqiwzowiquebtsfyc.supabase.co`
- **Schema:** `bruce_lava_dash`

## Keys

The anon key is a public, client-safe key. Security is enforced by Row Level Security (RLS) policies on the database, not by hiding the key. The key is embedded in `game/supabase.js` — see that file for the actual values.

## Client Setup

See `game/supabase.js` for the `createClient()` call. The `{ db: { schema: "bruce_lava_dash" } }` option is required because our tables live in a custom schema, not `public`.

## Schema Exposure

The `bruce_lava_dash` schema is exposed via:
- Supabase dashboard: Settings > API > Exposed schemas
- SQL: `ALTER ROLE authenticator SET pgrst.db_schemas TO 'public, postal_v2, bruce_lava_dash'`
- Role grants: `GRANT USAGE ON SCHEMA bruce_lava_dash TO anon` + `GRANT SELECT, INSERT ON bruce_lava_dash.scores TO anon`
