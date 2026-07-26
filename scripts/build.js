const { execSync } = require('child_process');
const path = require('path');

// Load .env so NEXT_PUBLIC_* variables are available at build time.
// Next.js inlines these into the client bundle — they MUST exist during build.
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  console.log('Loaded .env file for build-time environment variables.');
} catch (e) {
  console.warn('Could not load dotenv:', e.message);
}

console.log('Build script started...');
console.log('OPEN_NEXT_INTERNAL env:', process.env.OPEN_NEXT_INTERNAL);
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK set' : 'MISSING');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'OK set' : 'MISSING');

if (process.env.OPEN_NEXT_INTERNAL) {
  console.log('Running inside OpenNext compiler. Running "npx next build --webpack"...');
  execSync('npx next build --webpack', { stdio: 'inherit' });
} else if (process.env.CF_PAGES || process.env.CLOUDFLARE_BUILD) {
  console.log('Running for Cloudflare. Running "npx opennextjs-cloudflare build"...');
  execSync('npx opennextjs-cloudflare build', { 
    stdio: 'inherit',
    env: { ...process.env, OPEN_NEXT_INTERNAL: 'true' }
  });
} else {
  console.log('Running standard Next.js build for Node/Coolify/VPS. Running "npx next build"...');
  execSync('npx next build', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512', NEXT_TELEMETRY_DISABLED: '1' }
  });
}
