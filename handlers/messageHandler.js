const { sendMessage } = require('../utils/twilioClient');
const storeHandler = require('./storeHandler');
const queryHandler = require('./queryHandler');
const approvalHandler = require('./approvalHandler');
const documentHandler = require('./documentHandler');
const trainingHandler = require('./trainingHandler');
const escalationHandler = require('./escalationHandler');
const { pool } = require('../config/database');
const { downloadAndUploadFromTwilio } = require('../config/imgbb');
const { downloadAndProcessExcelFromTwilio, isExcelFile } = require('../config/excelHandler');
const QueryModel = require('../models/queries');

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
async function handleMessage(message, senderNumber, mediaUrl = null, mediaContentType = null) {
    console.log('🔄 Processing message:', message, 'from:', senderNumber);

    if (mediaUrl) {
        console.log('📷 Image received:', mediaUrl);
    }

    // Greeting detection - reset to start
    const greetings = ['hello', 'hi', 'hey', 'start', 'hola', 'greetings'];
    if (message && greetings.includes(message.toLowerCase().trim())) {
        console.log('👋 Greeting detected, starting fresh session');
        await pool.query('DELETE FROM user_sessions WHERE user_number = $1', [senderNumber]);
        sendGreeting(senderNumber);
        await saveSession(senderNumber, { step: 'select_region' });
        return;
    }

    // Reset command
    if (message && message.toLowerCase().trim() === 'reset') {
        console.log('🔄 Resetting user session');
        await pool.query('DELETE FROM user_sessions WHERE user_number = $1', [senderNumber]);
        sendGreeting(senderNumber);
        await saveSession(senderNumber, { step: 'select_region' });
        return;
    }

    // Menu command - go back to main menu
    if (message && message.toLowerCase().trim() === 'menu') {
        console.log('📋 Returning to main menu');
        const userSession = await getSession(senderNumber);
        userSession.step = 'main_menu';
        // Clear any temporary data
        delete userSession.queryType;
        delete userSession.queryData;
        delete userSession.imageUrl;
        delete userSession.imagePublicId;
        delete userSession.documentType;
        await saveSession(senderNumber, userSession);
        showMainMenu(senderNumber);
        return;
    }
    
    const userSession = await getSession(senderNumber);
    console.log('👤 User session step:', userSession.step);

    // Handle Excel file upload for bulk customer addition
    if (mediaUrl && mediaContentType && isExcelFile(mediaContentType)) {
        try {
            console.log('📊 Excel file detected, processing...');

            const fileName = `${Date.now()}_${senderNumber.replace('whatsapp:', '')}_customers`;
            const excelResult = await downloadAndProcessExcelFromTwilio(mediaUrl, fileName);

            // Create a query entry for bulk customer addition
            const queryId = await QueryModel.createQuery(
                senderNumber,
                userSession.selectedRegion || 'unknown',
                userSession.selectedStore || 'unknown',
                'bulk_customer_addition',
                {
                    document_type: 'customer_excel',
                    total_customers: excelResult.customerData.totalRecords,
                    customers: excelResult.customerData.customers,
                    headers: excelResult.customerData.headers,
                    file_name: fileName
                },
                excelResult.url,
                excelResult.public_id
            );

            const confirmationMessage = `✅ Excel file received and processed successfully!

Query ID: #${queryId}
📊 Total Customers Found: ${excelResult.customerData.totalRecords}

Your bulk customer addition request has been submitted. Our team will review and add these customers to the system.

📄 The Excel file has been saved and can be downloaded from the admin dashboard.

Thank you!`;

            sendMessage(senderNumber, confirmationMessage);

            console.log(`✅ Bulk customer addition processed: ${excelResult.customerData.totalRecords} customers`);
            return;

        } catch (error) {
            console.error('Error processing Excel file:', error);
            sendMessage(senderNumber, `❌ Sorry, there was an error processing your Excel file.

Please make sure:
- The file is a valid Excel file (.xlsx or .xls)
- It contains customer data with headers in the first row
- Common headers: Name, Contact Number, etc.

Please try again or contact support if the issue persists.`);
            return;
        }
    }

    // Handle image upload for steps that support images
    if (mediaUrl && shouldAcceptImage(userSession.step)) {
        try {
            const fileName = `${Date.now()}_${senderNumber.replace('whatsapp:', '')}_image`;
            const uploadResult = await downloadAndUploadFromTwilio(mediaUrl, fileName);
            
            userSession.imageUrl = uploadResult.url;
            userSession.imagePublicId = uploadResult.public_id;

            console.log('✅ Image uploaded successfully:', uploadResult.url);

            await saveSession(senderNumber, userSession);

            // Send confirmation and ask for text details
            if (userSession.step === 'query_details') {
                sendMessage(senderNumber, '📷 Image received and uploaded successfully!\n\nNow please send your request details as text.\n\nType "menu" to return to main menu.');
            } else if (userSession.step === 'approval') {
                sendMessage(senderNumber, '📷 Image received and uploaded successfully!\n\nNow please send your approval details as text.\n\nType "menu" to return to main menu.');
            } else if (userSession.step === 'document_details') {
                sendMessage(senderNumber, '📷 Image received and uploaded successfully!\n\nNow please send your document request details as text.\n\nType "menu" to return to main menu.');
            } else {
                sendMessage(senderNumber, '📷 Image received and uploaded successfully!\n\nPlease continue with your request.\n\nType "menu" to return to main menu.');
            }

            return; // Wait for next message with text
            
        } catch (error) {
            console.error('Error processing image:', error);
            sendMessage(senderNumber, '❌ Sorry, there was an error processing your image. Please try sending it again or continue without the image.');
            return;
        }
    }
    
    // Handle text messages based on current step
    switch (userSession.step) {
        case 'greeting':
            console.log('👋 Sending greeting to new user');
            sendGreeting(senderNumber);
            userSession.step = 'select_region';
            break;
            
        case 'select_region':
            console.log('🌍 Handling region selection:', message);
            await handleRegionSelection(message, senderNumber, userSession);
            break;
            
        case 'select_store':
            console.log('🏪 Handling store selection:', message);
            await storeHandler.handleStoreSelection(message, senderNumber, userSession);
            break;
            
        case 'main_menu':
            console.log('📋 Handling main menu selection:', message);
            await handleMainMenu(message, senderNumber, userSession);
            break;
            
        case 'query':
            console.log('❓ Handling query selection:', message);
            await queryHandler.handleQuery(message, senderNumber, userSession);
            break;
            
        case 'query_details':
            console.log('📝 Handling query details:', message);
            await queryHandler.handleQueryDetails(message, senderNumber, userSession);
            break;
            
        case 'approval':
            console.log('✅ Handling approval:', message);
            await approvalHandler.handleApproval(message, senderNumber, userSession);
            break;
            
        case 'document':
            console.log('📄 Handling document selection:', message);
            await documentHandler.handleDocument(message, senderNumber, userSession);
            break;
            
        case 'document_details':
            console.log('📋 Handling document details:', message);
            await documentHandler.handleDocumentDetails(message, senderNumber, userSession);
            break;
            
        case 'training':
            console.log('🎓 Handling training selection:', message);
            await trainingHandler.handleTraining(message, senderNumber, userSession);
            break;
            
        case 'escalation':
            console.log('🚨 Handling escalation:', message);
            await escalationHandler.handleEscalation(message, senderNumber, userSession);
            break;
            
        default:
            console.log('🔄 Unknown step, starting over');
            sendGreeting(senderNumber);
            userSession.step = 'select_region';
    }
    
    await saveSession(senderNumber, userSession);
}
function shouldAcceptImage(step) {
    // Steps that can accept images
    const imageSteps = ['query_details', 'approval', 'document_details'];
    return imageSteps.includes(step);
}

