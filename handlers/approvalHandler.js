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

📷 You can also send your latest payslip image before or after entering the details.

Type "menu" to return to main menu.`;

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
            approvalData,
            userSession.imageUrl || null,
            userSession.imagePublicId || null
        );

        let confirmationMessage = `✅ Over Sale Approval request submitted successfully!

Query ID: #${queryId}`;

        if (userSession.imageUrl) {
            confirmationMessage += '\n📷 Payslip image attached successfully!';
        } else {
            confirmationMessage += '\n\nNote: You can upload your payslip later if needed.';
        }

        confirmationMessage += '\n\nYour request will be forwarded to manager/approver for review.\n\nThank you!';

        sendMessage(senderNumber, confirmationMessage);

        userSession.step = 'main_menu';
        delete userSession.imageUrl;
        delete userSession.imagePublicId;

    } catch (error) {
        console.error('Error submitting approval:', error);
        sendMessage(senderNumber, 'Sorry, there was an error submitting your approval request. Please try again later.');
    }
}

module.exports = { showApprovalForm, handleApproval };
