# Dashboard File Upload Feature

## Overview
Admins can now upload and send files (PDFs, Excel, Word docs, images) directly from the dashboard as responses to user queries. The files are automatically sent to users via WhatsApp.

## Features

### Supported File Types
- **PDFs**: `.pdf`
- **Excel**: `.xlsx`, `.xls`
- **Word**: `.doc`, `.docx`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`

### File Size Limit
- Maximum: 5MB (enforced by server configuration)

## How to Use

### Step 1: Respond to a Query
1. Navigate to the admin dashboard
2. Find a pending query
3. Write your response in the text area

### Step 2: Attach a File (Optional)
1. Click the "Choose File" button under the response text area
2. Select a file from your computer
3. You'll see confirmation with the file name and size
4. Example: `✅ Selected: invoice.pdf (2.45 MB)`

### Step 3: Send Response
1. Click "Send & Complete" or "Reject Query"
2. The system will:
   - Upload the file to cloud storage (ImgBB)
   - Update the query status
   - Send your message + file to the user on WhatsApp

## User Experience

### What the User Receives
When you send a response with a file attachment, the user receives:

```
✅ Response to your query #ABC123:

[Your response message here]

📎 Attached file: invoice.pdf

Thank you for using our support system!
```

The file is sent as a media attachment in WhatsApp, which users can:
- View directly in WhatsApp
- Download to their device
- Share with others

## Technical Flow

### Backend Process
1. **File Upload** (`/admin/upload-file` endpoint):
   - Receives file from dashboard
   - Uploads to ImgBB cloud storage
   - Returns file URL

2. **Response Sending** (`/admin/respond` endpoint):
   - Saves response to database
   - If file attached:
     - Retrieves query information
     - Sends WhatsApp message with media URL
   - If no file:
     - Sends standard WhatsApp text message

### Architecture Components

#### New Endpoints
- `POST /admin/upload-file` - Handles file uploads from dashboard
- `POST /admin/respond` - Updated to handle file attachments

#### Updated Files
- `public/dashboard.html` - Added file input UI
- `routes/admin.js` - Added upload endpoint and updated respond logic
- `utils/twilioClient.js` - Added `sendMessageWithMedia()` function
- `models/queries.js` - Updated `updateQueryResponse()` to skip duplicate messages

#### Storage
- Files are uploaded to **ImgBB** cloud storage
- Public URLs are used for WhatsApp media messages
- Original files remain accessible via ImgBB CDN

## Example Use Cases

### 1. Send Invoice/Receipt
```
Response: "Here is your invoice for the refund request."
File: invoice.pdf
```

### 2. Share Documentation
```
Response: "Please follow the steps in this guide."
File: setup_guide.pdf
```

### 3. Send Form
```
Response: "Please fill out this leave form and return it."
File: leave_form.xlsx
```

### 4. Share Image/Screenshot
```
Response: "Here's what the error looks like. Please check your settings."
File: error_screenshot.png
```

## Error Handling

### File Upload Failures
If file upload fails, the admin will see:
- Error message in the dashboard
- Response will not be sent to user
- Admin can retry with the same or different file

### Common Issues
1. **File too large**: Reduce file size below 5MB
2. **Unsupported format**: Use supported file types only
3. **Network error**: Check internet connection and retry

## Best Practices

### For Admins
1. **Keep files small**: Compress large PDFs or images
2. **Use descriptive names**: Name files clearly (e.g., `invoice_march_2024.pdf`)
3. **Test downloads**: Ensure files open correctly before sending
4. **Add context**: Explain what the file contains in your message

### File Optimization
- **PDFs**: Use compression tools to reduce size
- **Images**: Resize to 1920px max width
- **Excel**: Remove unnecessary sheets/data
- **Word**: Save as PDF for universal compatibility

## Security Considerations

### File Validation
- Server validates file types before upload
- File size limits prevent abuse
- Only authenticated admins can upload files

### Storage
- Files stored on ImgBB with unique IDs
- Public URLs generated for WhatsApp delivery
- No sensitive data should be included in file names

## Limitations

1. **One file per response**: Can only attach one file at a time
2. **WhatsApp restrictions**: Some file types may not preview in WhatsApp
3. **File persistence**: Files stored on ImgBB (3rd party service)
4. **No file editing**: Cannot edit/replace file after sending

## Troubleshooting

### File Not Appearing
- Check if file upload completed successfully
- Verify file URL is valid
- Check WhatsApp delivery status in logs

### User Can't Open File
- Ensure file type is supported on mobile devices
- Try converting to PDF for universal compatibility
- Check file isn't corrupted

### Upload Takes Too Long
- File may be too large - try compressing
- Check your internet connection
- ImgBB service may be slow - retry later

## Future Enhancements
- Multiple file attachments
- File preview before sending
- Direct integration with document storage systems
- File analytics and tracking
- Automatic file format conversion
