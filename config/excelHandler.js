const axios = require('axios');
const XLSX = require('xlsx');
const FormData = require('form-data');

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

/**
 * Parse Excel file and extract customer data
 * Expected Excel format: Columns - Name, Contact Number, Additional Info (optional)
 */
function parseExcelData(buffer) {
    try {
        console.log('📊 Parsing Excel file...');

        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; // Get first sheet
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
            throw new Error('Excel file is empty');
        }

        // Extract headers and data
        const headers = jsonData[0];
        const rows = jsonData.slice(1);

        console.log(`📋 Found ${rows.length} customer records`);

        // Parse customer data
        const customers = rows
            .filter(row => row && row.length > 0 && row[0]) // Filter empty rows
            .map((row, index) => {
                const customer = {};
                headers.forEach((header, i) => {
                    if (header && row[i]) {
                        const key = header.toString().toLowerCase().replace(/\s+/g, '_');
                        customer[key] = row[i];
                    }
                });
                return customer;
            });

        console.log(`✅ Parsed ${customers.length} valid customer records`);

        return {
            totalRecords: customers.length,
            customers: customers,
            headers: headers
        };

    } catch (error) {
        console.error('❌ Error parsing Excel file:', error);
        throw error;
    }
}

/**
 * Upload Excel file to ImgBB (supports various file types)
 */
async function uploadExcelFile(fileBuffer, fileName) {
    try {
        console.log('📤 Uploading Excel file to ImgBB:', fileName);

        const base64File = fileBuffer.toString('base64');

        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64File); // ImgBB uses 'image' param even for other files
        formData.append('name', fileName);

        const response = await axios.post(IMGBB_UPLOAD_URL, formData, {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data.success) {
            const fileData = response.data.data;
            console.log('✅ Excel file uploaded successfully:', fileData.url);

            return {
                url: fileData.url,
                public_id: fileData.id,
                delete_url: fileData.delete_url
            };
        } else {
            throw new Error('ImgBB upload failed');
        }
    } catch (error) {
        console.error('❌ Error uploading Excel file to ImgBB:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Download Excel file from Twilio and process it
 */
async function downloadAndProcessExcelFromTwilio(mediaUrl, fileName) {
    try {
        console.log('📥 Downloading Excel file from Twilio:', mediaUrl);

        // Download Excel file from Twilio using axios
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
            throw new Error(`Failed to download Excel file: ${response.statusText}`);
        }

        const fileBuffer = Buffer.from(response.data);
        console.log('✅ Excel file downloaded, size:', fileBuffer.length, 'bytes');

        // Parse Excel data
        const excelData = parseExcelData(fileBuffer);

        // Upload to ImgBB for storage
        const uploadResult = await uploadExcelFile(fileBuffer, fileName);

        return {
            ...uploadResult,
            customerData: excelData
        };

    } catch (error) {
        console.error('❌ Error downloading and processing Excel file:', error);
        throw error;
    }
}

/**
 * Check if the content type is Excel
 */
function isExcelFile(contentType) {
    if (!contentType) return false;

    const excelTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/excel',
        'application/x-excel',
        'application/x-msexcel'
    ];

    return excelTypes.some(type => contentType.includes(type));
}

module.exports = {
    downloadAndProcessExcelFromTwilio,
    parseExcelData,
    uploadExcelFile,
    isExcelFile
};
