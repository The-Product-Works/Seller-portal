# Document Upload Diagnosis - Complete Flow

## Issue Summary
Documents (selfie, aadhaar, pan) are not being stored in `seller_details` bucket or displayed on KYC page.

## Step-by-Step Flow Analysis

### STEP 1: File Selection (Frontend)
```
User selects selfie.jpg
↓
File stored in React state: selfiePhoto (File object)
↓
Preview appears using URL.createObjectURL()
↓
✅ This works - user can see preview before upload
```

### STEP 2: Form Submission
```
User clicks "Submit KYC"
↓
Validation checks if all 3 photos selected
↓
If missing any photo → toast error: "Please upload Selfie, Aadhaar and PAN photos"
↓
✅ This means files ARE being detected at submit time
```

### STEP 3: Seller Record Creation
```
New seller record inserted into 'sellers' table
↓
seller_id generated (UUID)
↓
console.log shows: "Starting document uploads for seller: [seller-id]"
↓
✅ Seller created successfully
```

### STEP 4: Document Upload (THE PROBLEM AREA)
```
For each photo (selfie, aadhaar, pan):
↓
Call: uploadDocument(sellerId, file, docType)
↓
Inside uploadDocument hook:
  ├─ File validation (Zod schema)
  │  └─ Check file size (max 10MB)
  │  └─ Check file type (image/*)
  ├─ Upload to storage at: {sellerId}/{docType}/{timestamp}_{filename}
  │  └─ Bucket: seller_details
  │  └─ Path: abc-123/selfie/1699123456789_selfie.jpg
  ├─ Generate signed URL (valid 100 years)
  ├─ Insert into seller_documents table:
  │  └─ seller_id: abc-123
  │  └─ doc_type: "selfie"
  │  └─ storage_path: [signed URL]
  │  └─ file_name, file_size, mime_type
  └─ Return success/error
↓
console.log shows: "Selfie upload result: {success: true/false}"
↓
⚠️ THIS IS WHERE IT FAILS
```

## Possible Failure Points

### 1. File Validation
- **Check**: Does file pass Zod validation?
- **Debug Console**: Look for validation error messages
- **Expected**: No error, file should pass

### 2. Storage Upload
- **Check**: Can files be uploaded to `seller_details` bucket?
- **Required**: 
  - RLS policies allow authenticated users to upload
  - Bucket is public or has proper permissions
  - Seller ID in path is correct
- **Debug Console**: Look for "Upload failed: [error message]"

### 3. Signed URL Generation
- **Check**: Can signed URLs be created for uploaded files?
- **Required**:
  - RLS policies allow creating signed URLs
  - File was successfully uploaded
- **Debug Console**: Look for "Signed URL generation failed: [error message]"

### 4. Database Insert
- **Check**: Can rows be inserted into `seller_documents` table?
- **Required**:
  - RLS policies allow inserts for authenticated users
  - seller_id foreign key is valid
  - All required fields are provided
- **Debug Console**: Look for "Failed to save document metadata: [error message]"

### 5. Document Display
- **Check**: When loading KYC page, can documents be loaded and displayed?
- **Query**: 
  ```sql
  SELECT * FROM seller_documents 
  WHERE seller_id = 'abc-123' 
  AND doc_type IN ('selfie', 'aadhaar', 'pan')
  ```
- **Display**: `<img src={uploadedDocuments.selfie} />`
- **Debug Console**: 
  - "Loading seller documents for seller: abc-123"
  - "Documents found: [...]"
  - "Number of documents: 0" ← IF THIS SHOWS 0, UPLOADS DIDN'T WORK

## Testing Procedure

### Test 1: Check Bucket Uploads
1. Go to Supabase Dashboard
2. Storage → seller_details
3. Look for folder structure: `{seller-id}/selfie/`, `{seller-id}/aadhaar/`, `{seller-id}/pan/`
4. **Result**:
   - ✅ **If folders exist with files**: Upload is working, issue is in display
   - ❌ **If folders don't exist**: Upload is failing, check console error

