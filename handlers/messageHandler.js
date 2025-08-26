const { sendMessage } = require('../utils/twilioClient');
const storeHandler = require('./storeHandler');
const queryHandler = require('./queryHandler');
const approvalHandler = require('./approvalHandler');
const documentHandler = require('./documentHandler');
const trainingHandler = require('./trainingHandler');
const escalationHandler = require('./escalationHandler');
const { pool } = require('../config/database');

// Database session management for PostgreSQL
async function getSession(userNumber) {
    try {
        const result = await pool.query(
            'SELECT session_data FROM user_sessions WHERE user_number = $1',
            [userNumber]
        );
        return result.rows.length > 0 ? result.rows[0].session_data : { step: 'greeting' };
    } catch (error) {
        console.error('Error getting session:', error);
        return { step: 'greeting' };
    }
}

async function saveSession(userNumber, sessionData) {
    try {
        await pool.query(
            'INSERT INTO user_sessions (user_number, session_data) VALUES ($1, $2) ON CONFLICT (user_number) DO UPDATE SET session_data = $2, updated_at = CURRENT_TIMESTAMP',
            [userNumber, sessionData]
        );
    } catch (error) {
        console.error('Error saving session:', error);
    }
}

async function handleMessage(message, senderNumber) {
    // Reset command for testing
    if (message.toLowerCase().trim() === 'reset') {
        await pool.query('DELETE FROM user_sessions WHERE user_number = $1', [senderNumber]);
        sendGreeting(senderNumber);
        await saveSession(senderNumber, { step: 'select_region' });
        return;
    }
    
    // Back to store selection command
    if (message.toLowerCase().trim() === 'back to store' || message.toLowerCase().trim() === 'change store') {
        const userSession = await getSession(senderNumber);
        userSession.step = 'select_region';
        delete userSession.selectedRegion;
        delete userSession.selectedStore;
        sendGreeting(senderNumber);
        await saveSession(senderNumber, userSession);
        return;
    }
    
    // Check my queries command
    if (message.toLowerCase().trim() === 'my queries') {
        const QueryModel = require('../models/queries');
        const queries = await QueryModel.getQueryByNumber(senderNumber);
        
        if (queries.length === 0) {
            sendMessage(senderNumber, 'You have no previous queries.');
        } else {
            let queryList = '📋 Your Recent Queries:\n\n';
            queries.forEach(query => {
                const statusEmoji = query.status === 'completed' ? '✅' : 
                                  query.status === 'rejected' ? '❌' : '⏳';
                queryList += `${statusEmoji} Query #${query.query_id}\n`;
                queryList += `Type: ${query.query_type}\n`;
                queryList += `Status: ${query.status}\n`;
                queryList += `Date: ${new Date(query.created_at).toLocaleDateString()}\n`;
                if (query.team_response) {
                    queryList += `Response: ${query.team_response}\n`;
                }
                queryList += '\n---\n\n';
            });
            sendMessage(senderNumber, queryList);
        }
        return;
    }
    
    const userSession = await getSession(senderNumber);
    
    switch (userSession.step) {
        case 'greeting':
            sendGreeting(senderNumber);
            userSession.step = 'select_region';
            break;
            
        case 'select_region':
            await handleRegionSelection(message, senderNumber, userSession);
            break;
            
        case 'select_store':
            await storeHandler.handleStoreSelection(message, senderNumber, userSession);
            break;
            
        case 'main_menu':
            await handleMainMenu(message, senderNumber, userSession);
            break;
            
        case 'query':
            await queryHandler.handleQuery(message, senderNumber, userSession);
            break;
            
        case 'query_details':
            await queryHandler.handleQueryDetails(message, senderNumber, userSession);
            break;
            
        case 'approval':
            await approvalHandler.handleApproval(message, senderNumber, userSession);
            break;
            
        case 'document':
            await documentHandler.handleDocument(message, senderNumber, userSession);
            break;
            
        case 'document_details':
            await documentHandler.handleDocumentDetails(message, senderNumber, userSession);
            break;
            
        case 'training':
            await trainingHandler.handleTraining(message, senderNumber, userSession);
            break;
            
        case 'escalation':
            await escalationHandler.handleEscalation(message, senderNumber, userSession);
            break;
            
        default:
            sendGreeting(senderNumber);
            userSession.step = 'select_region';
    }
    
    await saveSession(senderNumber, userSession);
}

function sendGreeting(senderNumber) {
    const greeting = `Hi! 👋 How can I help you today?

Please select your region:
1. Central
2. RTB  
3. Welkom

Type the number of your region (1-3):

ℹ️ Commands:
• Type "my queries" to check your query status
• Type "back to store" to change store
• Type "reset" to start over`;
    
    sendMessage(senderNumber, greeting);
}

async function handleRegionSelection(message, senderNumber, userSession) {
    const choice = message.trim();
    
    switch (choice) {
        case '1':
            userSession.selectedRegion = 'central';
            userSession.step = 'select_store';
            storeHandler.showStoreOptions(senderNumber, 'central');
            break;
        case '2':
            userSession.selectedRegion = 'rtb';
            userSession.step = 'select_store';
            storeHandler.showStoreOptions(senderNumber, 'rtb');
            break;
        case '3':
            userSession.selectedRegion = 'welkom';
            userSession.step = 'select_store';
            storeHandler.showStoreOptions(senderNumber, 'welkom');
            break;
        default:
            sendMessage(senderNumber, 'Please select a valid region (1-3)');
            sendGreeting(senderNumber);
    }
}

async function handleMainMenu(message, senderNumber, userSession) {
    const choice = message.trim();
    
    switch (choice) {
        case '1':
            userSession.step = 'query';
            queryHandler.showQueryOptions(senderNumber);
            break;
        case '2':
            userSession.step = 'approval';
            approvalHandler.showApprovalForm(senderNumber);
            break;
        case '3':
            userSession.step = 'document';
            documentHandler.showDocumentOptions(senderNumber);
            break;
        case '4':
            userSession.step = 'training';
            trainingHandler.showTrainingOptions(senderNumber);
            break;
        case '5':
            userSession.step = 'escalation';
            escalationHandler.showEscalationForm(senderNumber);
            break;
        default:
            sendMessage(senderNumber, 'Please select a valid option (1-5)');
            showMainMenu(senderNumber);
    }
}

function showMainMenu(senderNumber) {
    const menu = `Main Menu:

1️⃣ Query
2️⃣ Over Sale Approval
3️⃣ Request Document
4️⃣ Training
5️⃣ Escalation

Type the number of your choice (1-5):

💡 Tip: Type "back to store" to change store`;
    
    sendMessage(senderNumber, menu);
}

module.exports = { handleMessage, showMainMenu };