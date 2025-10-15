const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:xCLuLKXmLXyVsiDhVBOVMFbUDKYPtdUf@shuttle.proxy.rlwy.net:25906/railway',
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM queries');
        const pending = await pool.query("SELECT COUNT(*) FROM queries WHERE status = 'pending'");
        const completed = await pool.query("SELECT COUNT(*) FROM queries WHERE status = 'completed'");
        const sessions = await pool.query('SELECT COUNT(*) FROM user_sessions');

        console.log('\n✅ Railway Database Verification:');
        console.log('==================================');
        console.log(`Total Queries: ${total.rows[0].count}`);
        console.log(`Pending: ${pending.rows[0].count}`);
        console.log(`Completed: ${completed.rows[0].count}`);
        console.log(`User Sessions: ${sessions.rows[0].count}`);
        console.log('==================================\n');

        const recent = await pool.query('SELECT query_id, user_number, query_type, status, created_at FROM queries ORDER BY created_at DESC LIMIT 5');
        console.log('📝 Recent 5 queries:');
        recent.rows.forEach((r, i) => {
            console.log(`${i+1}. ${r.query_id} - ${r.query_type} (${r.status}) - ${new Date(r.created_at).toLocaleString()}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

verify();
