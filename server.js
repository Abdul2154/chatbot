const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
require('dotenv').config();
const messageHandler = require('./handlers/messageHandler');
const adminRoutes = require('./routes/admin');
const { initDatabase } = require('./config/database');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors());
app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    abortOnLimit: true
}));
app.use(express.static('public'));

// Initialize database
initDatabase();

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        features: ['image_upload', 'store_filtering', 'imgbb']
    });
});

// Webhook endpoint for WhatsApp with image support
app.post('/webhook', async (req, res) => {
    const incomingMessage = req.body.Body || '';
    const senderNumber = req.body.From;
    const mediaUrl = req.body.MediaUrl0;
    const mediaContentType = req.body.MediaContentType0;
    
    console.log(`📱 Received message: ${incomingMessage} from ${senderNumber}`);
    
    if (mediaUrl) {
        console.log(`📷 Image received: ${mediaUrl}, Type: ${mediaContentType}`);
    }
    
    try {
        await messageHandler.handleMessage(incomingMessage, senderNumber, mediaUrl, mediaContentType);
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error handling message:', error);
        res.sendStatus(500);
    }
});

// Admin panel routes
app.use('/admin', adminRoutes);

// Serve the professional dashboard
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

// Old dashboard (backup) - remove this entire section if not needed
app.get('/old-dashboard', (req, res) => {
    const baseUrl = process.env.RAILWAY_STATIC_URL || `http://localhost:${port}`;

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>WhatsApp Chatbot Admin Panel</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                /* Keep all existing styles and add these for images */
                
                .query-image {
                    margin: 15px 0;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                
                .query-image img {
                    max-width: 300px;
                    max-height: 200px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    cursor: pointer;
                    transition: transform 0.2s ease;
                }
                
                .query-image img:hover {
                    transform: scale(1.05);
                }
                
                .image-label {
                    font-weight: 600;
                    color: #4a5568;
                    margin-bottom: 8px;
                    display: block;
                }
                
                .no-image {
                    color: #9ca3af;
                    font-style: italic;
                    padding: 10px;
                    text-align: center;
                    background: #f9fafb;
                    border-radius: 6px;
                }
                
                .image-modal {
                    display: none;
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.9);
                    cursor: pointer;
                }
                
                .image-modal img {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    max-width: 90%;
                    max-height: 90%;
                    border-radius: 8px;
                }
                
                .image-modal .close-btn {
                    position: absolute;
                    top: 20px;
                    right: 30px;
                    color: white;
                    font-size: 40px;
                    font-weight: bold;
                    cursor: pointer;
                    z-index: 1001;
                }
                
                .image-modal .close-btn:hover {
                    color: #ff6b6b;
                }
                
                /* All your existing CSS styles here... */
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f8fafc; 
                    color: #1a202c;
                }
                
                .container { 
                    max-width: 1400px; 
                    margin: 0 auto; 
                }
                
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    background: white; 
                    padding: 20px; 
                    border-radius: 12px; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .query {
                    border-bottom: 1px solid #e2e8f0;
                    padding: 20px;
                    transition: background-color 0.2s;
                }
                
                .query:hover {
                    background: #f7fafc;
                }
                
                .query-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #e2e8f0;
                }

                .query-id {
                    font-weight: bold;
                    font-size: 1.2em;
                    color: #1e3a8a;
                }

                .query-type {
                    background: #dbeafe;
                    color: #1e40af;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 0.85em;
                    font-weight: 600;
                    border: 1px solid #93c5fd;
                }
                
                .query-details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 15px;
                }
                
                .detail-item {
                    font-size: 0.9em;
                }
                
                .detail-label {
                    font-weight: 700;
                    color: #374151;
                    font-size: 0.95em;
                }
                
                .query-data {
                    background: #f0f9ff;
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid #bae6fd;
                    font-size: 0.9em;
                    white-space: pre-wrap;
                    margin: 10px 0;
                    line-height: 1.6;
                }
                
                .response-section {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #e2e8f0;
                }
                
                .response-area {
                    width: 100%;
                    min-height: 80px;
                    padding: 10px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-family: inherit;
                    resize: vertical;
                    margin-bottom: 10px;
                }
                
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    margin-right: 8px;
                    transition: all 0.2s;
                }
                
                .btn-complete {
                    background: #10b981;
                    color: white;
                }
                
                .btn-complete:hover {
                    background: #059669;
                    transform: translateY(-1px);
                }
                
                .btn-reject {
                    background: #ef4444;
                    color: white;
                }
                
                .btn-reject:hover {
                    background: #dc2626;
                    transform: translateY(-1px);
                }
                
                /* Additional styles for sections */
                .status-sections {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                }
                
                .status-section {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .section-header {
                    padding: 20px;
                    font-weight: bold;
                    font-size: 1.2em;
                    border-bottom: 2px solid #e2e8f0;
                }
                
                .pending-header { background: #fed7aa; color: #9a3412; }
                .in-progress-header { background: #bfdbfe; color: #1e40af; }
                .completed-header { background: #bbf7d0; color: #166534; }
                .rejected-header { background: #fecaca; color: #991b1b; }
                
                .query-list {
                    max-height: 600px;
                    overflow-y: auto;
                }
                
                .empty-state {
                    text-align: center;
                    color: #718096;
                    padding: 40px;
                    font-style: italic;
                }
                
                .timestamp {
                    color: #718096;
                    font-size: 0.8em;
                }
                
                @media (max-width: 768px) {
                    .status-sections {
                        grid-template-columns: 1fr;
                    }
                    
                    .query-details {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚀 WhatsApp Chatbot Admin Panel</h1>
                    <p>📷 Image Support Enabled | 🏪 Store Filtering Available</p>
                    <button class="btn" style="background: #3b82f6; color: white; padding: 12px 24px;" onclick="loadQueries()">🔄 Refresh Dashboard</button>
                </div>
                
                <div class="status-sections">
                    <div class="status-section">
                        <div class="section-header pending-header">
                            ⏳ Pending Queries (<span id="pending-count">0</span>)
                        </div>
                        <div class="query-list" id="pending-queries">
                            <!-- Pending queries will be loaded here -->
                        </div>
                    </div>
                    
                    <div class="status-section">
                        <div class="section-header completed-header">
                            ✅ Completed Queries (<span id="completed-count">0</span>)
                        </div>
                        <div class="query-list" id="completed-queries">
                            <!-- Completed queries will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Image Modal -->
            <div id="imageModal" class="image-modal" onclick="closeImageModal()">
                <span class="close-btn" onclick="closeImageModal()">&times;</span>
                <img id="modalImage" src="" alt="Query Image">
            </div>
            
            <script>
                async function loadQueries() {
                    try {
                        const response = await fetch('/admin/queries');
                        const queries = await response.json();
                        
                        // Categorize queries by status
                        const categorized = {
                            pending: queries.filter(q => q.status === 'pending'),
                            completed: queries.filter(q => q.status === 'completed')
                        };
                        
                        // Update each section
                        updateSection('pending', categorized.pending);
                        updateSection('completed', categorized.completed);
                        
                    } catch (error) {
                        console.error('Error loading queries:', error);
                    }
                }
                
                function updateSection(sectionName, queries) {
                    const containerId = \`\${sectionName}-queries\`;
                    const countId = \`\${sectionName}-count\`;
                    
                    document.getElementById(countId).textContent = queries.length;
                    
                    const container = document.getElementById(containerId);
                    
                    if (queries.length === 0) {
                        container.innerHTML = '<div class="empty-state">No queries in this category</div>';
                        return;
                    }
                    
                    container.innerHTML = queries.map(query => {
                        // Format query data in a more readable way
                        let formattedData = '';
                        try {
                            const data = query.query_data;
                            formattedData = Object.entries(data).map(([key, value]) => {
                                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                return \`<div style="margin-bottom: 8px;"><strong>\${label}:</strong> \${value}</div>\`;
                            }).join('');
                        } catch (e) {
                            formattedData = JSON.stringify(query.query_data, null, 2);
                        }

                        return \`
                        <div class="query">
                            <div class="query-header">
                                <div class="query-id">Query #\${query.query_id}</div>
                                <div class="query-type">\${query.query_type.replace(/_/g, ' ').toUpperCase()}</div>
                            </div>

                            <div class="query-details">
                                <div class="detail-item">
                                    <span class="detail-label">👤 User:</span> \${query.user_number}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">🏪 Store:</span> \${query.store}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">🌍 Region:</span> \${query.region.toUpperCase()}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">📅 Created:</span>
                                    <span class="timestamp">\${new Date(query.created_at).toLocaleString()}</span>
                                </div>
                            </div>

                            <div class="detail-item" style="margin-top: 15px;">
                                <span class="detail-label" style="display: block; margin-bottom: 10px; font-size: 1.05em;">📋 Request Details:</span>
                                <div class="query-data">\${formattedData}</div>
                            </div>

                            <div class="query-image">
                                \${query.image_url && query.image_url !== 'null' && query.image_url !== '' ? \`
                                    <span class="image-label">📷 Attached Image (click to enlarge):</span>
                                    <div style="margin-top: 10px;">
                                        <img src="\${query.image_url}" alt="Query Image" onclick="openImageModal('\${query.image_url}')"
                                             title="Click to view full size">
                                    </div>
                                \` : \`
                                    <div class="no-image">📷 No image attached</div>
                                \`}
                            </div>

                            \${query.status === 'pending' ? \`
                                <div class="response-section">
                                    <label style="font-weight: 600; color: #374151; margin-bottom: 8px; display: block;">
                                        ✍️ Your Response:
                                    </label>
                                    <textarea
                                        id="response-\${query.id}"
                                        class="response-area"
                                        placeholder="Enter your response to the user..."
                                    >\${query.team_response || ''}</textarea>
                                    <div style="display: flex; gap: 10px;">
                                        <button class="btn btn-complete" onclick="respondToQuery(\${query.id}, 'completed')">
                                            ✅ Send Response & Complete
                                        </button>
                                        <button class="btn btn-reject" onclick="respondToQuery(\${query.id}, 'rejected')">
                                            ❌ Reject Query
                                        </button>
                                    </div>
                                </div>
                            \` : query.team_response ? \`
                                <div style="background: #ecfdf5; border: 2px solid #10b981; padding: 15px; border-radius: 8px; margin-top: 15px;">
                                    <div style="font-weight: 600; color: #065f46; margin-bottom: 8px;">✅ Team Response:</div>
                                    <div style="color: #047857;">\${query.team_response}</div>
                                </div>
                            \` : ''}
                        </div>
                    \`;
                    }).join('');
                }
                
                async function respondToQuery(queryId, status) {
                    const response = document.getElementById(\`response-\${queryId}\`).value;
                    
                    if (!response.trim()) {
                        alert('Please enter a response before submitting.');
                        return;
                    }
                    
                    try {
                        const result = await fetch('/admin/respond', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ queryId, response, status })
                        });
                        
                        if (result.ok) {
                            alert('Response sent successfully!');
                            loadQueries();
                        } else {
                            alert('Error sending response. Please try again.');
                        }
                    } catch (error) {
                        alert('Error sending response: ' + error.message);
                    }
                }
                
                function openImageModal(imageUrl) {
                    document.getElementById('modalImage').src = imageUrl;
                    document.getElementById('imageModal').style.display = 'block';
                }
                
                function closeImageModal() {
                    document.getElementById('imageModal').style.display = 'none';
                }
                
                // Load queries on page load
                loadQueries();
                
                // Auto-refresh every 30 seconds
                setInterval(loadQueries, 30000);
            </script>
        </body>
        </html>
    `);
});// Error handling
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📱 WhatsApp webhook: ${process.env.RAILWAY_STATIC_URL || `http://localhost:${port}`}/webhook`);
    console.log(`🖥️  Admin panel: ${process.env.RAILWAY_STATIC_URL || `http://localhost:${port}`}`);
    console.log(`📷 Image upload: ImgBB enabled`);
    console.log(`🏪 Store filtering: Available`);
});