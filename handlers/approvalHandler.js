const { sendMessage } = require('../utils/twilioClient');
const QueryModel = require('../models/queries');

function showApprovalForm(senderNumber) {
    const message = `OVER SALE APPROVAL

Please upload your latest payslip and fill in the following:

Please provide (one per line):
- Employee number 
- Requested Approval Amount
- Net Pay Amount

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
        sendMessage(senderNumber, `❌ Please provide all required information:

- Employee number 
- Requested Approval Amount
- Net Pay Amount

Example:
EMP001
5000
15000`);
        return;
    }
    
    const approvalData = {
        employee_number: lines[0],
        requested_approval_amount: lines[1],
        net_pay_amount: lines[2]
    };
    
    try {
        const queryId = await QueryModel.createQuery(
            senderNumber,
            userSession.selectedRegion,
            userSession.selectedStore,
            'over_sale_approval',
            approvalData
        );
        
        sendMessage(senderNumber, `✅ Over Sale Approval request submitted successfully!

Query ID: #${queryId}

Your request will be forwarded to manager/approver for review.

Please upload your latest payslip if you haven't already.

Thank you!`);
        
        userSession.step = 'main_menu';
        
    } catch (error) {
        console.error('Error submitting approval:', error);
        sendMessage(senderNumber, 'Sorry, there was an error submitting your approval request. Please try again later.');
    }
}

module.exports = { showApprovalForm, handleApproval };
