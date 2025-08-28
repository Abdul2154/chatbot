const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
    try {
        // Existing queries table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS queries (
                id SERIAL PRIMARY KEY,
                query_id VARCHAR(255) UNIQUE NOT NULL,
                user_number VARCHAR(50) NOT NULL,
                region VARCHAR(50) NOT NULL,
                store VARCHAR(100) NOT NULL,
                query_type VARCHAR(50) NOT NULL,
                query_data JSONB NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
                team_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // New table for storing images
        await pool.query(`
            CREATE TABLE IF NOT EXISTS query_images (
                id SERIAL PRIMARY KEY,
                query_id VARCHAR(255) REFERENCES queries(query_id),
                image_url TEXT NOT NULL,
                image_name VARCHAR(255),
                mime_type VARCHAR(100),
                file_size INTEGER,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Existing user_sessions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                user_number VARCHAR(50) PRIMARY KEY,
                session_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Index for better performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_query_images_query_id ON query_images(query_id);
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_queries_store ON queries(store);
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_queries_region ON queries(region);
        `);

        console.log('✅ Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

module.exports = { pool, initDatabase };
