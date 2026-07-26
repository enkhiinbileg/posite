
import { getCDNUrl } from './src/lib/storage-utils';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://jtlwllaxscxqtcoqpll.supabase.co';
process.env.NEXT_PUBLIC_CDN_DOMAIN = 'https://dry-truth-8017.artmongolian1.workers.dev';
process.env.NEXT_PUBLIC_R2_PUBLIC_URL = 'https://pub-153c22e6ca2e4d61b33d4768e4f97534.r2.dev';

const supabaseUrl = 'https://jtlwllaxscxqtcoqpll.supabase.co/storage/v1/object/public/webtoons/60/cover.webp';
const cdnUrl = 'https://dry-truth-8017.artmongolian1.workers.dev/storage/v1/object/public/webtoons/60/cover.webp';

console.log('Original ->', supabaseUrl);
console.log('Processed (Supabase) ->', getCDNUrl(supabaseUrl));
console.log('Processed (CDN) ->', getCDNUrl(cdnUrl));
console.log('Processed (With Width) ->', getCDNUrl(supabaseUrl, { width: 300 }));
