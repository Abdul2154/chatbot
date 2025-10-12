const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
    try {
        console.log('🔄 Connecting to database...');
        
        // Test connection
        const client = await pool.connect();
        console.log('✅ Successfully connected to database');
        client.release();
        
        // Create queries table with image support
        await pool.query(`
            CREATE TABLE IF NOT EXISTS queries (
                id SERIAL PRIMARY KEY,
                query_id VARCHAR(255) UNIQUE NOT NULL,
                user_number VARCHAR(50) NOT NULL,
                region VARCHAR(50) NOT NULL,
                store VARCHAR(100) NOT NULL,
                query_type VARCHAR(50) NOT NULL,
                query_data JSONB NOT NULL,
                image_url TEXT,
                image_public_id VARCHAR(255),
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
                team_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if image columns exist and add them if they don't
        await migrateImageColumns();

        // Create user sessions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                user_number VARCHAR(50) PRIMARY KEY,
                session_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

async function migrateImageColumns() {
    try {
        console.log('🔄 Checking for image columns...');
        
        // Check if columns already exist
        const checkColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'queries' 
            AND column_name IN ('image_url', 'image_public_id')
        `);
        
        const existingColumns = checkColumns.rows.map(row => row.column_name);
        
        if (!existingColumns.includes('image_url')) {
            console.log('➕ Adding image_url column...');
            await pool.query('ALTER TABLE queries ADD COLUMN image_url TEXT');
        }
        
        if (!existingColumns.includes('image_public_id')) {
            console.log('➕ Adding image_public_id column...');
            await pool.query('ALTER TABLE queries ADD COLUMN image_public_id VARCHAR(255)');
        }
        
        console.log('✅ Image columns migration completed');
        
    } catch (error) {
        console.error('❌ Error migrating image columns:', error);
        // Don't throw error - let app continue to run
    }
}

module.exports = { pool, initDatabase };
