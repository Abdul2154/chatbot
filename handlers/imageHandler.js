const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { pool } = require('../config/database');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

async function downloadAndSaveImage(mediaUrl, queryId, fileName) {
    try {
        console.log('📥 Downloading image from:', mediaUrl);
        
        const response = await axios({
            method: 'GET',
            url: mediaUrl,
            responseType: 'stream',
            headers: {
                'Authorization': `Bearer ${process.env.TWILIO_AUTH_TOKEN}`
            }
        });

        const timestamp = Date.now();
        const fileExtension = path.extname(fileName) || '.jpg';
        const sanitizedFileName = `${queryId}_${timestamp}${fileExtension}`;
        const filePath = path.join(uploadsDir, sanitizedFileName);

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                try {
                    const fileStats = fs.statSync(filePath);
                    
                    // Save image info to database
                    await pool.query(
                        'INSERT INTO query_images (query_id, image_url, image_name, mime_type, file_size) VALUES ($1, $2, $3, $4, $5)',
                        [queryId, `/uploads/${sanitizedFileName}`, fileName, response.headers['content-type'] || 'image/jpeg', fileStats.size]
                    );
                    
                    console.log('✅ Image saved successfully:', sanitizedFileName);
                    resolve(`/uploads/${sanitizedFileName}`);
                } catch (dbError) {
                    console.error('❌ Database error saving image info:', dbError);
                    reject(dbError);
                }
            });
            writer.on('error', (error) => {
                console.error('❌ Error writing image file:', error);
                reject(error);
            });
        });
    } catch (error) {
        console.error('❌ Error downloading image:', error);
        throw error;
    }
}

async function getQueryImages(queryId) {
    try {
        const result = await pool.query(
            'SELECT * FROM query_images WHERE query_id = $1 ORDER BY uploaded_at DESC',
            [queryId]
        );
        return result.rows;
    } catch (error) {
        console.error('Error fetching query images:', error);
        return [];
    }
}

async function getAllImages() {
    try {
        const result = await pool.query(`
            SELECT qi.*, q.store, q.region, q.user_number, q.query_type, q.created_at as query_created
            FROM query_images qi
            JOIN queries q ON qi.query_id = q.query_id
            ORDER BY qi.uploaded_at DESC
        `);
        return result.rows;
    } catch (error) {
        console.error('Error fetching all images:', error);
        return [];
    }
}

async function getImagesByStore(store) {
    try {
        const result = await pool.query(`
            SELECT qi.*, q.store, q.region, q.user_number, q.query_type, q.created_at as query_created
            FROM query_images qi
            JOIN queries q ON qi.query_id = q.query_id
            WHERE q.store = $1
            ORDER BY qi.uploaded_at DESC
        `, [store]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching images by store:', error);
        return [];
    }
}

async function getImagesByRegion(region) {
    try {
        const result = await pool.query(`
            SELECT qi.*, q.store, q.region, q.user_number, q.query_type, q.created_at as query_created
            FROM query_images qi
            JOIN queries q ON qi.query_id = q.query_id
            WHERE q.region = $1
            ORDER BY qi.uploaded_at DESC
        `, [region]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching images by region:', error);
        return [];
    }
}

module.exports = { 
    downloadAndSaveImage, 
    getQueryImages, 
    getAllImages, 
    getImagesByStore, 
    getImagesByRegion 
};
