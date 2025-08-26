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

module.exports = { sendMessage }; 