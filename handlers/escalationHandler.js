const { sendMessage } = require('../utils/twilioClient');
const QueryModel = require('../models/queries');

function showEscalationForm(senderNumber) {
    const message = `ESCALATION

Please describe the issue briefly. Our team will get back to you shortly.

Please provide the following information (one per line):
- Store
- Employee Name
- Issue Description
- Contact Number

Example:
Doornkop
John Smith
System not working, cannot process transactions
0123456789`;
    
    sendMessage(senderNumber, message);
}

async function handleEscalation(message, senderNumber, userSession) {
    const userInput = message.trim();
    const lines = userInput.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 4) {
        sendMessage(senderNumber, `❌ Please provide all required information:

- Store
- Employee Name  
- Issue Description
- Contact Number

Example:
Doornkop
John Smith
System not working
0123456789`);
        return;
    }
    
    const escalationData = {
        store: lines[0],
        employee_name: lines[1],
        issue_description: lines[2],
        contact_number: lines[3]
    };
    
    try {
        const queryId = await QueryModel.createQuery(
            senderNumber,
            userSession.selectedRegion,
            userSession.selectedStore,
            'escalation',
            escalationData
        );
        
        sendMessage(senderNumber, `✅ Escalation request submitted successfully!

Query ID: #${queryId}

Our team will get back to you shortly regarding your issue.

Thank you!`);
        
        userSession.step = 'main_menu';
        
    } catch (error) {
        console.error('Error submitting escalation:', error);
        sendMessage(senderNumber, 'Sorry, there was an error submitting your escalation. Please try again later.');
    }
}

module.exports = { showEscalationForm, handleEscalation };
