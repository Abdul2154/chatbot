const axios = require('axios');
const XLSX = require('xlsx');
const { pool } = require('./database');

/**
 * Parse Excel file and extract customer data
 * Expected Excel format: Columns - Name, Contact Number, Additional Info (optional)
 */
function parseExcelData(buffer) {
    try {
        console.log('📊 Parsing Excel file...');
        console.log('📊 Buffer type:', typeof buffer);
        console.log('📊 Buffer length:', buffer ? buffer.length : 'null/undefined');
        console.log('📊 Is Buffer:', Buffer.isBuffer(buffer));

        if (!buffer || buffer.length === 0) {
            throw new Error('Excel file buffer is empty or invalid');
        }

        const workbook = XLSX.read(buffer, { type: 'buffer' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Excel file has no sheets');
        }

        const sheetName = workbook.SheetNames[0]; // Get first sheet
        console.log('📊 Using sheet:', sheetName);

        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            throw new Error(`Sheet "${sheetName}" not found in Excel file`);
        }

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log('📊 Total rows in Excel:', jsonData.length);

        if (jsonData.length === 0) {
            throw new Error('Excel file is empty - no data rows found');
        }

        if (jsonData.length === 1) {
            throw new Error('Excel file only contains headers - no customer data found');
        }

        // Extract headers and data
        const headers = jsonData[0];
        const rows = jsonData.slice(1);

        console.log(`📋 Headers found:`, headers);
        console.log(`📋 Found ${rows.length} customer records`);

        // Parse customer data
        const customers = rows
            .filter(row => row && row.length > 0 && row[0]) // Filter empty rows
            .map((row, index) => {
                const customer = {};
                headers.forEach((header, i) => {
                    if (header && row[i] !== undefined && row[i] !== null && row[i] !== '') {
                        const key = header.toString().toLowerCase().replace(/\s+/g, '_');
                        customer[key] = row[i];
                    }
                });
                return customer;
            });

        console.log(`✅ Parsed ${customers.length} valid customer records`);

        if (customers.length === 0) {
            throw new Error('No valid customer records found in Excel file');
        }

        return {
            totalRecords: customers.length,
            customers: customers,
            headers: headers
        };

    } catch (error) {
        console.error('❌ Error parsing Excel file:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

/**
 * Store Excel file in database
 */
async function storeExcelFileInDatabase(fileBuffer, fileName, userNumber) {
    try {
        console.log('💾 Storing Excel file in database:', fileName);

        // Create table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS excel_files (
                id SERIAL PRIMARY KEY,
                file_name VARCHAR(255) NOT NULL,
                file_data BYTEA NOT NULL,
                file_size INTEGER NOT NULL,
                user_number VARCHAR(50),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert file into database
        const result = await pool.query(
            `INSERT INTO excel_files (file_name, file_data, file_size, user_number)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [fileName, fileBuffer, fileBuffer.length, userNumber]
        );

        const fileId = result.rows[0].id;

        console.log('✅ Excel file stored in database with ID:', fileId);

        return {
            file_id: fileId,
            file_name: fileName,
            file_size: fileBuffer.length,
            stored_in: 'database'
        };

    } catch (error) {
        console.error('❌ Error storing Excel file in database:', error.message);
        // Return null values but don't fail the entire process
        return {
            file_id: null,
            file_name: fileName,
            error: error.message,
            stored_in: 'none'
        };
    }
}

/**
 * Download Excel file from Twilio and process it
 */
async function downloadAndProcessExcelFromTwilio(mediaUrl, fileName, userNumber) {
    try {
        console.log('📥 Downloading Excel file from Twilio:', mediaUrl);
        console.log('📥 Using TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');

        // Download Excel file from Twilio using axios
        const response = await axios({
            method: 'get',
            url: mediaUrl,
            responseType: 'arraybuffer',
            auth: {
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN
            },
            validateStatus: function (status) {
                return status >= 200 && status < 500; // Accept any status code to handle errors
            }
        });

        console.log('📥 Download response status:', response.status);
        console.log('📥 Download response content-type:', response.headers['content-type']);

        if (response.status !== 200) {
            throw new Error(`Failed to download Excel file: ${response.status} ${response.statusText}`);
        }

        if (!response.data || response.data.byteLength === 0) {
            throw new Error('Downloaded file is empty');
        }

        const fileBuffer = Buffer.from(response.data);
        console.log('✅ Excel file downloaded, size:', fileBuffer.length, 'bytes');
        console.log('✅ First 4 bytes (magic number):', fileBuffer.slice(0, 4).toString('hex'));

        // Verify this looks like an Excel file
        const magicNumber = fileBuffer.slice(0, 4).toString('hex');
        // Excel files (.xlsx) start with PK (50 4B) - they are ZIP archives
        // Excel files (.xls) start with D0 CF 11 E0
        if (!magicNumber.startsWith('504b') && !magicNumber.startsWith('d0cf')) {
            console.warn('⚠️ Warning: File may not be a valid Excel file (magic number:', magicNumber + ')');
        }

        // Parse Excel data
        const excelData = parseExcelData(fileBuffer);

        // Store file in database
        const storageResult = await storeExcelFileInDatabase(fileBuffer, fileName, userNumber);

        return {
            file_id: storageResult.file_id,
            file_name: storageResult.file_name,
            file_size: storageResult.file_size,
            stored_in: storageResult.stored_in,
            customerData: excelData
        };

    } catch (error) {
        console.error('❌ Error downloading and processing Excel file:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
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
    storeExcelFileInDatabase,
    isExcelFile
};
