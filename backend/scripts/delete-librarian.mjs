/*
Delete the test librarian created with create-librarian.mjs

Usage:
  SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_service_key TEST_LIBRARIAN_EMAIL=librarian.test@school.test node delete-librarian.mjs

This will remove the auth user and the profile row.
*/
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.TEST_LIBRARIAN_EMAIL || 'librarian.test@school.test';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

async function main() {
  console.log('Finding user by email:', EMAIL);
  const listResp = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });

  const users = await listResp.json();
  if (!listResp.ok) {
    console.error('Failed to list users:', users);
    process.exit(1);
  }

  const user = users.find(u => u.email === EMAIL);
  if (!user) {
    console.log('No auth user found for', EMAIL);
    // attempt to delete profile row anyway
  } else {
    const uid = user.id;
    console.log('Deleting auth user id:', uid);
    const delResp = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users/${uid}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
    });
    if (!delResp.ok) {
      console.error('Failed to delete auth user:', await delResp.text());
    } else {
      console.log('Auth user deleted');
    }
  }

  // delete profile row
  console.log('Deleting profile row if present');
  const delProfile = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles?email=eq.${encodeURIComponent(EMAIL)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });
  if (!delProfile.ok) {
    console.error('Failed to delete profile row:', await delProfile.text());
  } else {
    console.log('Profile row deleted (if existed)');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
