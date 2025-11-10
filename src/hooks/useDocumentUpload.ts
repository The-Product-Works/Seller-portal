import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DocumentType, UploadedDocument } from "@/types/seller.types";
import {
  documentUploadSchema,
  validateFile as zodValidateFile,
  FILE_VALIDATION_CONSTANTS,
  documentDeleteSchema,
} from "@/lib/validations/document.schema";
import { ZodError } from "zod";

export const useDocumentUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = async (
    sellerId: string,
    file: File,
    docType: DocumentType
  ): Promise<{ success: boolean; document?: UploadedDocument; error?: string }> => {
    setUploading(true);
    setError(null);

    try {
      // Validate using Zod schema
      const validationResult = documentUploadSchema.safeParse({
        sellerId,
        file,
        docType,
      });

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || "Validation failed";
        throw new Error(errorMessage);
      }

      // Upload file to storage
      // Bucket: seller_details
      // Path inside bucket: {sellerId}/{docType}/{timestamp}_{filename}
      const internalPath = `${sellerId}/${docType}/${Date.now()}_${file.name}`;

      console.log("=== UPLOAD DEBUG START ===");
      console.log("Uploading to bucket 'seller_details'");
      console.log("Seller ID:", sellerId);
      console.log("Doc Type:", docType);
      console.log("File Name:", file.name);
      console.log("File Size:", file.size);
      console.log("File Type:", file.type);
      console.log("Internal Path:", internalPath);
      console.log("Auth User:", (await supabase.auth.getUser()).data.user?.id);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("seller_details")
        .upload(internalPath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      console.log("Upload response - data:", uploadData);
      console.log("Upload response - error:", uploadError);
      console.log("=== UPLOAD DEBUG END ===");

      if (uploadError) {
        console.error("UPLOAD FAILED - ERROR DETAILS:", {
          message: uploadError.message,
          name: uploadError.name,
          statusCode: (uploadError as unknown as Record<string, unknown>).statusCode,
          fullError: uploadError
        });
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get signed URL (valid for 100 years - effectively permanent)
      console.log("Generating signed URL for path:", internalPath);
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("seller_details")
        .createSignedUrl(internalPath, 60 * 60 * 24 * 365 * 100);

      console.log("Signed URL response - data:", signedUrlData);
      console.log("Signed URL response - error:", signedUrlError);

      if (signedUrlError) {
        console.error("SIGNED URL FAILED - ERROR DETAILS:", {
          message: signedUrlError.message,
          name: signedUrlError.name,
          fullError: signedUrlError
        });
        throw new Error(`Signed URL generation failed: ${signedUrlError.message}`);
      }

      // Save document metadata to seller_documents table
      // Store the signed URL in storage_path so client can use it directly as an <img src>
      const signedUrl = signedUrlData?.signedUrl ?? null;
      console.log("Inserting into seller_documents - Seller ID:", sellerId, "Doc Type:", docType, "Signed URL exists:", !!signedUrl);
      const { data: docData, error: docError } = await supabase
        .from("seller_documents")
        .insert({
          seller_id: sellerId,
          doc_type: docType,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: signedUrl,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      console.log("Database insert response - data:", docData);
      console.log("Database insert response - error:", docError);

      if (docError) {
        console.error("DATABASE INSERT FAILED - ERROR DETAILS:", {
          message: docError.message,
          code: (docError as unknown as Record<string, unknown>).code,
          details: (docError as unknown as Record<string, unknown>).details,
          hint: (docError as unknown as Record<string, unknown>).hint,
          fullError: docError
        });
        // If metadata save fails, try to delete the uploaded file
        await supabase.storage.from("seller_details").remove([internalPath]);
        throw new Error(`Failed to save document metadata: ${docError.message}`);
      }

      const uploadedDoc: UploadedDocument = {
        id: docData.id,
        docType: docType,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        // store internal path in DB so we can create signed URLs on demand and allow deletions
        storagePath: internalPath,
        uploadedAt: docData.uploaded_at,
      };

      setUploading(false);
      return { success: true, document: uploadedDoc };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload document";
      setError(errorMessage);
      setUploading(false);
      console.error("Document upload error:", err);
      return { success: false, error: errorMessage };
    }
  };

  const deleteDocument = async (documentId: string, storagePath: string): Promise<boolean> => {
    try {
      // Validate input using Zod schema
      const validationResult = documentDeleteSchema.safeParse({
        documentId,
        storagePath,
      });

      if (!validationResult.success) {
        console.error("Invalid delete parameters:", validationResult.error);
        return false;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("seller_details")
        .remove([storagePath]);

      if (storageError) {
        console.error("Failed to delete file from storage:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("seller_documents")
        .delete()
        .eq("id", documentId);

      if (dbError) {
        throw new Error(`Failed to delete document: ${dbError.message}`);
      }

      return true;
    } catch (err) {
      console.error("Document deletion error:", err);
      return false;
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Use Zod validation helper
    return zodValidateFile(file);
  };

  return {
    uploadDocument,
    deleteDocument,
    validateFile,
    uploading,
    error,
  };
};