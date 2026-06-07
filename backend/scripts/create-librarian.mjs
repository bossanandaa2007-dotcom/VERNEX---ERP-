/*
Create a test librarian user in Supabase and a matching profile row.

Usage:
  SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_service_key TEST_LIBRARIAN_EMAIL=librarian.test@school.test TEST_LIBRARIAN_PASSWORD=TestPass123! node create-librarian.mjs

This script requires the Supabase service role key to call the Admin API.
*/
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.TEST_LIBRARIAN_EMAIL || 'librarian.test@school.test';
const PASSWORD = process.env.TEST_LIBRARIAN_PASSWORD || 'TestPass123!';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

async function main() {
  console.log('Creating auth user for', EMAIL);

  const createResp = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  });

  const createData = await createResp.json();
  if (!createResp.ok) {
    console.error('Failed to create auth user:', createData);
    process.exit(1);
  }

  const uid = createData.id;
  console.log('Created auth user id:', uid);

  // upsert profile
  const profilePayload = { id: uid, email: EMAIL, name: 'Test Librarian', role: 'Librarian' };
  const profileResp = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(profilePayload),
  });

  const profileData = await profileResp.text();
  if (!profileResp.ok) {
    console.error('Failed to upsert profile:', profileData);
    process.exit(1);
  }

  console.log('Profile upserted. Test librarian ready:');
  console.log('  email:', EMAIL);
  console.log('  password: [set from TEST_LIBRARIAN_PASSWORD]');
  console.log('\nRun the delete script to remove this test user when finished.');
}

main().catch((e) => { console.error(e); process.exit(1); });
