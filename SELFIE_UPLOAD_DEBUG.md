# Selfie Upload Debugging Guide

## Issue
Selfie photo is not showing or sending to `seller_details` bucket

## Debugging Steps

### Step 1: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Upload selfie and submit KYC form
4. Look for these log messages:

```
Starting document uploads for seller: [seller-id]
Selfie photo: [filename] [filesize]
Uploading selfie...
Selfie upload result: {success: true/false, error?: "message"}
```

### Step 2: Check Network Tab
1. In DevTools, go to Network tab
2. Filter for "seller_details" in the storage API calls
3. You should see POST requests to upload files
4. Check the response status (should be 200)

### Step 3: Check Supabase Dashboard
1. Go to Supabase dashboard
2. Storage → seller_details bucket
3. Look for folder structure: `{seller-id}/selfie/`
4. Files should be there if upload succeeded

### Step 4: Check seller_documents Table
1. Go to Supabase dashboard
2. Tables → seller_documents
3. Filter by seller_id
4. Should have rows with:
   - doc_type: "selfie"
   - storage_path: signed URL
   - file_name: [your-filename]

---

## Common Issues & Solutions

### Issue: "Missing photos" validation error
**Cause:** Form requires all 3 photos (selfie, aadhaar, pan)  
**Solution:** Upload all 3 photos, then submit

### Issue: Selfie selected but not showing preview
**Cause:** File wasn't properly added to state  
**Solution:** 
1. Clear the input and try again
2. Check file size (max 10MB)
3. Check file format (JPEG, PNG, WebP)

### Issue: Upload succeeds but file not in bucket
**Cause:** RLS policy blocking upload  
**Solution:**
1. Check storage RLS policies in Supabase
2. Ensure seller_id is correct
3. Check user authentication status

### Issue: Signed URL not being created
**Cause:** File uploaded but signed URL generation failed  
**Solution:**
1. Check storage bucket permissions
2. Check if file path is correct
3. Try manually creating signed URL in Supabase dashboard

### Issue: seller_documents table insert fails
**Cause:** Database constraint or missing field  
**Solution:**
1. Check RLS policies on seller_documents table
2. Verify all required fields are present
3. Check seller_id relationship exists

---

## Enhanced Logging

I've added detailed console logging to help debug:

```typescript
console.log("Starting document uploads for seller:", newSeller.id);
console.log("Selfie photo:", selfiePhoto?.name, selfiePhoto?.size);
console.log("Uploading selfie...");
const r = await uploadDocument(newSeller.id, selfiePhoto, "selfie");
console.log("Selfie upload result:", r);
```

This will show:
- ✅ Seller ID being used
- ✅ File name and size
- ✅ Upload success/failure
- ✅ Any error messages

---

## Test Checklist

### Test 1: Selfie Upload (New User)
```
1. Create new account
2. Go to KYC page
3. Upload selfie image (check preview appears)
4. Upload aadhaar image
5. Upload PAN image
6. Fill form fields
7. Click Submit
8. Check console for logs
9. Check Supabase for files
```

### Test 2: Image Preview Display
```
1. After uploading, image should show in preview area
2. X button should appear in top-right
3. Clicking X should clear preview
4. File input should reappear
5. Can upload new image
```

### Test 3: Resubmission (Return User)
```
1. Login as seller with existing KYC
2. Go to KYC page
3. Previous images should display
4. Can replace any image
5. Submit changes
6. Check console for re-upload logs
```

---

## Console Log Output Example

### Successful Upload
```
Starting document uploads for seller: 3e1d74b0-527b-481a-ae5a-4f275addd023
Selfie photo: photo.jpg 2097152
Uploading selfie...
Selfie upload result: {
  success: true, 
  document: {
    id: "doc-123",
    docType: "selfie",
    fileName: "photo.jpg",
    fileSize: 2097152,
    mimeType: "image/jpeg",
    storagePath: "3e1d74b0-527b-481a-ae5a-4f275addd023/selfie/1699..."
  }
}
Aadhaar upload result: {...}
PAN upload result: {...}
All document uploads completed
```

### Failed Upload
```
Starting document uploads for seller: 3e1d74b0-527b-481a-ae5a-4f275addd023
Selfie photo: photo.jpg 2097152
Uploading selfie...
Selfie upload failed: "Upload failed: [error message]"
Selfie upload result: {
  success: false,
  error: "Upload failed: Access denied"
}
```

---

## Debug Checklist

- [ ] Console shows "Starting document uploads"
- [ ] Console shows correct seller ID
- [ ] Console shows file name and size
- [ ] Console shows "Uploading selfie..."
- [ ] Console shows success result
- [ ] Check Supabase bucket for files
- [ ] Check seller_documents table for records
- [ ] Verify signed URLs are working
- [ ] Check network tab for 200 responses
- [ ] Check for any 403/404 errors

---

## Next Steps

1. **Open DevTools Console**
   - F12 → Console tab

2. **Perform Test Upload**
   - Upload selfie on KYC page
   - Submit form

3. **Check Console Output**
   - Look for the enhanced log messages
   - Note any errors

4. **Report Findings**
   - Share the console log output
   - Share any error messages
   - Share Supabase bucket status

---

## Files with Enhanced Logging

- `src/pages/KYC.tsx` - Added detailed console.log statements
  - Lines for new user upload
  - Lines for returning user re-upload
  - Shows file info, upload results, any errors

---

## Quick Reference

**Selfie file check:**
```javascript
// Run in console to debug
console.log("Selfie exists:", !!selfiePhoto);
console.log("Selfie name:", selfiePhoto?.name);
console.log("Selfie size:", selfiePhoto?.size);
console.log("Selfie type:", selfiePhoto?.type);
```

**Upload function check:**
```javascript
// The uploadDocument function should:
// 1. Validate the file
// 2. Upload to seller_details bucket
// 3. Create signed URL
// 4. Insert to seller_documents table
// 5. Return success result
```

---

**Status:** Enhanced logging added  
**Build:** Successful  
**Ready for Testing:** Yes  

Run the test now and check console for detailed logs!
