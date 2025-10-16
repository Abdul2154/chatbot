const express = require('express');
const router = express.Router();
const QueryModel = require('../models/queries');
const { uploadImage } = require('../config/imgbb');

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

// Upload file from dashboard
router.post('/upload-file', async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.files.file;
        const fileName = `dashboard_${Date.now()}_${file.name}`;

        console.log('📤 Uploading file from dashboard:', fileName);

        // Upload to ImgBB
        const uploadResult = await uploadImage(file.data, fileName);

        console.log('✅ File uploaded successfully:', uploadResult.url);

        res.json({
            success: true,
            url: uploadResult.url,
            public_id: uploadResult.public_id,
            fileName: file.name
        });

    } catch (error) {
        console.error('❌ Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Respond to a query
router.post('/respond', async (req, res) => {
    const { queryId, response, status, fileUrl, fileName } = req.body;

    try {
        // Get query info first
        const query = await QueryModel.getQueryById(queryId);

        if (!query) {
            return res.status(404).json({ error: 'Query not found' });
        }

        // If file is attached, skip the default message and send message with media
        const skipMessage = !!fileUrl;
        await QueryModel.updateQueryResponse(queryId, response, status, skipMessage);

        // If file is attached, send it to the user via WhatsApp
        if (fileUrl) {
            const { sendMessageWithMedia } = require('../utils/twilioClient');
            const statusEmoji = status === 'completed' ? '✅' : '❌';
            const message = `${statusEmoji} Response to your query #${query.query_id}:

${response}

📎 Attached file: ${fileName}

Thank you for using our support system!`;

            await sendMessageWithMedia(query.user_number, message, fileUrl);
            console.log('✅ Response with file sent to user:', query.user_number);
        }

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
