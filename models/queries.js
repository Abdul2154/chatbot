const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { sendMessage } = require('../utils/twilioClient');

class QueryModel {
    static async createQuery(userNumber, region, store, queryType, queryData, imageUrl = null, imagePublicId = null) {
        const queryId = uuidv4().substr(0, 8).toUpperCase();
        
        try {
            await pool.query(
                'INSERT INTO queries (query_id, user_number, region, store, query_type, query_data, image_url, image_public_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [queryId, userNumber, region, store, queryType, JSON.stringify(queryData), imageUrl, imagePublicId]
            );

            // Notify team about new query
            await this.notifyTeam(queryId, userNumber, region, store, queryType, queryData, imageUrl);
            
            return queryId;
        } catch (error) {
            console.error('Error creating query:', error);
            throw error;
        }
    }

    static async notifyTeam(queryId, userNumber, region, store, queryType, queryData, imageUrl = null) {
        const teamNumbers = process.env.TEAM_NUMBERS ? process.env.TEAM_NUMBERS.split(',') : [];
        
        let message = `🚨 NEW QUERY RECEIVED

Query ID: ${queryId}
User: ${userNumber}
Store: ${store} (${region})
Type: ${queryType}

Details: ${JSON.stringify(queryData, null, 2)}`;

        if (imageUrl) {
            message += `\n\n📷 Image attached: ${imageUrl}`;
        }

        message += `\n\nRespond via admin panel: ${process.env.RAILWAY_STATIC_URL || 'http://localhost:3000'}`;

        for (const teamNumber of teamNumbers) {
            try {
                await sendMessage(teamNumber.trim(), message);
                console.log(`✅ Team notification sent to: ${teamNumber}`);
            } catch (error) {
                console.error('Error notifying team member:', teamNumber, error);
            }
        }
    }

    static async getAllQueries(store = null, region = null, status = null) {
        try {
            let query = 'SELECT * FROM queries WHERE 1=1';
            let params = [];
            let paramIndex = 1;
            
            if (store && store !== 'all') {
                query += ` AND store = $${paramIndex}`;
                params.push(store);
                paramIndex++;
            }
            
            if (region && region !== 'all') {
                query += ` AND region = $${paramIndex}`;
                params.push(region);
                paramIndex++;
            }
            
            if (status && status !== 'all') {
                query += ` AND status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }
            
            query += ' ORDER BY created_at DESC';
            
            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting queries:', error);
            throw error;
        }
    }
    
    static async getFilterOptions() {
        try {
            const [storesResult, regionsResult] = await Promise.all([
                pool.query('SELECT DISTINCT store FROM queries ORDER BY store'),
                pool.query('SELECT DISTINCT region FROM queries ORDER BY region')
            ]);
            
            return {
                stores: storesResult.rows.map(row => row.store),
                regions: regionsResult.rows.map(row => row.region),
                statuses: ['pending', 'in_progress', 'completed', 'rejected']
            };
        } catch (error) {
            console.error('Error getting filter options:', error);
            return { stores: [], regions: [], statuses: ['pending', 'in_progress', 'completed', 'rejected'] };
        }
    }

    static async updateQueryResponse(queryId, response, status) {
        try {
            const result = await pool.query(
                'UPDATE queries SET team_response = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
                [response, status, queryId]
            );

            if (result.rowCount > 0) {
                const query = result.rows[0];
                const statusEmoji = status === 'completed' ? '✅' : '❌';
                const userMessage = `${statusEmoji} Response to your query #${query.query_id}:

${response}

Thank you for using our support system!`;

                await sendMessage(query.user_number, userMessage);
                console.log(`✅ Response sent to user: ${query.user_number}`);
            }

            return result;
        } catch (error) {
            console.error('Error updating query response:', error);
            throw error;
        }
    }

    static async getQueryByNumber(userNumber) {
        try {
            const result = await pool.query(
                'SELECT * FROM queries WHERE user_number = $1 ORDER BY created_at DESC LIMIT 5',
                [userNumber]
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting user queries:', error);
            throw error;
        }
    }
}

module.exports = QueryModel;
