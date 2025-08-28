const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const messageHandler = require('./handlers/messageHandler');
const adminRoutes = require('./routes/admin');
const { initDatabase } = require('./config/database');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
initDatabase();

// Webhook endpoint for incoming WhatsApp messages
app.post('/webhook', async (req, res) => {
    const incomingMessage = req.body.Body || '';
    const senderNumber = req.body.From;
    const mediaUrl = req.body.MediaUrl0; // Twilio sends media URL here
    const mediaType = req.body.MediaContentType0; // Media content type
    
    console.log(`Received message: ${incomingMessage} from ${senderNumber}`);
    if (mediaUrl) {
        console.log(`Media received: ${mediaType} - ${mediaUrl}`);
    }
    
    try {
        await messageHandler.handleMessage(incomingMessage, senderNumber, mediaUrl, mediaType);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error handling message:', error);
        res.sendStatus(500);
    }
});

// Admin panel routes
app.use('/admin', adminRoutes);

// Enhanced admin dashboard
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>WhatsApp Chatbot Admin Panel</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    background: #f8fafc; 
                    color: #1a202c;
                    line-height: 1.6;
                }
                
                .container { 
                    max-width: 1400px; 
                    margin: 0 auto; 
                    padding: 20px;
                }
                
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    background: white; 
                    padding: 30px; 
                    border-radius: 12px; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                
                .filter-section {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                }
                
                .filter-controls {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    align-items: end;
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
                
                .filter-group select, .filter-group input {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .stat-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    text-align: center;
                    transition: transform 0.2s;
                }
                
                .stat-card:hover {
                    transform: translateY(-2px);
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
                
                .main-content {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 30px;
                }
                
                .queries-section {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .images-section {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .section-header {
                    padding: 20px;
                    font-weight: bold;
                    font-size: 1.3em;
                    border-bottom: 2px solid #e2e8f0;
                    background: #f7fafc;
                }
                
                .content-area {
                    max-height: 800px;
                    overflow-y: auto;
                    padding: 20px;
                }
                
                .query-item {
                    border-bottom: 1px solid #e2e8f0;
                    padding: 20px 0;
                    transition: background-color 0.2s;
                }
                
                .query-item:hover {
                    background: #f8fafc;
                }
                
                .query-item:last-child {
                    border-bottom: none;
                }
                
                .query-header {
                    display: flex;
                    justify-content: between;
                    align-items: center;
                    margin-bottom: 15px;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                
                .query-id {
                    font-weight: bold;
                    color: #2d3748;
                    font-size: 1.1em;
                }
                
                .query-type {
                    background: #edf2f7;
                    color: #4a5568;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.8em;
                    font-weight: 500;
                }
                
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.8em;
                    font-weight: 500;
                }
                
                .status-pending { background: #fed7aa; color: #9a3412; }
                .status-completed { background: #bbf7d0; color: #166534; }
                .status-rejected { background: #fecaca; color: #991b1b; }
                .status-in_progress { background: #bfdbfe; color: #1e40af; }
                
                .query-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
                
                .image-gallery {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .image-card {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: transform 0.2s;
                }
                
                .image-card:hover {
                    transform: scale(1.02);
                }
                
                .image-card img {
                    width: 100%;
                    height: 150px;
                    object-fit: cover;
                }
                
                .image-info {
                    padding: 10px;
                    font-size: 0.8em;
                    background: #f7fafc;
                }
                
                .image-query-id {
                    font-weight: 600;
                    color: #2d3748;
                }
                
                .image-store {
                    color: #718096;
                    margin-top: 5px;
                }
                
                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    margin-right: 10px;
                    margin-bottom: 10px;
                    transition: all 0.2s;
                }
                
                .btn-primary {
                    background: #3b82f6;
                    color: white;
                }
                
                .btn-primary:hover {
                    background: #2563eb;
                    transform: translateY(-1px);
                }
                
                .btn-success {
                    background: #10b981;
                    color: white;
                }
                
                .btn-danger {
                    background: #ef4444;
                    color: white;
                }
                
                .response-area {
                    width: 100%;
                    min-height: 80px;
                    padding: 10px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-family: inherit;
                    resize: vertical;
                    margin: 10px 0;
                }
                
                .empty-state {
                    text-align: center;
                    color: #718096;
                    padding: 40px;
                    font-style: italic;
                }
                
                .image-count {
                    background: #3b82f6;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.7em;
                    margin-left: 10px;
                }
                
                .query-data {
                    background: #f7fafc;
                    padding: 12px;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 0.8em;
                    white-space: pre-wrap;
                    margin: 10px 0;
                    max-height: 150px;
                    overflow-y: auto;
                }
                
                @media (max-width: 768px) {
                    .main-content {
                        grid-template-columns: 1fr;
                    }
                    
                    .filter-controls {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>WhatsApp Chatbot Admin Panel</h1>
                    <button class="btn btn-primary" onclick="loadData()">Refresh Dashboard</button>
                </div>
                
                <!-- Filter Section -->
                <div class="filter-section">
                    <h3 style="margin-bottom: 15px;">Filters</h3>
                    <div class="filter-controls">
                        <div class="filter-group">
                            <label for="regionFilter">Region:</label>
                            <select id="regionFilter" onchange="applyFilters()">
                                <option value="">All Regions</option>
                                <option value="central">Central</option>
                                <option value="rtb">RTB</option>
                                <option value="welkom">Welkom</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="storeFilter">Store:</label>
                            <select id="storeFilter" onchange="applyFilters()">
                                <option value="">All Stores</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="statusFilter">Status:</label>
                            <select id="statusFilter" onchange="applyFilters()">
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="hasImagesFilter">Has Images:</label>
                            <select id="hasImagesFilter" onchange="applyFilters()">
                                <option value="">All</option>
                                <option value="true">With Images</option>
                                <option value="false">Without Images</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <button class="btn btn-primary" onclick="clearFilters()">Clear Filters</button>
                        </div>
                    </div>
                </div>
                
                <!-- Stats Section -->
                <div class="stats-grid" id="stats">
                    <!-- Stats will be loaded here -->
                </div>
                
                <!-- Main Content -->
                <div class="main-content">
                    <div class="queries-section">
                        <div class="section-header">
                            Queries (<span id="queries-count">0</span>)
                        </div>
                        <div class="content-area" id="queries-container">
                            <!-- Queries will be loaded here -->
                        </div>
                    </div>
                    
                    <div class="images-section">
                        <div class="section-header">
                            Images (<span id="images-count">0</span>)
                        </div>
                        <div class="content-area" id="images-container">
                            <!-- Images will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                let allQueries = [];
                let allImages = [];
                let filteredQueries = [];
                let filteredImages = [];
                
                async function loadData() {
                    try {
                        // Load queries and images
                        const [queriesResponse, imagesResponse, storesResponse] = await Promise.all([
                            fetch('/admin/queries'),
                            fetch('/admin/images'),
                            fetch('/admin/stores')
                        ]);
                        
                        allQueries = await queriesResponse.json();
                        allImages = await imagesResponse.json();
                        const stores = await storesResponse.json();
                        
                        // Populate store filter
                        const storeFilter = document.getElementById('storeFilter');
                        storeFilter.innerHTML = '<option value="">All Stores</option>';
                        stores.forEach(store => {
                            const option = document.createElement('option');
                            option.value = store.store;
                            option.textContent = `${store.store} (${store.region})`;
                            storeFilter.appendChild(option);
                        });
                        
                        applyFilters();
                        
                    } catch (error) {
                        console.error('Error loading data:', error);
                    }
                }
                
                function applyFilters() {
                    const regionFilter = document.getElementById('regionFilter').value;
                    const storeFilter = document.getElementById('storeFilter').value;
                    const statusFilter = document.getElementById('statusFilter').value;
                    const hasImagesFilter = document.getElementById('hasImagesFilter').value;
                    
                    // Filter queries
                    filteredQueries = allQueries.filter(query => {
                        if (regionFilter && query.region !== regionFilter) return false;
                        if (storeFilter && query.store !== storeFilter) return false;
                        if (statusFilter && query.status !== statusFilter) return false;
                        if (hasImagesFilter === 'true' && !query.has_images) return false;
                        if (hasImagesFilter === 'false' && query.has_images) return false;
                        return true;
                    });
                    
                    // Filter images
                    filteredImages = allImages.filter(image => {
                        if (regionFilter && image.region !== regionFilter) return false;
                        if (storeFilter && image.store !== storeFilter) return false;
                        return true;
                    });
                    
                    updateStats();
                    renderQueries();
                    renderImages();
                }
                
                function clearFilters() {
                    document.getElementById('regionFilter').value = '';
                    document.getElementById('storeFilter').value = '';
                    document.getElementById('statusFilter').value = '';
                    document.getElementById('hasImagesFilter').value = '';
                    applyFilters();
                }
                
                function updateStats() {
                    const today = new Date().toDateString();
                    const todayQueries = filteredQueries.filter(q => 
                        new Date(q.created_at).toDateString() === today
                    );
                    
                    document.getElementById('stats').innerHTML = 
                        '<div class="stat-card">' +
                            '<div class="stat-number" style="color: #6366f1;">' + filteredQueries.length + '</div>' +
                            '<div class="stat-label">Total Queries</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<div class="stat-number" style="color: #f59e0b;">' + filteredQueries.filter(q => q.status === 'pending').length + '</div>' +
                            '<div class="stat-label">Pending</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<div class="stat-number" style="color: #10b981;">' + filteredQueries.filter(q => q.status === 'completed').length + '</div>' +
                            '<div class="stat-label">Completed</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<div class="stat-number" style="color: #3b82f6;">' + filteredImages.length + '</div>' +
                            '<div class="stat-label">Images</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<div class="stat-number" style="color: #8b5cf6;">' + todayQueries.length + '</div>' +
                            '<div class="stat-label">Today</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<div class="stat-number" style="color: #06b6d4;">' + filteredQueries.filter(q => q.has_images).length + '</div>' +
                            '<div class="stat-label">With Images</div>' +
                        '</div>';
                }
                
                function renderQueries() {
                    document.getElementById('queries-count').textContent = filteredQueries.length;
                    const container = document.getElementById('queries-container');
                    
                    if (filteredQueries.length === 0) {
                        container.innerHTML = '<div class="empty-state">No queries match the current filters</div>';
                        return;
                    }
                    
                    container.innerHTML = filteredQueries.map(query => 
                        '<div class="query-item">' +
                            '<div class="query-header">' +
                                '<div class="query-id">Query #' + query.query_id + '</div>' +
                                '<div>' +
                                    '<span class="query-type">' + query.query_type.replace('_', ' ').toUpperCase() + '</span>' +
                                    '<span class="status-badge status-' + query.status + '">' + query.status.replace('_', ' ').toUpperCase() + '</span>' +
                                    (query.has_images ? '<span class="image-count">' + (query.image_count || 0) + ' images</span>' : '') +
                                '</div>' +
                            '</div>' +
                            
                            '<div class="query-details">' +
                                '<div class="detail-item">' +
                                    '<span class="detail-label">User:</span> ' + query.user_number +
                                '</div>' +
                                '<div class="detail-item">' +
                                    '<span class="detail-label">Store:</span> ' + query.store + ' (' + query.region + ')' +
                                '</div>' +
                                '<div class="detail-item">' +
                                    '<span class="detail-label">Created:</span> ' + new Date(query.created_at).toLocaleString() +
                                '</div>' +
                            '</div>' +
                            
                            '<div class="detail-item">' +
                                '<span class="detail-label">Details:</span>' +
                                '<div class="query-data">' + JSON.stringify(query.query_data, null, 2) + '</div>' +
                            '</div>' +
                            
                            (query.status === 'pending' ? 
                                '<div style="margin-top: 15px;">' +
                                    '<textarea id="response-' + query.id + '" class="response-area" placeholder="Enter your response...">' + (query.team_response || '') + '</textarea>' +
                                    '<div>' +
                                        '<button class="btn btn-success" onclick="respondToQuery(' + query.id + ', \'completed\')">Complete</button>' +
                                        '<button class="btn btn-danger" onclick="respondToQuery(' + query.id + ', \'rejected\')">Reject</button>' +
                                        (query.has_images ? '<button class="btn btn-primary" onclick="viewQueryImages(\'' + query.query_id + '\')">View Images</button>' : '') +
                                    '</div>' +
                                '</div>' 
                                : 
                                (query.team_response ? '<div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 12px; border-radius: 6px; margin-top: 10px;"><strong>Response:</strong> ' + query.team_response + '</div>' : '') +
                                (query.has_images ? '<button class="btn btn-primary" onclick="viewQueryImages(\'' + query.query_id + '\')" style="margin-top: 10px;">View Images</button>' : '')
                            ) +
                        '</div>'
                    ).join('');
                }
                
                function renderImages() {
                    document.getElementById('images-count').textContent = filteredImages.length;
                    const container = document.getElementById('images-container');
                    
                    if (filteredImages.length === 0) {
                        container.innerHTML = '<div class="empty-state">No images match the current filters</div>';
                        return;
                    }
                    
                    container.innerHTML = 
                        '<div class="image-gallery">' +
                            filteredImages.map(image => 
                                '<div class="image-card">' +
                                    '<img src="' + image.image_url + '" alt="Query Image" onclick="openImageModal(\'' + image.image_url + '\')">' +
                                    '<div class="image-info">' +
                                        '<div class="image-query-id">Query #' + image.query_id + '</div>' +
                                        '<div class="image-store">' + image.store + ' (' + image.region + ')</div>' +
                                        '<div style="color: #9ca3af; font-size: 0.7em; margin-top: 5px;">' +
                                            new Date(image.uploaded_at).toLocaleDateString() +
                                        '</div>' +
                                    '</div>' +
                                '</div>'
                            ).join('') +
                        '</div>';
                }
                
                async function respondToQuery(queryId, status) {
                    const response = document.getElementById('response-' + queryId).value;
                    
                    if (!response.trim()) {
                        alert('Please enter a response before submitting.');
                        return;
                    }
                    
                    try {
                        await fetch('/admin/respond', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ queryId: queryId, response: response, status: status })
                        });
                        
                        alert('Response sent successfully!');
                        loadData();
                    } catch (error) {
                        alert('Error sending response: ' + error.message);
                    }
                }
                
                function openImageModal(imageUrl) {
                    const modal = document.createElement('div');
                    modal.style.cssText = 
                        'position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
                        'background: rgba(0,0,0,0.8); display: flex; justify-content: center; ' +
                        'align-items: center; z-index: 1000; cursor: pointer;';
                    
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px;';
                    
                    modal.appendChild(img);
                    modal.onclick = function() { document.body.removeChild(modal); };
                    document.body.appendChild(modal);
                }
                
                async function viewQueryImages(queryId) {
                    try {
                        const response = await fetch('/admin/images/query/' + queryId);
                        const images = await response.json();
                        
                        if (images.length === 0) {
                            alert('No images found for this query.');
                            return;
                        }
                        
                        const modal = document.createElement('div');
                        modal.style.cssText = 
                            'position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
                            'background: rgba(0,0,0,0.8); display: flex; justify-content: center; ' +
                            'align-items: center; z-index: 1000; padding: 20px;';
                        
                        const content = document.createElement('div');
                        content.style.cssText = 
                            'background: white; padding: 20px; border-radius: 12px; ' +
                            'max-width: 80%; max-height: 80%; overflow-y: auto;';
                        
                        content.innerHTML = 
                            '<h3 style="margin-bottom: 20px;">Images for Query #' + queryId + '</h3>' +
                            '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">' +
                                images.map(image => 
                                    '<div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">' +
                                        '<img src="' + image.image_url + '" style="width: 100%; height: 150px; object-fit: cover;">' +
                                        '<div style="padding: 10px; font-size: 0.8em;">' +
                                            '<div>' + image.image_name + '</div>' +
                                            '<div style="color: #718096;">' + new Date(image.uploaded_at).toLocaleString() + '</div>' +
                                        '</div>' +
                                    '</div>'
                                ).join('') +
                            '</div>' +
                            '<button onclick="document.body.removeChild(this.closest(\'div\').closest(\'div\'))" ' +
                                    'style="margin-top: 20px; padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">' +
                                'Close' +
                            '</button>';
                        
                        modal.appendChild(content);
                        document.body.appendChild(modal);
                        
                    } catch (error) {
                        alert('Error loading images: ' + error.message);
                    }
                }
                
                // Load data on page load
                loadData();
                
                // Auto-refresh every 30 seconds
                setInterval(loadData, 30000);
            </script>
        </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Admin panel: http://localhost:${port}`);
});
