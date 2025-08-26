const { sendMessage } = require('../utils/twilioClient');
const QueryModel = require('../models/queries');

function showDocumentOptions(senderNumber) {
    const message = `REQUEST DOCUMENT
Which document do you need?

1. TD Document (Allow image upload)
2. GRN Statement (Allow image upload)
3. Stock Sheet (Notify Head Office)
4. Leave Form (Send preloaded downloadable PDF)
5. TD Statement Report (Submit formal request)

Please type the number (1-5):`;
    
    sendMessage(senderNumber, message);
}

async function handleDocument(message, senderNumber, userSession) {
    const choice = message.trim();
    
    switch (choice) {
        case '1':
            userSession.documentType = 'td_document';
            userSession.step = 'document_details';
            sendMessage(senderNumber, `📄 TD DOCUMENT

You can upload an image if needed.

Please provide the following information (one per line):
- Employee Name
- Store
- Contact Number

Example:
John Smith
Doornkop
0123456789`);
            break;
            
        case '2':
            userSession.documentType = 'grn_statement';
            userSession.step = 'document_details';
            sendMessage(senderNumber, `📊 GRN STATEMENT

You can upload an image if needed.

Please provide the following information (one per line):
- Employee Name
- Store
- Contact Number

Example:
John Smith
Doornkop
0123456789`);
            break;
            
        case '3':
            userSession.documentType = 'stock_sheet';
            userSession.step = 'document_details';
            sendMessage(senderNumber, `📋 STOCK SHEET

Head Office will be notified.

Please provide the following information (one per line):
- Employee Name
- Store
- Contact Number

Example:
John Smith
Doornkop
0123456789`);
            break;
            
        case '4':
            try {
                const queryId = await QueryModel.createQuery(
                    senderNumber,
                    userSession.selectedRegion,
                    userSession.selectedStore,
                    'leave_form',
                    { 
                        document_type: 'leave_form',
                        action: 'send_preloaded_downloadable_pdf'
                    }
                );
                
                sendMessage(senderNumber, `📝 LEAVE FORM

Query ID: #${queryId}

A preloaded downloadable PDF will be sent to you shortly.

Thank you!`);
            } catch (error) {
                console.error('Error submitting leave form request:', error);
                sendMessage(senderNumber, 'Sorry, there was an error processing your request. Please try again later.');
            }
            userSession.step = 'main_menu';
            break;
            
        case '5':
            userSession.documentType = 'td_statement_report';
            userSession.step = 'document_details';
            sendMessage(senderNumber, `📈 TD STATEMENT REPORT

Formal request will be submitted.

Please provide the following information (one per line):
- Employee Name
- Store
- Contact Number

Example:
John Smith
Doornkop
0123456789`);
            break;
            
        default:
            sendMessage(senderNumber, 'Please select a valid option (1-5)');
    }
}

async function handleDocumentDetails(message, senderNumber, userSession) {
    const userInput = message.trim();
    const lines = userInput.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 3) {
        sendMessage(senderNumber, `❌ Please provide all required information:

- Employee Name
- Store
- Contact Number

Example:
John Smith
Doornkop
0123456789`);
        return;
    }
    
    const documentData = {
        employee_name: lines[0],
        store: lines[1],
        contact_number: lines[2],
        document_type: userSession.documentType
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
            'td_document': 'TD Document (image upload allowed)',
            'grn_statement': 'GRN Statement (image upload allowed)',
            'stock_sheet': 'Stock Sheet (Head Office notified)',
            'td_statement_report': 'TD Statement Report (formal request)'
        };
        
        sendMessage(senderNumber, `✅ ${docTypes[userSession.documentType]} request submitted successfully!

Query ID: #${queryId}

You will receive your document shortly.

Thank you!`);
        
        userSession.step = 'main_menu';
        delete userSession.documentData;
        delete userSession.documentType;
        
    } catch (error) {
        console.error('Error submitting document request:', error);
        sendMessage(senderNumber, 'Sorry, there was an error submitting your document request. Please try again later.');
    }
}

module.exports = { showDocumentOptions, handleDocument, handleDocumentDetails };
