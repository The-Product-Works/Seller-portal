import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Seller = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  aadhaar: string | null;
  pan: string | null;
  gstin: string | null;
  verification_status: string | null;
};

export default function Verifications() {
  const [pending, setPending] = useState<Seller[]>([]);
  const [history, setHistory] = useState<Seller[]>([]);
  const [selected, setSelected] = useState<Seller | null>(null);
  const [docs, setDocs] = useState<Array<any>>([]);
  const [comment, setComment] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    // Pending sellers
    const { data: pendingData } = await supabase
      .from("sellers")
      .select("id,user_id,name,email,phone,aadhaar,pan,gstin,verification_status")
      .in('verification_status', ['pending','rejected'])
      .order('created_at', { ascending: false });

    // History (approved)
    const { data: historyData } = await supabase
      .from("sellers")
      .select("id,user_id,name,email,phone,aadhaar,pan,gstin,verification_status")
      .eq('verification_status', 'approved')
      .order('updated_at', { ascending: false })
      .limit(50);

    setPending(pendingData || []);
    setHistory(historyData || []);
  };

  const loadDocuments = async (sellerId: string) => {
    const { data } = await supabase
      .from('seller_documents')
      .select('*')
      .eq('seller_id', sellerId);
    setDocs(data || []);
  };

  const openSeller = async (s: Seller) => {
    setSelected(s);
    await loadDocuments(s.id);
    setComment("");
  };

  const takeAction = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { error } = await supabase
      .from('sellers')
      .update({ verification_status: newStatus })
      .eq('id', selected.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // create notification / history entry
    const message = action === 'approve'
      ? `Your account has been verified by admin.`
      : `Verification rejected: ${comment || 'Please resubmit clear documents.'}`;

    await supabase.from('seller_edit_notifications').insert({
      seller_id: selected.id,
      request_id: selected.id,
      message,
      status: 'unread',
    });

    toast({ title: 'Success', description: `Seller ${action}d` });
    setSelected(null);
    fetchLists();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Seller Verifications</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending</CardTitle>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? <p className="text-sm text-muted-foreground">No pending sellers</p> : (
                <ul className="space-y-2">
                  {pending.map(s => (
                    <li key={s.id} className="p-2 border rounded hover:bg-muted cursor-pointer" onClick={() => openSeller(s)}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.phone || s.email}</p>
                        </div>
                        <div className="text-xs px-2 py-1 bg-yellow-100 rounded text-yellow-800">{s.verification_status}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History (Approved)</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? <p className="text-sm text-muted-foreground">No history yet</p> : (
                <ul className="space-y-2">
                  {history.map(s => (
                    <li key={s.id} className="p-2 border rounded hover:bg-muted cursor-pointer" onClick={() => openSeller(s)}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.phone || s.email}</p>
                        </div>
                        <div className="text-xs px-2 py-1 bg-green-100 rounded text-green-800">{s.verification_status}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {!selected ? (
            <Card>
              <CardHeader>
                <CardTitle>Select a seller to review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Click any seller on the left to view full details and documents.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{selected.name} — Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selected.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selected.email}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Documents</p>
                  <div className="grid md:grid-cols-3 gap-4 mt-2">
                    {docs.map((d: any) => (
                      <div key={d.id} className="border rounded p-2">
                        <p className="text-xs font-medium">{d.doc_type}</p>
                        <img src={d.storage_path} alt={d.doc_type} className="w-full h-36 object-contain mt-2" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Admin comment (optional)</p>
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => takeAction('approve')} className="bg-green-600 text-white">Approve</Button>
                  <Button onClick={() => takeAction('reject')} className="bg-red-600 text-white">Reject</Button>
                  <Button variant="ghost" onClick={() => { setSelected(null); setDocs([]); }}>Close</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
