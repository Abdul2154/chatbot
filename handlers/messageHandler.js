const { sendMessage } = require('../utils/twilioClient');
const { downloadAndSaveImage } = require('../utils/imageHandler');
const storeHandler = require('./storeHandler');
const queryHandler = require('./queryHandler');
const approvalHandler = require('./approvalHandler');
const documentHandler = require('./documentHandler');
const trainingHandler = require('./trainingHandler');
const escalationHandler = require('./escalationHandler');
const { pool } = require('../config/database');

// Database session management
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

async function handleMessage(message, senderNumber, mediaUrl = null, mediaType = null) {
    console.log('Processing message:', message, 'from:', senderNumber);
    
    // Handle image uploads
    if (mediaUrl && mediaType && mediaType.startsWith('image/')) {
        await handleImageUpload(mediaUrl, senderNumber, mediaType);
        return;
    }
    
    // Reset command
    if (message.toLowerCase().trim() === 'reset') {
        console.log('Resetting user session');
        await pool.query('DELETE FROM user_sessions WHERE user_number = $1', [senderNumber]);
        sendGreeting(senderNumber);
        await saveSession(senderNumber, { step: 'select_region' });
        return;
    }
    
    const userSession = await getSession(senderNumber);
    console.log('User session step:', userSession.step);
    
    switch (userSession.step) {
        case 'greeting':
            console.log('Sending greeting to new user');
            sendGreeting(senderNumber);
            userSession.step = 'select_region';
            break;
            
        case 'select_region':
            console.log('Handling region selection:', message);
            await handleRegionSelection(message, senderNumber, userSession);
            break;
            
        case 'select_store':
            console.log('Handling store selection:', message);
            await storeHandler.handleStoreSelection(message, senderNumber, userSession);
            break;
            
        case 'main_menu':
            console.log('Handling main menu selection:', message);
            await handleMainMenu(message, senderNumber, userSession);
            break;
            
        case 'query':
            console.log('Handling query selection:', message);
            await queryHandler.handleQuery(message, senderNumber, userSession);
            break;
            
        case 'query_details':
            console.log('Handling query details:', message);
            await queryHandler.handleQueryDetails(message, senderNumber, userSession);
            break;
            
        case 'approval':
            console.log('Handling approval:', message);
            await approvalHandler.handleApproval(message, senderNumber, userSession);
            break;
            
        case 'document':
            console.log('Handling document selection:', message);
            await documentHandler.handleDocument(message, senderNumber, userSession);
            break;
            
        case 'document_details':
            console.log('Handling document details:', message);
            await documentHandler.handleDocumentDetails(message, senderNumber, userSession);
            break;
            
        case 'training':
            console.log('Handling training selection:', message);
            await trainingHandler.handleTraining(message, senderNumber, userSession);
            break;
            
        case 'escalation':
            console.log('Handling escalation:', message);
            await escalationHandler.handleEscalation(message, senderNumber, userSession);
            break;
            
        default:
            console.log('Unknown step, starting over');
            sendGreeting(senderNumber);
            userSession.step = 'select_region';
    }
    
    await saveSession(senderNumber, userSession);
}

async function handleImageUpload(mediaUrl, senderNumber, mediaType) {
    try {
        const userSession = await getSession(senderNumber);
        
        // Check if user has an active query/document request
        if (userSession.currentQueryId) {
            // Save image to the current query
            const imageUrl = await downloadAndSaveImage(
                mediaUrl, 
                userSession.currentQueryId, 
                `image_${Date.now()}.jpg`
            );
            
            sendMessage(senderNumber, `Image received successfully! It has been attached to your query #${userSession.currentQueryId}.`);
        } else {
            // User sent image without context
            sendMessage(senderNumber, `Image received! However, you need to submit a query or request first. Please go through the main menu to submit your request, then you can upload images related to it.`);
        }
    } catch (error) {
        console.error('Error handling image upload:', error);
        sendMessage(senderNumber, 'Sorry, there was an error processing your image. Please try again.');
    }
}

function sendGreeting(senderNumber) {
    console.log('Sending greeting to:', senderNumber);
    
    const greeting = `Hi! How can I help you today?

Select Region:
- Central
- RTB
- Welkom

Please type:
1 for Central
2 for RTB  
3 for Welkom`;
    
    sendMessage(senderNumber, greeting);
}

async function handleRegionSelection(message, senderNumber, userSession) {
    const choice = message.trim();
    console.log('Region choice:', choice);
    
    switch (choice) {
        case '1':
            console.log('Selected Central region');
            userSession.selectedRegion = 'central';
            userSession.step = 'select_store';
            storeHandler.showStoreOptions(senderNumber, 'central');
            break;
        case '2':
            console.log('Selected RTB region');
            userSession.selectedRegion = 'rtb';
            userSession.step = 'select_store';
            storeHandler.showStoreOptions(senderNumber, 'rtb');
            break;
        case '3':
            console.log('Selected Welkom region');
            userSession.selectedRegion = 'welkom';
            userSession.step = 'select_store';
            storeHandler.showStoreOptions(senderNumber, 'welkom');
            break;
        default:
            console.log('Invalid region choice:', choice);
            sendMessage(senderNumber, 'Please select a valid region:\n1 for Central\n2 for RTB\n3 for Welkom');
    }
}

async function handleMainMenu(message, senderNumber, userSession) {
    const choice = message.trim();
    console.log('Main menu choice:', choice);
    
    switch (choice) {
        case '1':
            console.log('Selected Query');
            userSession.step = 'query';
            queryHandler.showQueryOptions(senderNumber);
            break;
        case '2':
            console.log('Selected Over Sale Approval');
            userSession.step = 'approval';
            approvalHandler.showApprovalForm(senderNumber);
            break;
        case '3':
            console.log('Selected Request Document');
            userSession.step = 'document';
            documentHandler.showDocumentOptions(senderNumber);
            break;
        case '4':
            console.log('Selected Training');
            userSession.step = 'training';
            trainingHandler.showTrainingOptions(senderNumber);
            break;
        case '5':
            console.log('Selected Escalation');
            userSession.step = 'escalation';
            escalationHandler.showEscalationForm(senderNumber);
            break;
        default:
            console.log('Invalid main menu choice:', choice);
            sendMessage(senderNumber, 'Please select a valid option (1-5)');
            showMainMenu(senderNumber);
    }
}

function showMainMenu(senderNumber) {
    console.log('Showing main menu to:', senderNumber);
    
    const menu = `Main Menu:
- Query
- Over Sale Approval
- Request Document
- Training
- Escalation

Please type:
1 for Query
2 for Over Sale Approval
3 for Request Document
4 for Training
5 for Escalation`;
    
    sendMessage(senderNumber, menu);
}

module.exports = { handleMessage, showMainMenu };
