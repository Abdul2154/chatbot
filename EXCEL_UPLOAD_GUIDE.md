# Excel Upload Feature - Bulk Customer Addition

## Overview
Users can now upload Excel files to the WhatsApp chatbot to add multiple customers at once. The system will automatically:
- Parse the Excel file
- Extract customer data
- Store the file for admin download
- Create a query entry for review

## How It Works

### For Users (WhatsApp)
1. Send an Excel file (.xlsx or .xls) to the chatbot at any time
2. The system will automatically detect it's an Excel file
3. Receive instant confirmation with:
   - Query ID
   - Total number of customers found
   - Confirmation that the file was saved

### Excel File Format
The Excel file should contain customer data with headers in the first row.

**Example Format:**
| Name | Contact Number | Address | Email |
|------|---------------|---------|-------|
| John Smith | 0123456789 | 123 Main St | john@email.com |
| Jane Doe | 0987654321 | 456 Oak Ave | jane@email.com |

**Notes:**
- Headers are flexible (any column names work)
- First row MUST be headers
- Empty rows are automatically skipped
- Common headers: Name, Contact Number, Email, Address, etc.

### For Admins (Dashboard)
1. Excel uploads appear as "Bulk Customer Addition" queries
2. View details including:
   - Total number of customers found
   - All extracted customer data
   - Download button for the original Excel file
3. Download the Excel file directly from the dashboard
4. Review and process the customer additions
5. Respond to the user when complete

## Technical Details

### Supported File Types
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)

### File Size Limit
- Maximum: 5MB (configured in server.js)

### Storage
- Excel files are uploaded to ImgBB for cloud storage
- Original file remains accessible via download link
- Customer data is parsed and stored in database as JSON

### Database Structure
Query entries for bulk customer additions include:
- `query_type`: "bulk_customer_addition"
- `query_data`:
  - `document_type`: "customer_excel"
  - `total_customers`: Number of customers found
  - `customers`: Array of customer objects
  - `headers`: Column headers from Excel
  - `file_name`: Original file name
- `image_url`: Download link for Excel file
- `image_public_id`: ImgBB file identifier

## Error Handling

### User Errors
If the Excel file cannot be processed, users receive a helpful error message with:
- Explanation of the issue
- Requirements for valid Excel files
- Instructions to retry

### Common Issues
1. **Invalid file format**: Ensure file is .xlsx or .xls
2. **Empty file**: File must contain at least headers and one data row
3. **File too large**: Reduce file size below 5MB
4. **No headers**: First row must contain column headers

## Example User Flow

1. **User uploads Excel**:
   ```
   [User sends customer_list.xlsx]
   ```

2. **Bot response**:
   ```
   ✅ Excel file received and processed successfully!

   Query ID: #ABC12345
   📊 Total Customers Found: 25

   Your bulk customer addition request has been submitted.
   Our team will review and add these customers to the system.

   📄 The Excel file has been saved and can be downloaded
   from the admin dashboard.

   Thank you!
   ```

3. **Admin reviews** in dashboard and downloads Excel
4. **Admin processes** customers and responds
5. **User receives** confirmation

## Implementation Files

### Created Files
- `config/excelHandler.js` - Excel file processing and upload

### Modified Files
- `handlers/messageHandler.js` - Added Excel file detection
- `public/dashboard.html` - Added Excel download UI
- `package.json` - Added xlsx dependency

## Future Enhancements
- Auto-import customers directly into system
- Validation rules for customer data
- Duplicate detection
- Email notifications when processing complete
- Support for CSV files
