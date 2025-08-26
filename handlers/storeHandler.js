const { sendMessage } = require('../utils/twilioClient');
const { getStoresByRegion } = require('../config/stores');

function showStoreOptions(senderNumber, region) {
    const stores = getStoresByRegion(region);
    let storeList = `Please select your store from ${region.toUpperCase()} region:\n\n`;
    
    stores.forEach((store, index) => {
        storeList += `${index + 1}. ${store}\n`;
    });
    
    storeList += '\nType the number of your store:';
    sendMessage(senderNumber, storeList);
}

function handleStoreSelection(message, senderNumber, userSession) {
    const stores = getStoresByRegion(userSession.selectedRegion);
    const choice = parseInt(message.trim()) - 1;
    
    if (choice >= 0 && choice < stores.length) {
        userSession.selectedStore = stores[choice];
        sendMessage(senderNumber, `✅ Store selected: ${stores[choice]}`);
        
        // Show main menu after store selection
        userSession.step = 'main_menu';
        showMainMenu(senderNumber);
    } else {
        sendMessage(senderNumber, 'Invalid selection. Please choose a valid store number.');
    }
}

function showMainMenu(senderNumber) {
    const menu = `Main Menu:

1️⃣ Query
2️⃣ Over Sale Approval
3️⃣ Request Document
4️⃣ Training
5️⃣ Escalation

Type the number of your choice (1-5):`;
    
    sendMessage(senderNumber, menu);
}

module.exports = { showStoreOptions, handleStoreSelection };