### Test 2: Check Database Records
1. Go to Supabase Dashboard
2. Tables → seller_documents
3. Filter by seller_id (from console log)
4. Look for rows with doc_type: "selfie", "aadhaar", "pan"
5. **Result**:
   - ✅ **If rows exist with signed URLs**: Database insert working
   - ❌ **If rows don't exist**: Insert failed, check console error
   - ⚠️ **If storage_path is NULL**: Signed URL generation failed

### Test 3: Check Console Logs
1. Open DevTools (F12)
2. Console tab
3. Go to KYC page and submit
4. Look for these exact logs:
   ```
   Starting document uploads for seller: [ID]
   Selfie photo: [filename] [size]
   Aadhaar photo: [filename] [size]
   PAN photo: [filename] [size]
   Uploading selfie...
   Selfie upload result: {success: true/false, ...}
   Uploading aadhaar...
   Aadhaar upload result: {success: true/false, ...}
   Uploading pan...
   PAN upload result: {success: true/false, ...}
   All document uploads completed
   ```
5. **If any shows error**: Document the error message

### Test 4: Reload KYC Page
1. Submit KYC form with all 3 photos
2. Get redirected to verification page
3. Go back to KYC page or navigate away then back
4. Check console:
   ```
   Loading seller documents for seller: [ID]
   Documents query error: [error or null]
   Documents found: [array or null]
   Number of documents: [0, 1, 2, or 3]
   Processing document: selfie storage_path: [URL or null]
   Processing document: aadhaar storage_path: [URL or null]
   Processing document: pan storage_path: [URL or null]
   Final docMap: {selfie: "...", aadhaar: "...", pan: "..."}
   uploadedDocuments state: {selfie: "...", aadhaar: "...", pan: "..."}
   ```
5. **Result**:
   - ✅ **If all images show**: System working end-to-end
   - ⚠️ **If selfie missing but aadhaar/pan show**: Selfie-specific issue
   - ❌ **If no documents show**: Database records missing

## Database RLS Policies to Check

### Storage RLS (seller_details bucket)
```sql
-- Should allow authenticated users to upload
CREATE POLICY "authenticated can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'seller_details');

-- Should allow creating signed URLs
CREATE POLICY "authenticated can read"
ON storage.objects
FOR SELECT
TO authenticated
WHERE (bucket_id = 'seller_details');
```

### Table RLS (seller_documents)
```sql
-- Should allow inserts for authenticated users
CREATE POLICY "authenticated can insert"
ON seller_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Should allow selects for authenticated users to view own docs
CREATE POLICY "authenticated can select own"
ON seller_documents
FOR SELECT
TO authenticated
WHERE (seller_id IN (
  SELECT id FROM sellers WHERE user_id = auth.uid()
));
```

## Quick Checklist

- [ ] Console shows "Starting document uploads for seller: [ID]"
- [ ] Console shows file names and sizes for all 3 photos
- [ ] Console shows "Uploading selfie/aadhaar/pan..." for each
- [ ] Console shows `success: true` for each upload
- [ ] Check Supabase bucket - files exist in seller_details
- [ ] Check Supabase table - rows exist in seller_documents
- [ ] Console shows "Documents found: [3 items]" when reloading
- [ ] uploadedDocuments state shows all 3 URLs
- [ ] Images display on KYC page

## Next Steps

1. **Run full test**: Submit KYC with all 3 photos
2. **Open DevTools**: F12 → Console
3. **Document all console output**: Copy everything
4. **Check Supabase**:
   - Files in bucket?
   - Rows in table?
   - URLs valid?
5. **Report findings**: Share console logs + Supabase status

---

## Code Flow Reference

### File: src/pages/KYC.tsx
- **Line 280-350**: New seller form submission and initial document upload
- **Line 154-182**: Load existing documents on page load
- **Line 488-525**: Display images with preview and remove buttons

### File: src/hooks/useDocumentUpload.ts
- **Line 33-45**: File validation
- **Line 46-54**: Storage upload
- **Line 56-62**: Signed URL generation
- **Line 64-80**: Database insertion

### Databases
- **Table**: seller_documents
  - Columns: id, seller_id, doc_type, file_name, file_size, mime_type, storage_path, uploaded_at
- **Bucket**: seller_details
  - Path: {seller_id}/{doc_type}/{timestamp}_{filename}
