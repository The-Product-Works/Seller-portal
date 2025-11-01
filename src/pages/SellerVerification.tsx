import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SellerVerification() {
  const [status, setStatus] = useState<string | null>(null);
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: seller } = await supabase.from('sellers').select('*').eq('user_id', user.id).maybeSingle();
    if (seller) setStatus(seller.verification_status);

    const { data: documents } = await supabase.from('seller_documents').select('*').eq('seller_id', seller?.id);
    setDocs(documents || []);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Verification Status</h2>
      <Card>
        <CardHeader>
          <CardTitle>Status: {status || 'not submitted'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Your verification status and uploaded documents are shown below.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {docs.map(d => (
              <div key={d.id} className="border p-2 rounded">
                <p className="text-xs font-medium">{d.doc_type}</p>
                <img src={d.storage_path} className="w-full h-40 object-contain mt-2" alt={d.doc_type} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
