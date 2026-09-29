import { verifyBearer } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // 1. Verify the user is actually signed in with Supabase
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return res.status(401).json({ ok: false, error: 'Not signed in.' });
  
  const user = await verifyBearer(bearer);
  if (!user || !user.email) return res.status(401).json({ ok: false, error: 'Invalid or expired session.' });

  // 2. Read the signup form data
  const { name, vertical } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ ok: false, error: 'Business name is required.' });
  }

  // 3. Generate secure tokens and a unique key
  const crypto = await import('node:crypto');
  const accessToken = crypto.randomBytes(24).toString('base64url');
  
  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const key = (cleanName || 'biz') + '_' + crypto.randomBytes(4).toString('hex');

  const row = {
    key,
    name: name.trim().slice(0, 100),
    vertical: vertical || 'general',
    accessToken,
    ownerEmail: user.email,
    members: [],
    config: {}
  };

  // 4. Insert into the Supabase tenants table
  const url = process.env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/tenants';
  const apikey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { 
    apikey, 
    Authorization: `Bearer ${apikey}`, 
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  try {
    const insertRes = await fetch(url, { method: 'POST', headers, body: JSON.stringify(row) });
    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('Signup failed:', errText);
      return res.status(500).json({ ok: false, error: 'Failed to create business account. Please try again.' });
    }
    return res.status(200).json({ ok: true, tenant: key });
  } catch (e) {
    console.error('Signup exception:', e);
    return res.status(500).json({ ok: false, error: 'Internal server error during signup.' });
  }
}
