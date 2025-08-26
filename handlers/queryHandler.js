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
- Employee Number
- Bank Name
- Account Number
- Branch
- Reason
- Amount

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
- Employee Number

Example: EMP001`);
            break;
            
        case '3':
            userSession.queryType = 'stationery_request';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `📋 STATIONERY REQUEST

Please provide:
- List of Items

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
- Employee Number
- Name & Surname
- Contact Number

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
- Employee Number

Example: EMP001`);
            break;
            
        case '6':
            userSession.queryType = 'operator_call_back';
            userSession.step = 'query_details';
            sendMessage(senderNumber, `📞 OPERATOR CALL BACK

Please provide:
- Nature of Emergency

Example: System down, cannot process sales`);
            break;
            
        default:
            sendMessage(senderNumber, 'Please select a valid option (1-6)');
    }
}

async function handleQueryDetails(message, senderNumber, userSession) {
    const userInput = message.trim();
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
            queryData
        );
        
        sendMessage(senderNumber, `✅ Query submitted successfully!

Your Query ID: #${queryId}

Our team has been notified and will respond shortly.

Thank you for using our support system!`);
        
        userSession.step = 'main_menu';
        delete userSession.queryData;
        delete userSession.queryType;
        
    } catch (error) {
        console.error('Error submitting query:', error);
        sendMessage(senderNumber, 'Sorry, there was an error submitting your query. Please try again later.');
    }
}

module.exports = { showQueryOptions, handleQuery, handleQueryDetails };
