import { supabase } from "@/integrations/supabase/client";

/**
 * Gets the seller ID from the authenticated user
 * 
 * IMPORTANT: This fetches sellers.id (NOT auth.users.id)
 * The sellers table has a separate primary key (sellers.id) 
 * that is different from the user_id foreign key.
 * 
 * @returns The seller.id if found, null otherwise
 */
export async function getAuthenticatedSellerId(): Promise<string | null> {
  try {
    // Get the authenticated user
    const { data: auth, error: authError } = await supabase.auth.getUser();
    
    if (authError || !auth?.user) {
      console.error("Authentication error:", authError);
      return null;
    }

    // Fetch the seller record using user_id to get the seller.id
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("user_id", auth.user.id)
      .single();

    if (sellerError) {
      console.error("Error fetching seller:", sellerError);
      return null;
    }

    return seller?.id || null;
  } catch (error) {
    console.error("Unexpected error in getAuthenticatedSellerId:", error);
    return null;
  }
}

/**
 * Gets the full seller profile from the authenticated user
 */
export async function getAuthenticatedSellerProfile() {
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    
    if (authError || !auth?.user) {
      console.error("Authentication error:", authError);
      return null;
    }

    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("*")
      .eq("user_id", auth.user.id)
      .single();

    if (sellerError) {
      console.error("Error fetching seller profile:", sellerError);
      return null;
    }

    return seller;
  } catch (error) {
    console.error("Unexpected error in getAuthenticatedSellerProfile:", error);
    return null;
  }
}
