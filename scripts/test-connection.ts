import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verify() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const encKey = process.env.ENCRYPTION_KEY;

    if (!url || !key) {
        console.error('❌ Missing Supabase keys in .env.local');
        process.exit(1);
    }

    if (!encKey || encKey.length !== 32) {
        console.error(`❌ Invalid Encryption Key: length is ${encKey?.length}, expected 32.`);
        // process.exit(1); // Proceeding for now to check Supabase
    } else {
        console.log('✅ Encryption Key is valid (32 characters).');
    }

    console.log(`Testing connection to: ${url}`);
    const supabase = createClient(url, key);

    try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Supabase Connection Failed:', error.message);
            process.exit(1);
        }

        console.log('✅ Supabase Connection Successful!');
        console.log('   (Able to query "users" table metadata)');

    } catch (err) {
        console.error('❌ Unexpected Error:', err);
        process.exit(1);
    }
}

verify();