function sendGreeting(senderNumber) {
    console.log('👋 Sending greeting to:', senderNumber);

    const greeting = `Hi! 👋 How can I help you today?

Select Region:
• Central
• RTB
• Welkom

Please type:
1 for Central
2 for RTB
3 for Welkom

📷 Note: You can send images with your requests for better support!`;

    sendMessage(senderNumber, greeting);
}

async function handleRegionSelection(message, senderNumber, userSession) {
    const choice = message.trim();
    console.log('🌍 Region choice:', choice);
    
    switch (choice) {
        case '1':
            console.log('🌍 Selected Central region');
            userSession.selectedRegion = 'central';
            userSession.step = 'select_store';
            storeHandler.showStoreOptions(senderNumber, 'central');
            break;
        case '2':
            console.log('🌍 Selected RTB region');
            userSession.selectedRegion = 'rtb';
            userSession.step = 'select_store';
            storeHandler.showStoreOptions(senderNumber, 'rtb');
            break;
        case '3':
            console.log('🌍 Selected Welkom region');
            userSession.selectedRegion = 'welkom';
            userSession.step = 'select_store';
            storeHandler.showStoreOptions(senderNumber, 'welkom');
            break;
        default:
            console.log('❌ Invalid region choice:', choice);
            sendMessage(senderNumber, 'Please select a valid region:\n1 for Central\n2 for RTB\n3 for Welkom');
    }
}

async function handleMainMenu(message, senderNumber, userSession) {
    const choice = message.trim();
    console.log('📋 Main menu choice:', choice);
    
    switch (choice) {
        case '1':
            console.log('❓ Selected Query');
            userSession.step = 'query';
            queryHandler.showQueryOptions(senderNumber);
            break;
        case '2':
            console.log('✅ Selected Over Sale Approval');
            userSession.step = 'approval';
            approvalHandler.showApprovalForm(senderNumber);
            break;
        case '3':
            console.log('📄 Selected Request Document');
            userSession.step = 'document';
            documentHandler.showDocumentOptions(senderNumber);
            break;
        case '4':
            console.log('🎓 Selected Training');
            userSession.step = 'training';
            trainingHandler.showTrainingOptions(senderNumber);
            break;
        case '5':
            console.log('🚨 Selected Escalation');
            userSession.step = 'escalation';
            escalationHandler.showEscalationForm(senderNumber);
            break;
        default:
            console.log('❌ Invalid main menu choice:', choice);
            sendMessage(senderNumber, 'Please select a valid option (1-5)');
            showMainMenu(senderNumber);
    }
}

function showMainMenu(senderNumber) {
    console.log('📋 Showing main menu to:', senderNumber);

    const menu = `Main Menu:
• Query
• Over Sale Approval
• Request Document
• Training
• Escalation

Please type:
1 for Query
2 for Over Sale Approval
3 for Request Document
4 for Training
5 for Escalation

📷 Tip: You can send images with your requests for better support!

Type "reset" to start over from region selection.`;

    sendMessage(senderNumber, menu);
}

module.exports = { handleMessage, showMainMenu };