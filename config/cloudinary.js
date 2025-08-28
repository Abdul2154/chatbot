const cloudinary = require('cloudinary').v2;
const axios = require('axios');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadImage(imageBuffer, fileName) {
    try {
        console.log('📤 Uploading image to Cloudinary:', fileName);
        
        const result = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
            {
                folder: 'whatsapp-chatbot',
                public_id: fileName,
                resource_type: 'image',
                transformation: [
                    { width: 800, height: 600, crop: 'limit' },
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            }
        );
        
        console.log('✅ Image uploaded successfully:', result.secure_url);
        
        return {
            url: result.secure_url,
            public_id: result.public_id
        };
    } catch (error) {
        console.error('❌ Error uploading image to Cloudinary:', error);
        throw error;
    }
}

async function downloadAndUploadFromTwilio(mediaUrl, fileName) {
    try {
        console.log('📥 Downloading image from Twilio:', mediaUrl);
        
        // Download image from Twilio using axios
        const response = await axios({
            method: 'get',
            url: mediaUrl,
            responseType: 'arraybuffer',
            auth: {
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN
            }
        });
        
        if (response.status !== 200) {
            throw new Error(`Failed to download image: ${response.statusText}`);
        }
        
        const imageBuffer = Buffer.from(response.data);
        console.log('✅ Image downloaded, size:', imageBuffer.length, 'bytes');
        
        // Upload to Cloudinary
        return await uploadImage(imageBuffer, fileName);
        
    } catch (error) {
        console.error('❌ Error downloading and uploading image:', error);
        throw error;
    }
}

async function deleteImage(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log('🗑️ Image deleted from Cloudinary:', publicId);
        return result;
    } catch (error) {
        console.error('❌ Error deleting image:', error);
        throw error;
    }
}

module.exports = { uploadImage, downloadAndUploadFromTwilio, deleteImage };
