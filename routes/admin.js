const express = require('express');
const router = express.Router();
const QueryModel = require('../models/queries');

// Get all queries
router.get('/queries', async (req, res) => {
    try {
        const queries = await QueryModel.getAllQueries();
        res.json(queries);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch queries' });
    }
});

// Respond to a query
router.post('/respond', async (req, res) => {
    const { queryId, response, status } = req.body;
    
    try {
        await QueryModel.updateQueryResponse(queryId, response, status);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update query' });
    }
});

module.exports = router;
