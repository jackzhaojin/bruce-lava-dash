import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://lmbrqiwzowiquebtsfyc.supabase.co",
  "sb_publishable_h9_wRaCTKlXYfSlXN159AQ__3ZBZSIE",
  { db: { schema: "bruce_lava_dash" } }
);
