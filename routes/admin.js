const express = require('express');
const router = express.Router();
const QueryModel = require('../models/queries');
const { sendMessage } = require('../utils/twilioClient');
const { getAllImages, getImagesByStore, getImagesByRegion, getQueryImages } = require('../utils/imageHandler');

// Get all queries
router.get('/queries', async (req, res) => {
    try {
        const queries = await QueryModel.getQueriesWithImages();
        res.json(queries);
    } catch (error) {
        console.error('Error fetching queries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get queries by store
router.get('/queries/store/:store', async (req, res) => {
    try {
        const { store } = req.params;
        const queries = await QueryModel.getQueriesByStore(store);
        res.json(queries);
    } catch (error) {
        console.error('Error fetching queries by store:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get queries by region
router.get('/queries/region/:region', async (req, res) => {
    try {
        const { region } = req.params;
        const queries = await QueryModel.getQueriesByRegion(region);
        res.json(queries);
    } catch (error) {
        console.error('Error fetching queries by region:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all images
router.get('/images', async (req, res) => {
    try {
        const images = await getAllImages();
        res.json(images);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get images by store
router.get('/images/store/:store', async (req, res) => {
    try {
        const { store } = req.params;
        const images = await getImagesByStore(store);
        res.json(images);
    } catch (error) {
        console.error('Error fetching images by store:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get images by region
router.get('/images/region/:region', async (req, res) => {
    try {
        const { region } = req.params;
        const images = await getImagesByRegion(region);
        res.json(images);
    } catch (error) {
        console.error('Error fetching images by region:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get images for specific query
router.get('/images/query/:queryId', async (req, res) => {
    try {
        const { queryId } = req.params;
        const images = await getQueryImages(queryId);
        res.json(images);
    } catch (error) {
        console.error('Error fetching query images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get store statistics
router.get('/stores/stats', async (req, res) => {
    try {
        const stats = await QueryModel.getStoreStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching store stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get unique stores
router.get('/stores', async (req, res) => {
    try {
        const stores = await QueryModel.getUniqueStores();
        res.json(stores);
    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Respond to query
router.post('/respond', async (req, res) => {
    try {
        const { queryId, response, status } = req.body;
        
        if (!queryId || !response || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Update query status and response
        const updatedQuery = await QueryModel.updateQueryStatus(queryId, status, response);
        
        if (!updatedQuery) {
            return res.status(404).json({ error: 'Query not found' });
        }
        
        // Send response to user via WhatsApp
        const responseMessage = `Update on your query #${updatedQuery.query_id}:

${response}

Status: ${status.charAt(0).toUpperCase() + status.slice(1)}

Thank you for using our support system!`;
        
        await sendMessage(updatedQuery.user_number, responseMessage);
        
        res.json({ message: 'Response sent successfully', query: updatedQuery });
        
    } catch (error) {
        console.error('Error sending response:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const queries = await QueryModel.getAllQueries();
        const images = await getAllImages();
        
        const stats = {
            totalQueries: queries.length,
            totalImages: images.length,
            pendingQueries: queries.filter(q => q.status === 'pending').length,
            completedQueries: queries.filter(q => q.status === 'completed').length,
            queriesWithImages: [...new Set(images.map(img => img.query_id))].length,
            todayQueries: queries.filter(q => {
                const today = new Date().toDateString();
                return new Date(q.created_at).toDateString() === today;
            }).length,
            storeBreakdown: queries.reduce((acc, query) => {
                const key = `${query.store} (${query.region})`;
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {}),
            queryTypeBreakdown: queries.reduce((acc, query) => {
                acc[query.query_type] = (acc[query.query_type] || 0) + 1;
                return acc;
            }, {})
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
