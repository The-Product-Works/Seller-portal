# KYC Page Updates - Quick Reference

## What Was Changed

### 1. **New User Welcome Message** 
- New sellers now see a celebratory welcome message: "Welcome! 🎉"
- Returns show: "Your KYC has been resubmitted for review"

### 2. **Image Preview Feature** 
- When images are uploaded or previously saved, they now display as previews
- Users can click an X button to remove/replace images
- Shows Selfie, Aadhaar, and PAN images side-by-side

### 3. **Data Persistence on Page Reload**
- All seller information that was previously submitted is now:
  - **Auto-loaded** when the page opens
  - **Pre-filled** in all form fields
  - **Displayed** with previously uploaded images
- Sellers can easily edit and resubmit without re-entering everything

### 4. **Document Visibility**
- Previously uploaded documents from `seller_details` bucket are now visible
- Uses signed URLs stored in `storage_path` column of `seller_documents` table
- Images load directly from storage

## Key Features

✅ **Welcome Message for New Sellers**
- Toast: "Welcome! 🎉 - Your KYC has been submitted successfully. Documents are under review."

✅ **Image Previews for All Documents**
- Selfie Photo - shows preview or file input
- Aadhaar Photo - shows preview or file input  
- PAN Photo - shows preview or file input
- Remove button (X) on each preview

✅ **Form Data Auto-Load**
- Aadhaar Number
- PAN Number
- GSTIN
- Business Name & Type
- Phone & Address
- Bank Details (Name, Account, IFSC, Holder Name)
- Email

✅ **Previously Uploaded Images**
- Loaded from database on page load
- Displayed in preview mode
- Can be replaced by uploading new images
- Accessible via `storage_path` from seller_documents table

## Files Modified
- ✅ `src/pages/KYC.tsx`

## Files NOT Changed (Per Request)
- ✅ `src/hooks/useDocumentUpload.ts` 
- ✅ `src/integrations/supabase/database.types.ts`

## How It Works

### New Seller Submission:
```
1. Seller opens KYC page (no previous data)
2. Fills form + uploads 3 photos (shows previews)
3. Clicks "Submit KYC"
4. Sees: "Welcome! 🎉 Your KYC has been submitted..."
5. Redirected to verification page
```

### Returning Seller:
```
1. Seller opens KYC page
2. All previous data auto-loads
3. Images show as previews from seller_details bucket
4. Can edit any field or replace images
5. Clicks "Submit KYC"
6. Sees: "Your KYC has been resubmitted for review..."
7. Redirected to verification page
```

## Database Columns Used

**From sellers table:**
- aadhaar, pan, gstin
- business_name, business_type
- phone, address_line1
- bank_name, account_number, ifsc_code, account_holder_name
- email

**From seller_documents table:**
- doc_type (selfie, aadhaar, pan)
- storage_path (signed URL to image)
- uploaded_at

## State Management

**New State Added:**
```typescript
const [uploadedDocuments, setUploadedDocuments] = useState<{
  selfie?: string;
  aadhaar?: string;
  pan?: string;
}>({});
```

**Loading Logic:**
- On component mount, fetch seller data from sellers table
- Fetch documents from seller_documents table
- Map doc_type to storage_path
- Populate uploadedDocuments state for display

## UI Components

**Image Preview Section:**
- Grid layout: 3 columns on desktop, responsive on mobile
- Each document shows either:
  - Preview image (if uploaded)
  - File input (if not uploaded)
- Remove button (X) overlays on top-right of preview
- Accessible buttons with aria-labels

**Form Section:**
- All previous fields auto-populated
- Ready for editing and resubmission

## Testing Checklist

- [ ] New seller submission shows "Welcome!" message
- [ ] Returning seller sees all previous data
- [ ] Images display correctly from seller_details bucket
- [ ] Can upload new images to replace old ones
- [ ] Remove button works correctly
- [ ] Resubmission shows correct message
- [ ] Form data persists on page reload
- [ ] Responsive design works on mobile
