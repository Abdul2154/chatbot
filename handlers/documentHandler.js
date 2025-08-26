const { sendMessage } = require('../utils/twilioClient');
const QueryModel = require('../models/queries');

function showDocumentOptions(senderNumber) {
    const message = `REQUEST DOCUMENT
Which document do you need?

1. TD Document
2. GRN Statement  
3. Stock Sheet
4. Leave Form
5. TD Statement Report

Type the number of your choice (1-5):`;
    
    sendMessage(senderNumber, message);
}

async function handleDocument(message, senderNumber, userSession) {
    const choice = message.trim();
    
    switch (choice) {
        case '1':
            userSession.documentType = 'td_document';
            userSession.step = 'document_details';
            sendMessage(senderNumber, `📄 TD DOCUMENT REQUEST

Please provide the following information (separate each field with a new line):

1. Employee Name:
2. Store:
3. Contact Number:

Example:
John Smith
Doornkop
0123456789

Note: You can upload supporting images if needed.`);
            break;
        case '2':
            userSession.documentType = 'grn_statement';
            userSession.step = 'document_details';
            sendMessage(senderNumber, `📊 GRN STATEMENT REQUEST

Please provide the following information (separate each field with a new line):

1. Employee Name:
2. Store:
3. Contact Number:

Example:
John Smith
Doornkop
0123456789

Note: You can upload supporting images if needed.`);
            break;
        case '3':
            userSession.documentType = 'stock_sheet';
            userSession.step = 'document_details';
            sendMessage(senderNumber, `📋 STOCK SHEET REQUEST

Please provide the following information (separate each field with a new line):

1. Employee Name:
2. Store:
3. Contact Number:

Example:
John Smith
Doornkop
0123456789

Note: This will be sent to Head Office.`);
            break;
        case '4':
            try {
                const queryId = await QueryModel.createQuery(
                    senderNumber,
                    userSession.selectedRegion,
                    userSession.selectedStore,
                    'leave_form',
                    { request_type: 'leave_form', store: userSession.selectedStore }
                );
                
                sendMessage(senderNumber, `📝 LEAVE FORM REQUEST

Query ID: #${queryId}

A downloadable PDF will be sent to you shortly.`);
            } catch (error) {
                console.error('Error submitting leave form request:', error);
                sendMessage(senderNumber, 'Sorry, there was an error processing your request. Please try again later.');
            }
            userSession.step = 'main_menu';
            break;
        case '5':
            userSession.documentType = 'td_statement';
            userSession.step = 'document_details';
            sendMessage(senderNumber, `📈 TD STATEMENT REPORT

Please provide the following information (separate each field with a new line):

1. Employee Name:
2. Store:
3. Contact Number:

Example:
John Smith
Doornkop
0123456789

Note: Formal request will be submitted.`);
            break;
        default:
            sendMessage(senderNumber, 'Please select a valid option (1-5)');
    }
}

async function handleDocumentDetails(message, senderNumber, userSession) {
    const userInput = message.trim();
    const lines = userInput.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 3) {
        sendMessage(senderNumber, `❌ Please provide all required information in the correct format:

1. Employee Name:
2. Store:
3. Contact Number:

Example:
John Smith
Doornkop
0123456789`);
        return;
    }
    
    const documentData = {
        employee_name: lines[0],
        store: lines[1],
        contact_number: lines[2]
    };
    
    try {
        const queryId = await QueryModel.createQuery(
            senderNumber,
            userSession.selectedRegion,
            userSession.selectedStore,
            userSession.documentType,
            documentData
        );
        
        const docTypes = {
            'td_document': 'TD Document',
            'grn_statement': 'GRN Statement',
            'stock_sheet': 'Stock Sheet',
            'td_statement': 'TD Statement Report'
        };
        
        sendMessage(senderNumber, `✅ ${docTypes[userSession.documentType]} request submitted successfully!

Query ID: #${queryId}

📋 Submitted Details:
- Employee: ${documentData.employee_name}
- Store: ${documentData.store}
- Contact: ${documentData.contact_number}

You will receive it shortly.`);
        
        userSession.step = 'main_menu';
        delete userSession.documentData;
        delete userSession.documentType;
        
    } catch (error) {
        console.error('Error submitting document request:', error);
        sendMessage(senderNumber, 'Sorry, there was an error submitting your document request. Please try again later.');
    }
}

module.exports = { showDocumentOptions, handleDocument, handleDocumentDetails };