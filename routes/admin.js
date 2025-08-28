const express = require('express');
const router = express.Router();
const QueryModel = require('../models/queries');

// Get all queries with filtering
router.get('/queries', async (req, res) => {
    try {
        const { store, region, status } = req.query;
        const queries = await QueryModel.getAllQueries(store, region, status);
        res.json(queries);
    } catch (error) {
        console.error('Error fetching queries:', error);
        res.status(500).json({ error: 'Failed to fetch queries' });
    }
});

// Get filter options (stores, regions, statuses)
router.get('/filters', async (req, res) => {
    try {
        const filters = await QueryModel.getFilterOptions();
        res.json(filters);
    } catch (error) {
        console.error('Error fetching filters:', error);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
});

// Respond to a query
router.post('/respond', async (req, res) => {
    const { queryId, response, status } = req.body;
    
    try {
        await QueryModel.updateQueryResponse(queryId, response, status);
        res.json({ success: true });
    } catch (error) {
        console.error('Error responding to query:', error);
        res.status(500).json({ error: 'Failed to update query' });
    }
});

// Get query statistics
router.get('/stats', async (req, res) => {
    try {
        const { pool } = require('../config/database');
        
        const [totalResult, pendingResult, completedResult, todayResult] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM queries'),
            pool.query('SELECT COUNT(*) as count FROM queries WHERE status = $1', ['pending']),
            pool.query('SELECT COUNT(*) as count FROM queries WHERE status = $1', ['completed']),
            pool.query('SELECT COUNT(*) as count FROM queries WHERE DATE(created_at) = CURRENT_DATE')
        ]);
        
        res.json({
            total: parseInt(totalResult.rows[0].count),
            pending: parseInt(pendingResult.rows[0].count),
            completed: parseInt(completedResult.rows[0].count),
            today: parseInt(todayResult.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
