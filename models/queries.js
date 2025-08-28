const { pool } = require('../config/database');

class QueryModel {
    static async createQuery(userNumber, region, store, queryType, queryData) {
        try {
            // Generate unique query ID
            const queryId = this.generateQueryId();
            
            const result = await pool.query(
                'INSERT INTO queries (query_id, user_number, region, store, query_type, query_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [queryId, userNumber, region, store, queryType, queryData]
            );
            
            // Update user session with current query ID for image uploads
            await pool.query(
                'UPDATE user_sessions SET session_data = session_data || $1 WHERE user_number = $2',
                [JSON.stringify({ currentQueryId: queryId }), userNumber]
            );
            
            console.log(`Query created with ID: ${queryId}`);
            return queryId;
        } catch (error) {
            console.error('Error creating query:', error);
            throw error;
        }
    }
    
    static generateQueryId() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `Q${timestamp.slice(-6)}${random}`;
    }
    
    static async getAllQueries() {
        try {
            const result = await pool.query('SELECT * FROM queries ORDER BY created_at DESC');
            return result.rows;
        } catch (error) {
            console.error('Error fetching queries:', error);
            throw error;
        }
    }
    
    static async getQueriesWithImages() {
        try {
            const result = await pool.query(`
                SELECT DISTINCT q.*, 
                       CASE 
                           WHEN qi.query_id IS NOT NULL THEN true 
                           ELSE false 
                       END as has_images,
                       COUNT(qi.id) as image_count
                FROM queries q 
                LEFT JOIN query_images qi ON q.query_id = qi.query_id 
                GROUP BY q.id, qi.query_id
                ORDER BY q.created_at DESC
            `);
            return result.rows;
        } catch (error) {
            console.error('Error fetching queries with images:', error);
            throw error;
        }
    }
    
    static async getQueriesByStore(store) {
        try {
            const result = await pool.query(`
                SELECT q.*, 
                       COUNT(qi.id) as image_count,
                       CASE 
                           WHEN qi.query_id IS NOT NULL THEN true 
                           ELSE false 
                       END as has_images
                FROM queries q 
                LEFT JOIN query_images qi ON q.query_id = qi.query_id 
                WHERE q.store = $1 
                GROUP BY q.id, qi.query_id
                ORDER BY q.created_at DESC
            `, [store]);
            return result.rows;
        } catch (error) {
            console.error('Error fetching queries by store:', error);
            throw error;
        }
    }
    
    static async getQueriesByRegion(region) {
        try {
            const result = await pool.query(`
                SELECT q.*, 
                       COUNT(qi.id) as image_count,
                       CASE 
                           WHEN qi.query_id IS NOT NULL THEN true 
                           ELSE false 
                       END as has_images
                FROM queries q 
                LEFT JOIN query_images qi ON q.query_id = qi.query_id 
                WHERE q.region = $1 
                GROUP BY q.id, qi.query_id
                ORDER BY q.created_at DESC
            `, [region]);
            return result.rows;
        } catch (error) {
            console.error('Error fetching queries by region:', error);
            throw error;
        }
    }
    
    static async getQueryById(queryId) {
        try {
            const result = await pool.query('SELECT * FROM queries WHERE query_id = $1', [queryId]);
            return result.rows[0];
        } catch (error) {
            console.error('Error fetching query by ID:', error);
            throw error;
        }
    }
    
    static async updateQueryStatus(queryId, status, response = null) {
        try {
            const result = await pool.query(
                'UPDATE queries SET status = $1, team_response = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
                [status, response, queryId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error updating query status:', error);
            throw error;
        }
    }
    
    static async getStoreStats() {
        try {
            const result = await pool.query(`
                SELECT 
                    store, 
                    region,
                    COUNT(*) as total_queries,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_queries,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_queries,
                    COUNT(DISTINCT qi.query_id) as queries_with_images
                FROM queries q
                LEFT JOIN query_images qi ON q.query_id = qi.query_id
                GROUP BY store, region
                ORDER BY total_queries DESC
            `);
            return result.rows;
        } catch (error) {
            console.error('Error fetching store stats:', error);
            throw error;
        }
    }
    
    static async getUniqueStores() {
        try {
            const result = await pool.query(`
                SELECT DISTINCT store, region 
                FROM queries 
                ORDER BY region, store
            `);
            return result.rows;
        } catch (error) {
            console.error('Error fetching unique stores:', error);
            throw error;
        }
    }
    
    static async clearCurrentQueryId(userNumber) {
        try {
            await pool.query(
                'UPDATE user_sessions SET session_data = session_data - $1 WHERE user_number = $2',
                ['currentQueryId', userNumber]
            );
        } catch (error) {
            console.error('Error clearing current query ID:', error);
        }
    }
}

module.exports = QueryModel;
