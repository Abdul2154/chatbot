const { sendMessage } = require('../utils/twilioClient');
const QueryModel = require('../models/queries');

function showQueryOptions(senderNumber) {
    const message = `QUERY
What kind of query is this?

Options:
1. Refund Request
2. System Balance
3. Stationery Request
4. Add New Customer
5. Unblock Customer
6. Operator Call Back

Please type the number (1-6):`;
    
    sendMessage(senderNumber, message);
}

async function handleQuery(message, senderNumber, userSession) {
    const choice = message.trim();
    
    switch (choice) {
        case '1':
            userSession.queryType = 'refund_request';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `📝 REFUND REQUEST

Please provide the following information (one per line):
• Employee Number
• Bank Name
• Account Number
• Branch
• Reason
• Amount

📷 You can also send an image (receipt, proof) along with this information.

Example:
EMP001
Standard Bank
1234567890
Johannesburg
Wrong item delivered
500`);
            break;
            
        case '2':
            userSession.queryType = 'system_balance';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `💰 SYSTEM BALANCE

Please provide:
• Employee Number

Example: EMP001`);
            break;
            
        case '3':
            userSession.queryType = 'stationery_request';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `📋 STATIONERY REQUEST

Please provide:
• List of Items

📷 You can send an image showing what items you need.

Example:
Pens - 10 pieces
Paper - 5 reams
Stapler - 2 pieces`);
            break;
            
        case '4':
            userSession.queryType = 'add_new_customer';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `👤 ADD NEW CUSTOMER

Please provide the following information (one per line):
• Employee Number
• Name & Surname
• Contact Number

📷 You can send an image of customer ID or documents.

Example:
EMP001
John Smith
0123456789`);
            break;
            
        case '5':
            userSession.queryType = 'unblock_customer';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `🔓 UNBLOCK CUSTOMER

Please provide:
• Employee Number

📷 You can send supporting documents if needed.

Example: EMP001`);
            break;
            
        case '6':
            userSession.queryType = 'operator_call_back';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `📞 OPERATOR CALL BACK

Please provide:
• Nature of Emergency

📷 You can send screenshots of error messages if applicable.

Example: System down, cannot process sales`);
            break;
            
        default:
            sendMessage(senderNumber, 'Please select a valid option (1-6)');
    }
}

async function handleQueryDetails(message, senderNumber, userSession) {
    // Skip image processing if message is just for skipping image
    if (message && message.toLowerCase().trim() === 'skip') {
        delete userSession.imageUrl;
        delete userSession.imagePublicId;
        sendMessage(senderNumber, '⏭️ Continuing without image...');
        return;
    }
    
    const userInput = message ? message.trim() : '';
    let queryData = {};
    
    try {
        switch (userSession.queryType) {
            case 'refund_request':
                queryData = parseRefundData(userInput);
                break;
            case 'system_balance':
                queryData = { employee_number: userInput };
                break;
            case 'stationery_request':
                queryData = { list_of_items: userInput };
                break;
            case 'add_new_customer':
                queryData = parseAddCustomerData(userInput);
                break;
            case 'unblock_customer':
                queryData = { employee_number: userInput };
                break;
            case 'operator_call_back':
                queryData = { nature_of_emergency: userInput };
                break;
        }
        
        await submitQuery(senderNumber, userSession, queryData);
        
    } catch (error) {
        console.error('Error parsing query data:', error);
        sendMessage(senderNumber, `❌ Please provide the information in the correct format. Please try again.`);
    }
}

function parseRefundData(userInput) {
    const lines = userInput.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 6) {
        throw new Error('All 6 fields required: Employee Number, Bank Name, Account Number, Branch, Reason, Amount');
    }
    
    return {
        employee_number: lines[0],
        bank_name: lines[1],
        account_number: lines[2],
        branch: lines[3],
        reason: lines[4],
        amount: lines[5]
    };
}

function parseAddCustomerData(userInput) {
    const lines = userInput.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 3) {
        throw new Error('All 3 fields required: Employee Number, Name & Surname, Contact Number');
    }
    
    return {
        employee_number: lines[0],
        name_surname: lines[1],
        contact_number: lines[2]
    };
}
async function submitQuery(senderNumber, userSession, queryData) {
    try {
        const queryId = await QueryModel.createQuery(
            senderNumber,
            userSession.selectedRegion,
            userSession.selectedStore,
            userSession.queryType,
            queryData,
            userSession.imageUrl || null,
            userSession.imagePublicId || null
        );
        
        let confirmationMessage = `✅ Query submitted successfully! 

Your Query ID: #${queryId}`;

        if (userSession.imageUrl) {
            confirmationMessage += '\n📷 Image attached successfully!';
        }

        confirmationMessage += `

📋 Summary:
- Store: ${userSession.selectedStore} (${userSession.selectedRegion})
- Type: ${userSession.queryType.replace('_', ' ').toUpperCase()}

Our team has been notified and will respond shortly.

Thank you for using our support system! 🙏`;
        
        sendMessage(senderNumber, confirmationMessage);
        
        // Reset session to main menu
        userSession.step = 'main_menu';
        delete userSession.queryData;
        delete userSession.queryType;
        delete userSession.imageUrl;
        delete userSession.imagePublicId;
        
        // Show main menu again
        setTimeout(() => {
            showMainMenu(senderNumber);
        }, 2000); // Wait 2 seconds before showing main menu
        
    } catch (error) {
        console.error('Error submitting query:', error);
        sendMessage(senderNumber, 'Sorry, there was an error submitting your query. Please try again later.');
    }
}

function showMainMenu(senderNumber) {
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
5 for Escalation

📷 Tip: You can send images with your requests for better support!`;
    
    sendMessage(senderNumber, menu);
}

module.exports = { showQueryOptions, handleQuery, handleQueryDetails };