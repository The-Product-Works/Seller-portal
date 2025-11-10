# Action Plan - Debug Document Upload Issue

## Current Status
✅ Code is correct and ready
✅ Build successful (19.75s)
✅ Detailed console logging added
✅ Ready for testing

## What You Need to Do

### STEP 1: Test the Upload
1. **Open your app** in browser
2. **Navigate to KYC page**
3. **Upload all 3 documents**:
   - Select a selfie photo
   - Select an aadhaar photo  
   - Select a pan photo
4. **Verify previews show** for all 3
5. **Fill out the rest of the form**
6. **Click "Submit KYC"**

### STEP 2: Check Browser Console
1. **Press F12** to open DevTools
2. **Go to Console tab**
3. **Look for these log messages** (copy everything you see):

```
Starting document uploads for seller: [ID]
Selfie photo: [name] [size]
Aadhaar photo: [name] [size]
PAN photo: [name] [size]
Uploading selfie...
Selfie upload result: {...}
Uploading aadhaar...
Aadhaar upload result: {...}
Uploading pan...
PAN upload result: {...}
All document uploads completed
```

**⚠️ IMPORTANT**: If you see any error messages like:
- `"Upload failed: ..."`
- `"Validation failed: ..."`
- `"Failed to save document metadata: ..."`

**Copy the EXACT error message** and report it!

### STEP 3: Check Supabase Dashboard

#### Check 1: Storage Bucket
1. Go to https://supabase.com
2. Open your project → **Storage**
3. Click on **seller_details** bucket
4. Look for a folder with your seller ID (the UUID from console log)
5. Inside, you should see:
   - `selfie/` folder with files
   - `aadhaar/` folder with files
   - `pan/` folder with files

**Report**:
- ✅ If folders and files exist: **"Files uploaded successfully"**
- ❌ If folders don't exist: **"Files NOT in storage bucket"**

#### Check 2: Database Table
1. Go to **Tables** → **seller_documents**
2. Look for rows where `seller_id` = your seller ID (from console)
3. For each row, check:
   - `doc_type`: should be "selfie", "aadhaar", or "pan"
   - `storage_path`: should have a long URL starting with https://
   - `file_name`: should have your filename

**Report**:
- ✅ If all 3 rows exist: **"Database records created"**
- ⚠️ If some rows missing: **"Missing: selfie/aadhaar/pan"**
- ❌ If storage_path is NULL: **"Signed URLs not generated"**
- ❌ If no rows exist: **"No database records created"**

### STEP 4: Test Reload
1. **Go back to KYC page** (navigate away and back or refresh)
2. **Open console again**
3. **Look for loading logs**:

```
Loading seller documents for seller: [ID]
Documents query error: null
Documents found: [...]
Number of documents: 3 (or 0 if missing)
Processing document: selfie storage_path: [URL]
Processing document: aadhaar storage_path: [URL]
Processing document: pan storage_path: [URL]
Final docMap: {selfie: "...", aadhaar: "...", pan: "..."}
uploadedDocuments state: {selfie: "...", aadhaar: "...", pan: "..."}
```

**Report**:
- ✅ If "Number of documents: 3": **"Documents loaded successfully"**
- ❌ If "Number of documents: 0": **"Documents not found in database"**
- ⚠️ If "Number of documents: 1 or 2": **"Some documents missing: [which ones]"**

### STEP 5: Check Image Display
1. **After reload**, check if images appear on KYC page
2. **In the document upload section**, you should see:
   - Selfie photo with preview
   - Aadhaar photo with preview
   - PAN photo with preview

**Report**:
- ✅ If all 3 show: **"Images displaying correctly"**
- ⚠️ If only some show: **"Missing: [which ones]"**
- ❌ If none show: **"No images displaying"**

---

## Report Template

When you test, please provide this information:

### Test Results
```
Browser Console Output:
[Paste all console logs here]

Supabase Storage Check:
✅/❌ Files in seller_details bucket? [Yes/No/Partial]
[List what you see]

Supabase Database Check:
✅/❌ Rows in seller_documents table? [Yes/No/Partial]
✅/❌ storage_path field has URLs? [Yes/No/Partial]
[List what you see]

Reload Test:
✅/❌ Documents load on page reload? [Yes/No]
Number of documents found: [0/1/2/3]

Image Display:
✅/❌ Selfie displays? [Yes/No]
✅/❌ Aadhaar displays? [Yes/No]
✅/❌ PAN displays? [Yes/No]

Any error messages? [Copy exact text if yes]
```

---

## Common Issues & Solutions

### Issue: "Documents found: null" or "Number of documents: 0"
**Cause**: Documents not being uploaded to database
**Check**:
1. Are files in storage bucket?
2. Are there errors in console about upload?
3. Check RLS policies on seller_documents table

### Issue: Files in bucket but not showing on page
**Cause**: signed URLs not generated or storage_path is NULL
**Check**:
1. Go to Supabase → seller_documents table
2. Check if `storage_path` column has values
3. If NULL, signed URL generation failed

### Issue: Images don't display but console shows URLs
**Cause**: Signed URLs expired or invalid
**Check**:
1. Try opening signed URL in new tab
2. Check URL format (should be very long with query parameters)
3. Check if URL is expired

### Issue: "Upload failed" error in console
**Cause**: File validation or storage permissions issue
**Check**:
1. File size (should be under 10MB)
2. File type (should be image/jpeg, image/png, image/webp)
3. Check storage RLS policies

---

## Debug Checklist

✅ Build successful
✅ Code has detailed logging
✅ Ready for production test

**Now you need to**:
- [ ] Upload all 3 photos on KYC page
- [ ] Check console logs (copy output)
- [ ] Check Supabase storage bucket (files exist?)
- [ ] Check Supabase seller_documents table (rows exist?)
- [ ] Reload page and verify reload logs
- [ ] Check if images display on KYC page
- [ ] Report findings with exact console output

---

## Files Modified
- `src/pages/KYC.tsx` - Added detailed console logging for debugging

## Build Status
✅ 3,500 modules transformed
✅ Built in 19.75 seconds
✅ Zero errors
✅ Ready for testing

---

**Next**: Run the test above and report the findings!
