const { sendMessage } = require('../utils/twilioClient');

function showTrainingOptions(senderNumber) {
    const message = `TRAINING
What topic do you need training on?

1. Receiving Stock
2. Refund Requests
3. Merchandising  
4. Stock Counting
5. Transferring Stock
6. Viewing Balances
7. Printing

Type the number of your choice (1-7):`;
    
    sendMessage(senderNumber, message);
}

async function handleTraining(message, senderNumber, userSession) {
    const choice = message.trim();
    const trainingContent = {
        '1': `📚 RECEIVING STOCK TRAINING:

1. Check delivery note against order
2. Count items carefully
3. Verify product quality
4. Update system immediately
5. Store items in correct locations
6. Report any discrepancies

📹 Video guide: [Training Link]
📄 PDF guide: [Document Link]`,

        '2': `📚 REFUND REQUESTS TRAINING:

1. Check receipt validity
2. Verify item condition
3. Confirm return policy compliance
4. Process refund in system
5. Issue refund receipt
6. Update inventory

📹 Video guide: [Training Link]
📄 PDF guide: [Document Link]`,

        '3': `📚 MERCHANDISING TRAINING:

1. Arrange products attractively
2. Check and update pricing
3. Maintain product displays
4. Ensure cleanliness
5. Monitor stock levels
6. Follow planogram guidelines

📹 Video guide: [Training Link]
📄 PDF guide: [Document Link]`,

        '4': `📚 STOCK COUNTING TRAINING:

1. Count physical stock accurately
2. Compare with system records
3. Note any discrepancies
4. Double-check problem areas
5. Submit variance report
6. Update system if authorized

📹 Video guide: [Training Link]
📄 PDF guide: [Document Link]`,

        '5': `📚 TRANSFERRING STOCK TRAINING:

1. Create transfer documentation
2. Pack items securely
3. Update system records
4. Arrange transportation
5. Send to destination
6. Confirm receipt

📹 Video guide: [Training Link]
📄 PDF guide: [Document Link]`,

        '6': `📚 VIEWING BALANCES TRAINING:

1. Access system properly
2. Select correct item
3. Check current balance
4. Note last update time
5. Verify accuracy
6. Report issues if found

📹 Video guide: [Training Link]
📄 PDF guide: [Document Link]`,

        '7': `📚 PRINTING TRAINING:

1. Select correct document
2. Choose appropriate printer
3. Check printer settings
4. Preview before printing
5. Print and verify output
6. Report printer issues

📹 Video guide: [Training Link]
📄 PDF guide: [Document Link]`
    };
    
    if (trainingContent[choice]) {
        sendMessage(senderNumber, trainingContent[choice]);
        userSession.step = 'main_menu';
    } else {
        sendMessage(senderNumber, 'Please select a valid option (1-7)');
    }
}

module.exports = { showTrainingOptions, handleTraining };