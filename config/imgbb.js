const axios = require('axios');
const FormData = require('form-data');

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

async function uploadImage(imageBuffer, fileName) {
    try {
        console.log('📤 Uploading image to ImgBB:', fileName);

        const base64Image = imageBuffer.toString('base64');

        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Image);
        formData.append('name', fileName);

        const response = await axios.post(IMGBB_UPLOAD_URL, formData, {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data.success) {
            const imageData = response.data.data;
            console.log('✅ Image uploaded successfully:', imageData.url);

            return {
                url: imageData.url,
                public_id: imageData.id,
                delete_url: imageData.delete_url
            };
        } else {
            throw new Error('ImgBB upload failed');
        }
    } catch (error) {
        console.error('❌ Error uploading image to ImgBB:', error.response?.data || error.message);
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

        // Upload to ImgBB
        return await uploadImage(imageBuffer, fileName);

    } catch (error) {
        console.error('❌ Error downloading and uploading image:', error);
        throw error;
    }
}

async function deleteImage(publicId) {
    try {
        console.log('⚠️ ImgBB does not support API-based deletion.');
        console.log('🗑️ Image can be deleted manually via delete URL if stored.');
        // ImgBB free tier doesn't support deletion via API
        // Images can only be deleted via the delete_url returned on upload
        return { result: 'ok', note: 'ImgBB free tier does not support API deletion' };
    } catch (error) {
        console.error('❌ Error deleting image:', error);
        throw error;
    }
}

module.exports = { uploadImage, downloadAndUploadFromTwilio, deleteImage };
