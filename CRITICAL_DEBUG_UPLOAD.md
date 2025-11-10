# CRITICAL DEBUG - Document Upload Failure Analysis

## Problem Statement
No documents (selfie, aadhaar, pan) are being uploaded to the `seller_details` bucket.

## Root Cause Investigation

The upload is failing at one of these points:
1. **File Validation** - File rejected by Zod schema
2. **Storage Upload** - Permission denied or RLS policy blocking
3. **Signed URL Generation** - File exists but can't create signed URL
4. **Database Insert** - File uploaded but can't insert metadata

## Enhanced Logging Added

I've added EXTREMELY DETAILED console logging to identify the exact failure point. 

### What to Look For in Console

#### UPLOAD PHASE
```
=== UPLOAD DEBUG START ===
Uploading to bucket 'seller_details'
Seller ID: [your-seller-uuid]
Doc Type: selfie
File Name: selfie.jpg
File Size: 2097152
File Type: image/jpeg
Internal Path: [seller-uuid]/selfie/[timestamp]_selfie.jpg
Auth User: [your-auth-user-uuid]
Upload response - data: {path: "..."}  OR  null
Upload response - error: null  OR  {error object}
=== UPLOAD DEBUG END ===
```

**IF error is not null, copy the error object!**

#### SIGNED URL PHASE
```
Generating signed URL for path: [seller-uuid]/selfie/[timestamp]_selfie.jpg
Signed URL response - data: {signedUrl: "https://..."}  OR  null
Signed URL response - error: null  OR  {error object}
```

**IF error is not null, copy the error object!**

#### DATABASE INSERT PHASE
```
Inserting into seller_documents - Seller ID: [uuid] Doc Type: selfie Signed URL exists: true
Database insert response - data: {id: "...", seller_id: "..."}  OR  null
Database insert response - error: null  OR  {error object}
```

**IF error is not null, look for:**
- `message`: The main error
- `code`: PostgreSQL error code (e.g., "42501" for permission denied)
- `details`: Additional details
- `hint`: Helpful hint from database

## Expected Success Output

When EVERYTHING works, you should see:

```
=== UPLOAD DEBUG START ===
Uploading to bucket 'seller_details'
Seller ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Doc Type: selfie
File Name: selfie.jpg
File Size: 2097152
File Type: image/jpeg
Internal Path: a1b2c3d4-e5f6-7890-abcd-ef1234567890/selfie/1699123456789_selfie.jpg
Auth User: user-uuid-here
Upload response - data: {path: "a1b2c3d4-e5f6-7890-abcd-ef1234567890/selfie/1699123456789_selfie.jpg"}
Upload response - error: null
=== UPLOAD DEBUG END ===

Generating signed URL for path: a1b2c3d4-e5f6-7890-abcd-ef1234567890/selfie/1699123456789_selfie.jpg
Signed URL response - data: {signedUrl: "https://...long-url-with-token..."}
Signed URL response - error: null

Inserting into seller_documents - Seller ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890 Doc Type: selfie Signed URL exists: true
Database insert response - data: {id: "doc-uuid", seller_id: "...", doc_type: "selfie", ...}
Database insert response - error: null

Selfie upload result: {success: true, document: {...}}
```

## Common Error Messages & Solutions

### Error 1: Storage Upload Fails
```
uploadError: {
  message: "Permission denied",
  statusCode: 403
}
```
**Cause**: RLS policy on `seller_details` bucket is blocking uploads
**Solution**: Check Supabase Storage → Policies → seller_details bucket
**Fix**: Enable "Authenticated users can upload" policy

### Error 2: Signed URL Generation Fails
```
signedUrlError: {
  message: "Not found",
  statusCode: 404
}
```
**Cause**: File wasn't actually uploaded (previous step failed)
**Solution**: Look at upload response first - is it null?

### Error 3: Database Insert Fails
```
docError: {
  message: "new row violates row level security policy",
  code: "PGRST301",
  details: "..."
}
```
**Cause**: RLS policy on `seller_documents` table blocks inserts
**Solution**: Check Supabase Tables → seller_documents → Policies
**Fix**: Enable "Authenticated users can insert" policy

### Error 4: File Validation Fails
```
errorMessage: "Invalid file type. Only PDF and images are allowed"
```
**Cause**: File type not in allowed list
**Solution**: Use JPEG, PNG, or WebP images only

### Error 5: Authentication Issue
```
Auth User: null  (or undefined)
```
**Cause**: Not logged in
**Solution**: Ensure you're authenticated before uploading

## Step-by-Step Debug Procedure

### STEP 1: Pre-Upload Checks
```javascript
// In browser console BEFORE uploading
const { data: { user } } = await supabase.auth.getUser();
console.log("Authenticated user:", user?.id);
console.log("User is authenticated:", !!user);
```

### STEP 2: Upload Documents
1. Go to KYC page
2. Select selfie photo
3. Select aadhaar photo
4. Select pan photo
5. Click "Submit KYC"
6. **IMMEDIATELY open DevTools** (F12)
7. Go to **Console tab**
8. **DO NOT reload page** (will clear logs)

### STEP 3: Copy All Console Output
1. In Console, find the first log line starting with "Starting document uploads"
2. Scroll down to find "All document uploads completed"
3. Select all text between these lines
4. **COPY everything** (Ctrl+A, Ctrl+C)

### STEP 4: Look for Error Indicators
Search the copied logs for:
- `uploadError:`
- `signedUrlError:`
- `docError:`
- `UPLOAD FAILED`
- `DATABASE INSERT FAILED`

### STEP 5: Check What Succeeded/Failed
Look at each section:
- ✅ Upload: `Upload response - error: null` = success
- ✅ Signed URL: `Signed URL response - error: null` = success  
- ✅ Database: `Database insert response - error: null` = success

## Quick Test Results Template

Copy and fill this in, then share with me:

```
UPLOAD TEST RESULTS
===================

Auth Status:
- Authenticated: [Yes/No]
- User ID: [paste or "not visible"]

Selfie Upload:
- Storage Upload: [Success/Failed]
- Error (if failed): [paste error]
- Signed URL Created: [Success/Failed]
- Error (if failed): [paste error]
- Database Insert: [Success/Failed]
- Error (if failed): [paste error]

Aadhaar Upload:
- Storage Upload: [Success/Failed]
- Error (if failed): [paste error]
- Signed URL Created: [Success/Failed]
- Error (if failed): [paste error]
- Database Insert: [Success/Failed]
- Error (if failed): [paste error]

Pan Upload:
- Storage Upload: [Success/Failed]
- Error (if failed): [paste error]
- Signed URL Created: [Success/Failed]
- Error (if failed): [paste error]
- Database Insert: [Success/Failed]
- Error (if failed): [paste error]

Console Output (paste all logs):
[PASTE EVERYTHING FROM CONSOLE HERE]
```

## Files Updated

- `src/hooks/useDocumentUpload.ts` - Added comprehensive error logging

## Build Status

✅ Built successfully in 17.70 seconds
✅ Ready for testing

## Next Steps

1. **Test the upload** with all the enhanced logging
2. **Open DevTools console** (F12)
3. **Submit the form**
4. **Copy ALL console output**
5. **Share the output** with exact error messages

---

The detailed logging will show us EXACTLY where and why the upload is failing!
