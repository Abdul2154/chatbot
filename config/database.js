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

module.exports = { pool, initDatabase };
