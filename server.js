const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const messageHandler = require('./handlers/messageHandler');
const adminRoutes = require('./routes/admin');
const { initDatabase } = require('./config/database');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// Initialize database
initDatabase();

// Webhook endpoint for incoming WhatsApp messages
app.post('/webhook', async (req, res) => {
    const incomingMessage = req.body.Body;
    const senderNumber = req.body.From;
    
    console.log(`Received message: ${incomingMessage} from ${senderNumber}`);
    
    try {
        await messageHandler.handleMessage(incomingMessage, senderNumber);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error handling message:', error);
        res.sendStatus(500);
    }
});

// Admin panel routes
app.use('/admin', adminRoutes);

// Serve admin panel
// Updated server.js - Admin Panel Section
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>WhatsApp Chatbot Admin Panel</title>
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
                    <button class="btn btn-refresh" onclick="loadQueries()">🔄 Refresh Dashboard</button>
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
            
            <script>
                async function loadQueries() {
                    try {
                        const response = await fetch('/admin/queries');
                        const queries = await response.json();
                        
                        // Categorize queries by status
                        const categorized = {
                            pending: queries.filter(q => q.status === 'pending'),
                            in_progress: queries.filter(q => q.status === 'in_progress'),
                            completed: queries.filter(q => q.status === 'completed'),
                            rejected: queries.filter(q => q.status === 'rejected')
                        };
                        
                        // Update stats
                        updateStats(categorized, queries);
                        
                        // Update each section
                        updateSection('pending', categorized.pending);
                        updateSection('progress', categorized.in_progress);
                        updateSection('completed', categorized.completed);
                        updateSection('rejected', categorized.rejected);
                        
                    } catch (error) {
                        console.error('Error loading queries:', error);
                    }
                }
                
                function updateStats(categorized, allQueries) {
                    const today = new Date().toDateString();
                    const todayQueries = allQueries.filter(q => 
                        new Date(q.created_at).toDateString() === today
                    );
                    
                    document.getElementById('stats').innerHTML = \`
                        <div class="stat-card">
                            <div class="stat-number" style="color: #f59e0b;">\${categorized.pending.length}</div>
                            <div class="stat-label">Pending</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" style="color: #3b82f6;">\${categorized.in_progress.length}</div>
                            <div class="stat-label">In Progress</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" style="color: #10b981;">\${categorized.completed.length}</div>
                            <div class="stat-label">Completed</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" style="color: #ef4444;">\${categorized.rejected.length}</div>
                            <div class="stat-label">Rejected</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" style="color: #6366f1;">\${allQueries.length}</div>
                            <div class="stat-label">Total Queries</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" style="color: #8b5cf6;">\${todayQueries.length}</div>
                            <div class="stat-label">Today</div>
                        </div>
                    \`;
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
                                <div class="query-type">\${query.query_type.replace('_', ' ').toUpperCase()}</div>
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
                
                async function respondToQuery(queryId, status) {
                    const response = document.getElementById(\`response-\${queryId}\`).value;
                    
                    if (!response.trim()) {
                        alert('Please enter a response before submitting.');
                        return;
                    }
                    
                    try {
                        await fetch('/admin/respond', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ queryId, response, status })
                        });
                        
                        alert('Response sent successfully!');
                        loadQueries();
                    } catch (error) {
                        alert('Error sending response: ' + error.message);
                    }
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Admin panel: http://localhost:${port}`);
});
