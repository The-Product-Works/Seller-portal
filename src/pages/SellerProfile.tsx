import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lock, Mail, Phone, MapPin, Building2, FileText } from "lucide-react";

interface SellerProfileData {
  id: string;
  name: string;
  business_name: string | null;
  business_type: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  pan: string | null;
  aadhaar: string | null;
  gstin: string | null;
  pan_verified: boolean | null;
  aadhaar_verified: boolean | null;
  gstin_verified: boolean | null;
  verification_status: string | null;
}

interface EditRequestData {
  seller_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

export default function SellerProfile() {
  const [profile, setProfile] = useState<SellerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<SellerProfileData>>({});
  const [restrictedFieldRequest, setRestrictedFieldRequest] = useState<{
    field: string;
    value: string;
  } | null>(null);
  const { toast } = useToast();

  // List of fields that require admin permission to change
  const restrictedFields = ['name', 'pan', 'aadhaar', 'gstin'];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: string, value: string) => {
    if (restrictedFields.includes(field)) {
      setRestrictedFieldRequest({ field, value });
    } else {
      setEditData({ ...editData, [field]: value });
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update non-restricted fields
      if (Object.keys(editData).length > 0) {
        const { error } = await supabase
          .from('sellers')
          .update(editData)
          .eq('user_id', user.id);

        if (error) throw error;

        // Create notification for admin
        await supabase.from('seller_edit_notifications').insert({
          seller_id: profile?.id,
          changes: editData,
          status: 'unread'
        });

        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }

      // Submit request for restricted field change
      if (restrictedFieldRequest) {
        const { error } = await supabase
          .from('seller_edit_requests')
          .insert({
            seller_id: profile?.id,
            field_name: restrictedFieldRequest.field,
            old_value: profile?.[restrictedFieldRequest.field as keyof SellerProfileData] as string,
            new_value: restrictedFieldRequest.value,
            status: 'pending'
          });

        if (error) throw error;

        toast({
          title: "Request Submitted",
          description: "Your request to change restricted field has been submitted for admin approval",
        });
      }

      setIsEditing(false);
      setEditData({});
      setRestrictedFieldRequest(null);
      loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Seller Profile</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="space-x-2">
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              setEditData({});
              setRestrictedFieldRequest(null);
            }}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Personal Information
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={editData.name ?? profile?.name ?? ''}
                  onChange={(e) => handleEdit('name', e.target.value)}
                  disabled={!isEditing || !profile?.verification_status}
                />
                {profile?.verification_status && (
                  <Badge variant="outline">{profile.verification_status}</Badge>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={editData.email ?? profile?.email ?? ''}
                  onChange={(e) => handleEdit('email', e.target.value)}
                  disabled={!isEditing}
                  type="email"
                  icon={<Mail className="h-4 w-4" />}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={editData.phone ?? profile?.phone ?? ''}
                  onChange={(e) => handleEdit('phone', e.target.value)}
                  disabled={!isEditing}
                  type="tel"
                  icon={<Phone className="h-4 w-4" />}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Business Information
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Business Name</Label>
              <Input
                value={editData.business_name ?? profile?.business_name ?? ''}
                onChange={(e) => handleEdit('business_name', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="grid gap-2">
              <Label>Business Type</Label>
              <Input
                value={editData.business_type ?? profile?.business_type ?? ''}
                onChange={(e) => handleEdit('business_type', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Address
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Address Line 1</Label>
              <Input
                value={editData.address_line1 ?? profile?.address_line1 ?? ''}
                onChange={(e) => handleEdit('address_line1', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="grid gap-2">
              <Label>Address Line 2</Label>
              <Input
                value={editData.address_line2 ?? profile?.address_line2 ?? ''}
                onChange={(e) => handleEdit('address_line2', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input
                  value={editData.city ?? profile?.city ?? ''}
                  onChange={(e) => handleEdit('city', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input
                  value={editData.state ?? profile?.state ?? ''}
                  onChange={(e) => handleEdit('state', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input
                  value={editData.country ?? profile?.country ?? ''}
                  onChange={(e) => handleEdit('country', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <Label>PIN Code</Label>
                <Input
                  value={editData.pincode ?? profile?.pincode ?? ''}
                  onChange={(e) => handleEdit('pincode', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents & Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Documents & Verification
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>PAN Number</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={editData.pan ?? profile?.pan ?? ''}
                  onChange={(e) => handleEdit('pan', e.target.value)}
                  disabled={!isEditing || !profile?.pan_verified}
                />
                <Badge variant={profile?.pan_verified ? "default" : "secondary"}>
                  {profile?.pan_verified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Aadhaar Number</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={editData.aadhaar ?? profile?.aadhaar ?? ''}
                  onChange={(e) => handleEdit('aadhaar', e.target.value)}
                  disabled={!isEditing || !profile?.aadhaar_verified}
                />
                <Badge variant={profile?.aadhaar_verified ? "default" : "secondary"}>
                  {profile?.aadhaar_verified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>GSTIN</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={editData.gstin ?? profile?.gstin ?? ''}
                  onChange={(e) => handleEdit('gstin', e.target.value)}
                  disabled={!isEditing || !profile?.gstin_verified}
                />
                <Badge variant={profile?.gstin_verified ? "default" : "secondary"}>
                  {profile?.gstin_verified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restricted Field Change Request Dialog */}
      <Dialog open={!!restrictedFieldRequest} onOpenChange={() => setRestrictedFieldRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Field Change</DialogTitle>
            <DialogDescription>
              This field requires admin approval to change. Your request will be reviewed by an administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Field</Label>
              <Input value={restrictedFieldRequest?.field} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Current Value</Label>
              <Input
                value={profile?.[restrictedFieldRequest?.field as keyof SellerProfileData] as string}
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label>New Value</Label>
              <Input
                value={restrictedFieldRequest?.value || ''}
                onChange={(e) =>
                  setRestrictedFieldRequest(prev =>
                    prev ? { ...prev, value: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Reason for Change</Label>
              <Textarea placeholder="Please explain why you need to change this field..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestrictedFieldRequest(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}