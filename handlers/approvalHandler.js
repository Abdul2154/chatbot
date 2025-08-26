const { sendMessage } = require('../utils/twilioClient');
const QueryModel = require('../models/queries');

function showApprovalForm(senderNumber) {
    const message = `OVER SALE APPROVAL

Please provide the following information (separate each field with a new line):

1. Employee Number:
2. Requested Approval Amount:
3. Net Pay Amount:

Example:
EMP001
5000
15000

Note: Please also upload your latest payslip if possible.`;
    
    sendMessage(senderNumber, message);
}

async function handleApproval(message, senderNumber, userSession) {
    const userInput = message.trim();
    const lines = userInput.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 3) {
        sendMessage(senderNumber, `❌ Please provide all required information in the correct format:

1. Employee Number:
2. Requested Approval Amount:
3. Net Pay Amount:

Example:
EMP001
5000
15000`);
        return;
    }
    
    const approvalData = {
        employee_number: lines[0],
        requested_amount: lines[1],
        net_pay: lines[2]
    };
    
    try {
        const queryId = await QueryModel.createQuery(
            senderNumber,
            userSession.selectedRegion,
            userSession.selectedStore,
            'over_sale_approval',
            approvalData
        );
        
        sendMessage(senderNumber, `✅ Over sale approval request submitted successfully!

Query ID: #${queryId}

📋 Submitted Details:
- Employee: ${approvalData.employee_number}
- Requested Amount: R${approvalData.requested_amount}
- Net Pay: R${approvalData.net_pay}

Please upload your latest payslip if you haven't already. Your request will be forwarded to your manager for approval.`);
        
        userSession.step = 'main_menu';
        
    } catch (error) {
        console.error('Error submitting approval:', error);
        sendMessage(senderNumber, 'Sorry, there was an error submitting your approval request. Please try again later.');
    }
}

module.exports = { showApprovalForm, handleApproval };