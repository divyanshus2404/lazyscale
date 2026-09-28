// Public front-end config. The anon key is designed to be public (it only ever
// acts as an anonymous user, and every table is protected by row-level
// security), so shipping it to the browser is expected, not a leak. Without it
// set, the sign-in page shows the access-key fallback instead of social login.

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null
  });
}
