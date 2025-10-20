const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, retryConfig = RETRY_CONFIG) {
    let lastError;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if error is retryable (5xx errors or rate limits)
            const isRetryable = error.status >= 500 || error.code === 20429 || error.code === 20503;

            if (!isRetryable || attempt === retryConfig.maxRetries) {
                console.error(`❌ Failed after ${attempt + 1} attempt(s):`, error.message);
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt),
                retryConfig.maxDelayMs
            );

            console.warn(`⚠️ Attempt ${attempt + 1} failed with ${error.code}: ${error.message}`);
            console.warn(`⏳ Retrying in ${delay}ms...`);

            await sleep(delay);
        }
    }

    throw lastError;
}

function sendMessage(to, message) {
    return retryWithBackoff(() =>
        client.messages.create({
            from: twilioNumber,
            to: to,
            body: message
        })
    );
}

function sendMessageWithMedia(to, message, mediaUrl) {
    console.log('📤 Sending message with media to:', to);
    console.log('📎 Media URL:', mediaUrl);

    return retryWithBackoff(() =>
        client.messages.create({
            from: twilioNumber,
            to: to,
            body: message,
            mediaUrl: [mediaUrl]
        })
    );
}

module.exports = { sendMessage, sendMessageWithMedia }; 