const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { sendMessage } = require('../utils/twilioClient');

class QueryModel {
    static async createQuery(userNumber, region, store, queryType, queryData) {
        const queryId = uuidv4().substr(0, 8).toUpperCase();
        
        try {
            await pool.query(
                'INSERT INTO queries (query_id, user_number, region, store, query_type, query_data) VALUES ($1, $2, $3, $4, $5, $6)',
                [queryId, userNumber, region, store, queryType, JSON.stringify(queryData)]
            );

            await this.notifyTeam(queryId, userNumber, region, store, queryType, queryData);
            return queryId;
        } catch (error) {
            console.error('Error creating query:', error);
            throw error;
        }
    }

    static async notifyTeam(queryId, userNumber, region, store, queryType, queryData) {
        const teamNumbers = process.env.TEAM_NUMBERS ? process.env.TEAM_NUMBERS.split(',') : [];
        
        const message = `🚨 NEW QUERY RECEIVED

Query ID: ${queryId}
User: ${userNumber}
Store: ${store} (${region})
Type: ${queryType}

Details: ${JSON.stringify(queryData, null, 2)}

Please respond via admin panel: http://localhost:${process.env.PORT || 3000}`;

        for (const teamNumber of teamNumbers) {
            try {
                await sendMessage(teamNumber.trim(), message);
            } catch (error) {
                console.error('Error notifying team member:', teamNumber, error);
            }
        }
    }

    static async getAllQueries() {
        try {
            const result = await pool.query('SELECT * FROM queries ORDER BY created_at DESC');
            return result.rows;
        } catch (error) {
            console.error('Error getting queries:', error);
            throw error;
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
