# IMMEDIATE ACTION - Document Upload Debug

## What's Ready Now ✅

**Comprehensive debugging** has been added to the document upload system. Every step is now logged in detail.

## What You Need to Do RIGHT NOW

### Step 1: Test Upload
1. **Go to KYC page**
2. **Select 3 photos** (selfie, aadhaar, pan)
3. **Fill out form**
4. **Click "Submit KYC"**
5. **Open DevTools** (Press F12)
6. **Go to Console tab**
7. **DO NOT refresh the page** (logs will disappear)

### Step 2: Look at Console Output

You should see detailed logs starting with:
```
=== UPLOAD DEBUG START ===
Uploading to bucket 'seller_details'
Seller ID: [your-seller-id]
Doc Type: selfie
File Name: selfie.jpg
File Size: [bytes]
File Type: image/jpeg
Internal Path: [seller-id]/selfie/[timestamp]_selfie.jpg
Auth User: [your-auth-id]
Upload response - data: {...}
Upload response - error: [null or error object]
=== UPLOAD DEBUG END ===
```

### Step 3: Identify Failure Point

**Look for one of these error patterns:**

**Pattern A - Upload Fails** (Most Likely)
```
Upload response - error: {
  message: "Permission denied",
  name: "StorageApiError",
  statusCode: 403
}
```
→ **Cause**: RLS policy blocking uploads to storage
→ **Fix needed**: Check Supabase storage RLS policies

---

**Pattern B - Signed URL Fails**
```
Signed URL response - error: {
  message: "Not found"
}
```
→ **Cause**: File wasn't uploaded successfully
→ **Check**: Look at Pattern A first

---

**Pattern C - Database Insert Fails**
```
Database insert response - error: {
  message: "new row violates row level security policy",
  code: "PGRST301"
}
```
→ **Cause**: RLS policy blocking inserts to seller_documents table
→ **Fix needed**: Check Supabase table RLS policies

---

**Pattern D - Success (All Null Errors)**
```
Upload response - error: null
Signed URL response - error: null
Database insert response - error: null
```
→ **Result**: All 3 documents should upload successfully!
→ **Next**: Check Supabase bucket and table to verify files exist

### Step 4: Share the Error

**Copy the exact error object** and tell me:
1. Which phase failed: Upload / Signed URL / Database Insert
2. The exact error message
3. The error code (if any)

**Example:**
```
Selfie upload failed at: Storage Upload phase
Error message: "Permission denied"
Error code: 403
```

---

## Most Likely Culprit 🎯

The uploads are probably being blocked by **RLS (Row Level Security) policies** on the Supabase storage bucket.

### Quick Fix Check:

1. Go to **Supabase Dashboard**
2. Click **Storage** (left menu)
3. Click **seller_details** bucket
4. Click **Policies** tab
5. Look for policies on insert/upload

**If you see**: "No active policies"
→ **Problem**: Nothing is allowed!
→ **Solution**: Add policies to allow authenticated users to upload

**If you see**: Policies but they might be restrictive
→ **Problem**: Policies might be too strict
→ **Solution**: Check policy conditions - should allow authenticated users

---

## File Changes Made

- **src/hooks/useDocumentUpload.ts**:
  - ✅ Added detailed console logging at each step
  - ✅ Changed `upsert: false` → `upsert: true` (allows re-uploads)
  - ✅ Logs authentication, file details, error objects
  - ✅ Captures exact error messages

- **CRITICAL_DEBUG_UPLOAD.md**:
  - ✅ Complete guide for interpreting logs
  - ✅ Common error messages and solutions
  - ✅ Step-by-step debugging procedure

---

## Expected Timeline

1. **Test upload**: 30 seconds
2. **Check console logs**: 1 minute
3. **Identify error**: 2 minutes
4. **Report error**: 1 minute

**Total**: ~5 minutes to get exact error

---

## What to Report Back

```
TEST REPORT
===========

Step 1: Upload Test
- Started: [time]
- Files selected: selfie, aadhaar, pan
- Form submitted: yes/no

Step 2: Console Output
[Paste ENTIRE console section for first document upload]

Step 3: Error Found?
- Error phase: [Upload/SignedURL/DatabaseInsert/Success]
- Error message: [exact text]
- Error code: [if any]

Step 4: Supabase Check
- Storage bucket: [has files/no files]
- Database table: [has rows/no rows]

Step 5: What should happen next?
[Your observation]
```

---

## Build Status ✅

- Build time: 19.86 seconds
- Modules: 3,500 transformed
- Errors: 0
- Status: READY

---

## Next Action

🚀 **Run the test NOW** and share the console output!

The detailed logging will tell us EXACTLY where the upload is failing!
