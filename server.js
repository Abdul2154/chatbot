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

// Initialize database
initDatabase();

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        features: ['image_upload', 'store_filtering', 'cloudinary']
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

// Admin panel with image support and store filtering
app.get('/', (req, res) => {
    const baseUrl = process.env.RAILWAY_STATIC_URL || `http://localhost:${port}`;
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>WhatsApp Chatbot Admin Panel</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
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
                
                .filters {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .filter-group {
                    display: flex;
                    flex-direction: column;
                }
                
                .filter-group label {
                    font-weight: 600;
                    margin-bottom: 5px;
                    color: #4a5568;
                }
                
                .filter-group select {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .stat-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    text-align: center;
                }
                
                .stat-number {
                    font-size: 2em;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .stat-label {
                    color: #718096;
                    font-size: 0.9em;
                }
                
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
                
                .query {
                    border-bottom: 1px solid #e2e8f0;
                    padding: 20px;
                    transition: background-color 0.2s;
                }
                
                .query:hover {
                    background: #f7fafc;
                }
                
                .query:last-child {
                    border-bottom: none;
                }
                
                .query-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                
                .query-id {
                    font-weight: bold;
                    font-size: 1.1em;
                    color: #2d3748;
                }
                
                .query-type {
                    background: #edf2f7;
                    color: #4a5568;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.8em;
                    font-weight: 500;
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
                    font-weight: 600;
                    color: #4a5568;
                }
                
                .query-data {
                    background: #f7fafc;
                    padding: 12px;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 0.8em;
                    white-space: pre-wrap;
                    margin: 10px 0;
                }
                
                .query-image {
                    margin: 10px 0;
                }
                
                .query-image img {
                    max-width: 300px;
                    max-height: 200px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    cursor: pointer;
                }
                
                .query-image img:hover {
                    transform: scale(1.05);
                    transition: transform 0.2s;
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
                
                .btn-refresh {
                    background: #3b82f6;
                    color: white;
                    padding: 12px 24px;
                    font-size: 1em;
                    margin-bottom: 20px;
                }
                
                .btn-refresh:hover {
                    background: #2563eb;
                }
                
                .btn-filter {
                    background: #8b5cf6;
                    color: white;
                    padding: 8px 16px;
                }
                
                .btn-filter:hover {
                    background: #7c3aed;
                }
                
                .team-response {
                    background: #f0f9ff;
                    border: 1px solid #bae6fd;
                    padding: 12px;
                    border-radius: 6px;
                    margin-top: 10px;
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
                }
                
                @media (max-width: 768px) {
                    .status-sections {
                        grid-template-columns: 1fr;
                    }
                    
                    .query-details {
                        grid-template-columns: 1fr;
                    }
                    
                    .filters {
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
                    <button class="btn btn-refresh" onclick="loadQueries()">🔄 Refresh Dashboard</button>
                </div>
                
                <!-- Filters Section -->
                <div class="filters">
                    <div class="filter-group">
                        <label for="storeFilter">Filter by Store:</label>
                        <select id="storeFilter" onchange="applyFilters()">
                            <option value="all">All Stores</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="regionFilter">Filter by Region:</label>
                        <select id="regionFilter" onchange="applyFilters()">
                            <option value="all">All Regions</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="statusFilter">Filter by Status:</label>
                        <select id="statusFilter" onchange="applyFilters()">
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    
                    <div class="filter-group" style="align-self: end;">
                        <button class="btn btn-filter" onclick="clearFilters()">Clear Filters</button>
                    </div>
                </div>
                
                <div class="stats-grid" id="stats">
                    <!-- Stats will be loaded here -->
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
                        <div class="section-header in-progress-header">
                            🔄 In Progress (<span id="progress-count">0</span>)
                        </div>
                        <div class="query-list" id="progress-queries">
                            <!-- In progress queries will be loaded here -->
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 30px;">
                    <div class="status-sections">
                        <div class="status-section">
                            <div class="section-header completed-header">
                                ✅ Completed Queries (<span id="completed-count">0</span>)
                            </div>
                            <div class="query-list" id="completed-queries">
                                <!-- Completed queries will be loaded here -->
                            </div>
                        </div>
                        
                        <div class="status-section">
                            <div class="section-header rejected-header">
                                ❌ Rejected Queries (<span id="rejected-count">0</span>)
                            </div>
                            <div class="query-list" id="rejected-queries">
                                <!-- Rejected queries will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Image Modal -->
            <div id="imageModal" class="image-modal" onclick="closeImageModal()">
                <img id="modalImage" src="" alt="Query Image">
            </div>
            
            <script>
                let currentFilters = {
                    store: 'all',
                    region: 'all',
                    status: 'all'
                };
                
                async function loadQueries() {
                    try {
                        // Build query string with filters
                        const queryParams = new URLSearchParams();
                        if (currentFilters.store !== 'all') queryParams.append('store', currentFilters.store);
                        if (currentFilters.region !== 'all') queryParams.append('region', currentFilters.region);
                        if (currentFilters.status !== 'all') queryParams.append('status', currentFilters.status);
                        
                        const response = await fetch('/admin/queries?' + queryParams.toString());
                        const queries = await response.json();
                        
                        // Load filter options
                        await loadFilterOptions();
                        
                        // Categorize queries by status
                        const categorized = {
                            pending: queries.filter(q => q.status === 'pending'),
                            in_progress: queries.filter(q => q.status === 'in_progress'),
                            completed: queries.filter(q => q.status === 'completed'),
                            rejected: queries.filter(q => q.status === 'rejected')
                        };
                        
                        // Update stats
                        await updateStats();
                        
                        // Update each section
                        updateSection('pending', categorized.pending);
                        updateSection('progress', categorized.in_progress);
                        updateSection('completed', categorized.completed);
                        updateSection('rejected', categorized.rejected);
                        
                    } catch (error) {
                        console.error('Error loading queries:', error);
                    }
                }
                
                async function loadFilterOptions() {
                    try {
                        const response = await fetch('/admin/filters');
                        const filters = await response.json();
                        
                        // Update store filter
                        const storeFilter = document.getElementById('storeFilter');
                        const currentStoreValue = storeFilter.value;
                        storeFilter.innerHTML = '<option value="all">All Stores</option>';
                        filters.stores.forEach(store => {
                            const option = document.createElement('option');
                            option.value = store;
                            option.textContent = store;
                            storeFilter.appendChild(option);
                        });
                        storeFilter.value = currentStoreValue;
                        
                        // Update region filter
                        const regionFilter = document.getElementById('regionFilter');
                        const currentRegionValue = regionFilter.value;
                        regionFilter.innerHTML = '<option value="all">All Regions</option>';
                        filters.regions.forEach(region => {
                            const option = document.createElement('option');
                            option.value = region;
                            option.textContent = region.charAt(0).toUpperCase() + region.slice(1);
                            regionFilter.appendChild(option);
                        });
                        regionFilter.value = currentRegionValue;
                        
                    } catch (error) {
                        console.error('Error loading filter options:', error);
                    }
                }
                
                async function updateStats() {
                    try {
                        const response = await fetch('/admin/stats');
                        const stats = await response.json();
                        
                        document.getElementById('stats').innerHTML = \`
                            <div class="stat-card">
                                <div class="stat-number" style="color: #f59e0b;">\${stats.pending || 0}</div>
                                <div class="stat-label">Pending</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" style="color: #10b981;">\${stats.completed || 0}</div>
                                <div class="stat-label">Completed</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" style="color: #6366f1;">\${stats.total || 0}</div>
                                <div class="stat-label">Total Queries</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" style="color: #8b5cf6;">\${stats.today || 0}</div>
                                <div class="stat-label">Today</div>
                            </div>
                        \`;
                    } catch (error) {
                        console.error('Error updating stats:', error);
                    }
                }
                
                function updateSection(sectionName, queries) {
                    const containerId = sectionName === 'progress' ? 'progress-queries' : \`\${sectionName}-queries\`;
                    const countId = sectionName === 'progress' ? 'progress-count' : \`\${sectionName}-count\`;
                    
                    document.getElementById(countId).textContent = queries.length;
                    
                    const container = document.getElementById(containerId);
                    
                    if (queries.length === 0) {
                        container.innerHTML = '<div class="empty-state">No queries in this category</div>';
                        return;
                    }
                    
                    container.innerHTML = queries.map(query => \`
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
                                    <span class="detail-label">🏪 Store:</span> \${query.store} (\${query.region})
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">📅 Created:</span> 
                                    <span class="timestamp">\${new Date(query.created_at).toLocaleString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">🔄 Updated:</span> 
                                    <span class="timestamp">\${new Date(query.updated_at).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div class="detail-item">
                                <span class="detail-label">📋 Details:</span>
                                <div class="query-data">\${JSON.stringify(query.query_data, null, 2)}</div>
                            </div>
                            
                            \${query.image_url ? \`
                                <div class="query-image">
                                    <span class="detail-label">📷 Attached Image:</span><br>
                                    <img src="\${query.image_url}" alt="Query Image" onclick="openImageModal('\${query.image_url}')">
                                </div>
                            \` : ''}
                            
                            \${query.status === 'pending' ? \`
                                <div class="response-section">
                                    <textarea 
                                        id="response-\${query.id}" 
                                        class="response-area"
                                        placeholder="Enter your response to the user..."
                                    >\${query.team_response || ''}</textarea>
                                    <div>
                                        <button class="btn btn-complete" onclick="respondToQuery(\${query.id}, 'completed')">
                                            ✅ Send Response & Complete
                                        </button>
                                        <button class="btn btn-reject" onclick="respondToQuery(\${query.id}, 'rejected')">
                                            ❌ Reject Query
                                        </button>
                                    </div>
                                </div>
                            \` : query.team_response ? \`
                                <div class="team-response">
                                    <strong>Team Response:</strong> \${query.team_response}
                                </div>
                            \` : ''}
                        </div>
                    \`).join('');
                }
                
                function applyFilters() {
                    currentFilters.store = document.getElementById('storeFilter').value;
                    currentFilters.region = document.getElementById('regionFilter').value;
                    currentFilters.status = document.getElementById('statusFilter').value;
                    
                    loadQueries();
                }
                
                function clearFilters() {
                    document.getElementById('storeFilter').value = 'all';
                    document.getElementById('regionFilter').value = 'all';
                    document.getElementById('statusFilter').value = 'all';
                    
                    currentFilters = {
                        store: 'all',
                        region: 'all',
                        status: 'all'
                    };
                    
                    loadQueries();
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
});

// Error handling
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
    console.log(`📷 Image upload: Cloudinary enabled`);
    console.log(`🏪 Store filtering: Available`);
});
