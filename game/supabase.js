import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://lmbrqiwzowiquebtsfyc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtYnJxaXd6b3dpcXVlYnRzZnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTcxNDEsImV4cCI6MjA4NTczMzE0MX0._8IMnpNnmufqwEw-PcSV84ilTcv-NmbmuKRheEomhaQ",
  { db: { schema: "bruce_lava_dash" } }
);
