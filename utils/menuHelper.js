const { sendMessage } = require('./twilioClient');

function showMainMenu(senderNumber) {
    console.log('📋 Showing main menu to:', senderNumber);

    const menu = `Main Menu:
• Query
• Over Sale Approval
• Request Document
• Training
• Escalation

Please type:
1 for Query
2 for Over Sale Approval
3 for Request Document
4 for Training
5 for Escalation

📷 Tip: You can send images with your requests for better support!

Type "reset" to start over from region selection.`;

    sendMessage(senderNumber, menu);
}

module.exports = { showMainMenu };
