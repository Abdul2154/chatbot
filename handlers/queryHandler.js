const { sendMessage } = require('../utils/twilioClient');
const QueryModel = require('../models/queries');

function showQueryOptions(senderNumber) {
    const message = `QUERY
What kind of query is this?

1. Refund Request
2. System Balance  
3. Stationery Request
4. Add New Customer
5. Unblock Customer
6. Credit Notes
7. Operator Call Back

Type the number of your choice (1-7):`;
    
    sendMessage(senderNumber, message);
}

async function handleQuery(message, senderNumber, userSession) {
    const choice = message.trim();
    
    switch (choice) {
        case '1':
            userSession.queryType = 'refund';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `📝 REFUND REQUEST

Please provide the following information (separate each field with a new line):

1. Employee Number:
2. Bank Name:
3. Account Number:
4. Branch:
5. Reason for refund:
6. Amount:

Example:
EMP001
Standard Bank
1234567890
Johannesburg
Wrong item delivered
500`);
            break;
        case '2':
            userSession.queryType = 'balance';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `💰 SYSTEM BALANCE INQUIRY

Please provide your Employee Number:

Example: EMP001`);
            break;
        case '3':
            userSession.queryType = 'stationery';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `📋 STATIONERY REQUEST

Please provide the list of items you need (separate each item with a new line):

Example:
Pens - 10 pieces
A4 Paper - 5 reams
Stapler - 2 pieces
Calculator - 1 piece`);
            break;
        case '4':
            userSession.queryType = 'add_customer';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `👤 ADD NEW CUSTOMER

Please provide the following information (separate each field with a new line):

1. Employee Number:
2. Customer Name & Surname:
3. Contact Number:

Example:
EMP001
John Smith
0123456789`);
            break;
        case '5':
            userSession.queryType = 'unblock_customer';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `🔓 UNBLOCK CUSTOMER

Please provide your Employee Number:

Example: EMP001`);
            break;
        case '6':
            userSession.queryType = 'credit_notes';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `📄 CREDIT NOTES

Please provide the following information (separate each field with a new line):

1. Employee Number:
2. Invoice Number:
3. Reason:

Example:
EMP001
INV12345
Product returned damaged`);
            break;
        case '7':
            userSession.queryType = 'callback';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `📞 OPERATOR CALL BACK

Please describe the nature of emergency:

Example: System down, unable to process sales`);
            break;
        default:
            sendMessage(senderNumber, 'Please select a valid option (1-7)');
    }
}

async function handleQueryDetails(message, senderNumber, userSession) {
    const userInput = message.trim();
    let queryData = {};
    
    try {
        switch (userSession.queryType) {
            case 'refund':
                queryData = parseRefundData(userInput);
                break;
            case 'balance':
                queryData = { employee_number: userInput };
                break;
            case 'stationery':
                queryData = { items_list: userInput };
                break;
            case 'add_customer':
                queryData = parseAddCustomerData(userInput);
                break;
            case 'unblock_customer':
                queryData = { employee_number: userInput };
                break;
            case 'credit_notes':
                queryData = parseCreditNotesData(userInput);
                break;
            case 'callback':
                queryData = { emergency_nature: userInput };
                break;
        }
        
        await submitQuery(senderNumber, userSession, queryData);
        
    } catch (error) {
        console.error('Error parsing query data:', error);
        sendMessage(senderNumber, `❌ Please provide the information in the correct format. Type the number again to see the example format.`);
    }
}

function parseRefundData(userInput) {
    const lines = userInput.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 6) {
        throw new Error('Insufficient information provided');
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
        throw new Error('Insufficient information provided');
    }
    
    return {
        employee_number: lines[0],
        customer_name: lines[1],
        contact_number: lines[2]
    };
}

function parseCreditNotesData(userInput) {
    const lines = userInput.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 3) {
        throw new Error('Insufficient information provided');
    }
    
    return {
        employee_number: lines[0],
        invoice_number: lines[1],
        reason: lines[2]
    };
}

async function submitQuery(senderNumber, userSession, queryData) {
    try {
        const queryId = await QueryModel.createQuery(
            senderNumber,
            userSession.selectedRegion,
            userSession.selectedStore,
            userSession.queryType,
            queryData
        );
        
        sendMessage(senderNumber, `✅ Query submitted successfully! 

Your Query ID: #${queryId}

📋 Submitted Details:
${formatQueryData(userSession.queryType, queryData)}

Our team has been notified and will respond shortly. You can check the status by typing "my queries".

Thank you for using our support system!`);
        
        userSession.step = 'main_menu';
        delete userSession.queryData;
        delete userSession.queryType;
        delete userSession.currentField;
        
    } catch (error) {
        console.error('Error submitting query:', error);
        sendMessage(senderNumber, 'Sorry, there was an error submitting your query. Please try again later.');
    }
}

function formatQueryData(queryType, queryData) {
    switch (queryType) {
        case 'refund':
            return `• Employee: ${queryData.employee_number}
• Bank: ${queryData.bank_name}
• Account: ${queryData.account_number}
• Branch: ${queryData.branch}
• Reason: ${queryData.reason}
• Amount: R${queryData.amount}`;
        
        case 'balance':
            return `• Employee: ${queryData.employee_number}`;
        
        case 'stationery':
            return `• Items: ${queryData.items_list}`;
        
        case 'add_customer':
            return `• Employee: ${queryData.employee_number}
• Customer: ${queryData.customer_name}
• Contact: ${queryData.contact_number}`;
        
        case 'unblock_customer':
            return `• Employee: ${queryData.employee_number}`;
        
        case 'credit_notes':
            return `• Employee: ${queryData.employee_number}
• Invoice: ${queryData.invoice_number}
• Reason: ${queryData.reason}`;
        
        case 'callback':
            return `• Emergency: ${queryData.emergency_nature}`;
        
        default:
            return JSON.stringify(queryData, null, 2);
    }
}

module.exports = { 
    showQueryOptions, 
    handleQuery, 
    handleQueryDetails 
};