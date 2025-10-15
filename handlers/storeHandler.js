const { sendMessage } = require('../utils/twilioClient');
const { getStoresByRegion } = require('../config/stores');
const { showMainMenu } = require('../utils/menuHelper');

function showStoreOptions(senderNumber, region) {
    const stores = getStoresByRegion(region);
    let storeList = `Select Store (based on chosen region - ${region.toUpperCase()}):\n\n`;

    stores.forEach((store, index) => {
        storeList += `${index + 1}. ${store}\n`;
    });

    storeList += '\nPlease type the number of your store:\n\nType "reset" to start over.';
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

module.exports = { showStoreOptions, handleStoreSelection };
