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

Please type the number (1-5)

Type "menu" to return to main menu.`;

    sendMessage(senderNumber, message);
}

async function handleDocument(message, senderNumber, userSession) {
    const choice = message.trim();
    
    switch (choice) {
        case '1':
            userSession.documentType = 'td_document';
            userSession.step = 'document_details';
            sendMessage(senderNumber, `📄 TD DOCUMENT

📷 You can upload an image if needed.

Please provide the following information (one per line):
- GRN Number
- From Store
- To Store

Example:
GRN12345
Doornkop
Johannesburg Central

Type "menu" to return to main menu.`);
            break;
            
        case '2':
            try {
                const queryId = await QueryModel.createQuery(
                    senderNumber,
                    userSession.selectedRegion,
                    userSession.selectedStore,
                    'grn_statement',
                    {
                        document_type: 'grn_statement',
                        action: 'send_statement'
                    }
                );

                sendMessage(senderNumber, `📊 GRN STATEMENT

Query ID: #${queryId}

Your GRN Statement will be sent to you shortly.

Thank you!`);
            } catch (error) {
                console.error('Error submitting GRN statement request:', error);
                sendMessage(senderNumber, 'Sorry, there was an error processing your request. Please try again later.');
            }
            userSession.step = 'main_menu';
            break;
            
        case '3':
            try {
                const queryId = await QueryModel.createQuery(
                    senderNumber,
                    userSession.selectedRegion,
                    userSession.selectedStore,
                    'stock_sheet',
                    {
                        document_type: 'stock_sheet',
                        action: 'notify_head_office'
                    }
                );

                sendMessage(senderNumber, `📋 STOCK SHEET

Query ID: #${queryId}

Head Office has been notified and will send the stock sheet shortly.

Thank you!`);
            } catch (error) {
                console.error('Error submitting stock sheet request:', error);
                sendMessage(senderNumber, 'Sorry, there was an error processing your request. Please try again later.');
            }
            userSession.step = 'main_menu';
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
            try {
                const queryId = await QueryModel.createQuery(
                    senderNumber,
                    userSession.selectedRegion,
                    userSession.selectedStore,
                    'td_statement_report',
                    {
                        document_type: 'td_statement_report',
                        action: 'submit_formal_request'
                    }
                );

                sendMessage(senderNumber, `📈 TD STATEMENT REPORT

Query ID: #${queryId}

Your formal request has been submitted. The TD Statement Report will be sent to you shortly.

Thank you!`);
            } catch (error) {
                console.error('Error submitting TD statement request:', error);
                sendMessage(senderNumber, 'Sorry, there was an error processing your request. Please try again later.');
            }
            userSession.step = 'main_menu';
            break;
            
        default:
            sendMessage(senderNumber, 'Please select a valid option (1-5)');
    }
}

async function handleDocumentDetails(message, senderNumber, userSession) {
    const userInput = message.trim();
    const lines = userInput.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length < 3) {
        // Different validation message based on document type
        if (userSession.documentType === 'td_document') {
            sendMessage(senderNumber, `❌ Please provide all required information:

- GRN Number
- From Store
- To Store

Example:
GRN12345
Doornkop
Johannesburg Central`);
        } else {
            sendMessage(senderNumber, `❌ Please provide all required information:

- Employee Name
- Store
- Contact Number

Example:
John Smith
Doornkop
0123456789`);
        }
        return;
    }

    // Different data structure for TD Document
    let documentData;
    if (userSession.documentType === 'td_document') {
        documentData = {
            grn_number: lines[0],
            from_store: lines[1],
            to_store: lines[2],
            document_type: userSession.documentType
        };
    } else {
        documentData = {
            employee_name: lines[0],
            store: lines[1],
            contact_number: lines[2],
            document_type: userSession.documentType
        };
    }
    
    try {
        const queryId = await QueryModel.createQuery(
            senderNumber,
            userSession.selectedRegion,
            userSession.selectedStore,
            userSession.documentType,
            documentData,
            userSession.imageUrl || null,
            userSession.imagePublicId || null
        );

        const docTypes = {
            'td_document': 'TD Document',
            'grn_statement': 'GRN Statement',
            'stock_sheet': 'Stock Sheet (Head Office notified)',
            'td_statement_report': 'TD Statement Report'
        };

        let confirmationMessage = `✅ ${docTypes[userSession.documentType]} request submitted successfully!

Query ID: #${queryId}`;

        if (userSession.imageUrl) {
            confirmationMessage += '\n📷 Supporting image attached successfully!';
        }

        confirmationMessage += '\n\nYou will receive your document shortly.\n\nThank you!';

        sendMessage(senderNumber, confirmationMessage);

        userSession.step = 'main_menu';
        delete userSession.documentData;
        delete userSession.documentType;
        delete userSession.imageUrl;
        delete userSession.imagePublicId;

    } catch (error) {
        console.error('Error submitting document request:', error);
        sendMessage(senderNumber, 'Sorry, there was an error submitting your document request. Please try again later.');
    }
}

module.exports = { showDocumentOptions, handleDocument, handleDocumentDetails };
