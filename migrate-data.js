const { Pool } = require('pg');

// Neon Database (source)
const neonPool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_TYB2KqDutS0U@ep-odd-bush-aeuzt7qm-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

// Railway Database (destination)
const railwayPool = new Pool({
    connectionString: 'postgresql://postgres:xCLuLKXmLXyVsiDhVBOVMFbUDKYPtdUf@shuttle.proxy.rlwy.net:25906/railway',
    ssl: { rejectUnauthorized: false }
});

async function migrateData() {
    try {
        console.log('🔄 Starting data migration from Neon to Railway...\n');

        // 1. Export data from Neon
        console.log('📥 Fetching data from Neon database...');

        const queriesResult = await neonPool.query('SELECT * FROM queries ORDER BY id');
        const sessionsResult = await neonPool.query('SELECT * FROM user_sessions ORDER BY user_number');

        console.log(`✅ Found ${queriesResult.rows.length} queries`);
        console.log(`✅ Found ${sessionsResult.rows.length} user sessions\n`);

        if (queriesResult.rows.length === 0 && sessionsResult.rows.length === 0) {
            console.log('⚠️  No data found in Neon database to migrate.');
            return;
        }

        // 2. Import data into Railway
        console.log('📤 Importing data into Railway database...\n');

        // Import queries
        let queriesImported = 0;
        for (const query of queriesResult.rows) {
            try {
                await railwayPool.query(`
                    INSERT INTO queries (
                        id, query_id, user_number, region, store, query_type,
                        query_data, image_url, image_public_id, status,
                        team_response, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (query_id) DO UPDATE SET
                        user_number = EXCLUDED.user_number,
                        region = EXCLUDED.region,
                        store = EXCLUDED.store,
                        query_type = EXCLUDED.query_type,
                        query_data = EXCLUDED.query_data,
                        image_url = EXCLUDED.image_url,
                        image_public_id = EXCLUDED.image_public_id,
                        status = EXCLUDED.status,
                        team_response = EXCLUDED.team_response,
                        updated_at = EXCLUDED.updated_at
                `, [
                    query.id,
                    query.query_id,
                    query.user_number,
                    query.region,
                    query.store,
                    query.query_type,
                    query.query_data,
                    query.image_url,
                    query.image_public_id,
                    query.status,
                    query.team_response,
                    query.created_at,
                    query.updated_at
                ]);
                queriesImported++;
                console.log(`  ✅ Imported query: ${query.query_id}`);
            } catch (error) {
                console.error(`  ❌ Error importing query ${query.query_id}:`, error.message);
            }
        }

        // Update sequence for queries
        if (queriesResult.rows.length > 0) {
            const maxId = Math.max(...queriesResult.rows.map(r => r.id));
            await railwayPool.query(`SELECT setval('queries_id_seq', $1, true)`, [maxId]);
        }

        // Import user sessions
        let sessionsImported = 0;
        for (const session of sessionsResult.rows) {
            try {
                await railwayPool.query(`
                    INSERT INTO user_sessions (user_number, session_data, created_at, updated_at)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (user_number) DO UPDATE SET
                        session_data = EXCLUDED.session_data,
                        updated_at = EXCLUDED.updated_at
                `, [
                    session.user_number,
                    session.session_data,
                    session.created_at,
                    session.updated_at
                ]);
                sessionsImported++;
                console.log(`  ✅ Imported session: ${session.user_number}`);
            } catch (error) {
                console.error(`  ❌ Error importing session ${session.user_number}:`, error.message);
            }
        }

        console.log('\n✅ Migration Complete!');
        console.log(`📊 Summary:`);
        console.log(`   - Queries migrated: ${queriesImported}/${queriesResult.rows.length}`);
        console.log(`   - Sessions migrated: ${sessionsImported}/${sessionsResult.rows.length}`);

        // 3. Verify migration
        console.log('\n🔍 Verifying data in Railway...');
        const railwayQueries = await railwayPool.query('SELECT COUNT(*) FROM queries');
        const railwaySessions = await railwayPool.query('SELECT COUNT(*) FROM user_sessions');

        console.log(`✅ Railway now has:`);
        console.log(`   - ${railwayQueries.rows[0].count} queries`);
        console.log(`   - ${railwaySessions.rows[0].count} user sessions`);

    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await neonPool.end();
        await railwayPool.end();
        console.log('\n🔚 Database connections closed.');
    }
}

// Run migration
migrateData();
