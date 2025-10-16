const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

function sendMessage(to, message) {
    return client.messages.create({
        from: twilioNumber,
        to: to,
        body: message
    });
}

function sendMessageWithMedia(to, message, mediaUrl) {
    console.log('📤 Sending message with media to:', to);
    console.log('📎 Media URL:', mediaUrl);

    return client.messages.create({
        from: twilioNumber,
        to: to,
        body: message,
        mediaUrl: [mediaUrl]
    });
}

module.exports = { sendMessage, sendMessageWithMedia }; 