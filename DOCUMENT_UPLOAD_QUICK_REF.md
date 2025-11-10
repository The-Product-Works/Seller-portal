# Quick Reference - Document Upload System

## What Should Happen

### User's Perspective
1. ✅ Upload selfie → see preview
2. ✅ Upload aadhaar → see preview
3. ✅ Upload pan → see preview
4. ✅ Submit form → files go to Supabase
5. ✅ Get redirected to verification page
6. ✅ Come back to KYC page → see all 3 images again

## System's Perspective

### Upload Flow
```
File Selected
    ↓
Validate (size, type)
    ↓
Upload to seller_details bucket
    ↓
Create signed URL
    ↓
Save to seller_documents table
    ↓
Return success
```

### Storage Location
```
Bucket: seller_details
Folder structure: {seller_id}/{doc_type}/{timestamp}_{filename}

Example for seller "abc-123":
├── abc-123/
│   ├── selfie/
│   │   ├── 1699123456789_selfie.jpg
│   │   └── 1699123456790_new_selfie.jpg (if replaced)
│   ├── aadhaar/
│   │   └── 1699123456791_aadhaar.jpg
│   └── pan/
│       └── 1699123456792_pan.jpg
```

### Database Records
```
Table: seller_documents
For each uploaded file:
├── id: uuid
├── seller_id: abc-123
├── doc_type: "selfie" | "aadhaar" | "pan"
├── file_name: original filename
├── file_size: bytes
├── mime_type: image/jpeg
├── storage_path: [signed URL]
└── uploaded_at: timestamp
```

## Console Logs to Expect

### ✅ Successful Upload
```
Starting document uploads for seller: abc-123
Selfie photo: selfie.jpg 2097152
Aadhaar photo: aadhaar.jpg 3145728
PAN photo: pan.jpg 1048576

Uploading selfie...
Selfie upload result: {success: true, document: {...}}

Uploading aadhaar...
Aadhaar upload result: {success: true, document: {...}}

Uploading pan...
PAN upload result: {success: true, document: {...}}

All document uploads completed
```

### ❌ Failed Upload (Example)
```
Starting document uploads for seller: abc-123
Selfie photo: selfie.jpg 2097152

Uploading selfie...
Selfie upload failed: Upload failed: [error message]
Selfie upload result: {success: false, error: "..."}
```

### ✅ Successful Load
```
Loading seller documents for seller: abc-123
Documents query error: null
Documents found: [3 documents]
Number of documents: 3

Processing document: selfie storage_path: https://...
Mapping selfie

Processing document: aadhaar storage_path: https://...
Mapping aadhaar

Processing document: pan storage_path: https://...
Mapping pan

Final docMap: {
  selfie: "https://...",
  aadhaar: "https://...",
  pan: "https://..."
}

uploadedDocuments state: {...}
selfiePhoto state: null
```

## Supabase Checks

### Check 1: Storage (Files)
```
Go to: Supabase Dashboard → Storage → seller_details
Look for: Folder with seller ID
Inside: selfie/, aadhaar/, pan/ folders with files
```

### Check 2: Database (Records)
```
Go to: Supabase Dashboard → Tables → seller_documents
Filter: seller_id = [from console log]
Look for: 3 rows with doc_type = "selfie", "aadhaar", "pan"
Check: storage_path column has URLs (not empty)
```

## Common Issues Quick-Fix

| Issue | What to Check | Solution |
|-------|---|---|
| Files don't show preview | File size/type | Check console for validation error |
| Upload shows success but no files in bucket | RLS policy | Check storage RLS policies |
| Files in bucket but not in database | RLS policy | Check seller_documents table RLS |
| Files in database but storage_path is NULL | URL generation | Check signed URL creation |
| Files exist but images don't display | URL expired/invalid | Try opening URL in browser |
| No console logs at all | Not logged in | Check if authenticated |

## Testing Timeline

```
1. Upload 3 photos
   └─ Takes ~2-5 seconds per file
   └─ Check console logs appear
   └─ See toast message

2. Check Supabase storage
   └─ Takes ~1 second
   └─ Look for folders and files

3. Check Supabase database
   └─ Takes ~1 second
   └─ Look for rows and signed URLs

4. Reload KYC page
   └─ Takes ~2 seconds
   └─ Check console logs for loading

5. Verify images display
   └─ Immediate, should see previews
```

**Total time**: ~15 seconds for full test

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| src/pages/KYC.tsx | Main form + upload trigger | 842 |
| src/hooks/useDocumentUpload.ts | Upload logic | 160 |
| src/lib/validations/document.schema.ts | File validation | ~50 |
| src/types/seller.types.ts | TypeScript types | ~100 |

## URLs & Paths

| Item | Value |
|------|-------|
| Storage Bucket | seller_details |
| Storage Path | {seller_id}/{doc_type}/{timestamp}_{filename} |
| Database Table | seller_documents |
| Signed URL Validity | 100 years (36,500 days) |
| File Size Limit | 10 MB |
| Allowed Types | JPEG, PNG, WebP |

## Success Indicators

✅ **All 3 working**
- Console shows 3 successful uploads
- Supabase has 3 files in bucket
- Supabase has 3 rows in database
- Images display on page reload
- Signed URLs in storage_path column

✅ **Some working** (e.g., 2 of 3)
- Check which ones fail
- Look at error message in console
- Check specific RLS policy for that type

❌ **None working**
- Check authentication (logged in?)
- Check RLS policies (all tables/storage)
- Check bucket permissions
- Check error in console carefully

## Debug Commands (In Browser Console)

```javascript
// Check if authenticated
await supabase.auth.getUser()

// Check if seller exists
await supabase.from('sellers').select('*').limit(1)

// Check if documents exist
await supabase.from('seller_documents').select('*').limit(10)

// Check if storage accessible
await supabase.storage.from('seller_details').list()
```

---

**Ready to Test**: YES ✅  
**Build Status**: SUCCESS ✅  
**Next Action**: Run test and check console logs
