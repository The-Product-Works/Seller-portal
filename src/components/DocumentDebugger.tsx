// Temporary Debug Component - Add this to your KYC or SellerVerification page to see what's happening
// You can remove this after debugging

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DebugResult {
  docType: string;
  originalPath: string;
  cleanPath: string;
  directWorks: boolean;
  cleanWorks: boolean;
  signedUrl?: string;
}

interface DebugInfo {
  docs: Array<Record<string, unknown>>;
  results: DebugResult[];
  docTypes: string[];
  uniqueTypes: string[];
}

export default function DocumentDebugger({ sellerId }: { sellerId: string }) {
  const [debug, setDebug] = useState<DebugInfo | null>(null);

  useEffect(() => {
    async function checkDocs() {
      // 1. Check what's in the database
      const { data: docs, error } = await supabase
        .from('seller_documents')
        .select('*')
        .eq('seller_id', sellerId)
        .order('uploaded_at', { ascending: false });

      console.log('=== DOCUMENT DEBUG ===');
      console.log('Database query error:', error);
      console.log('Documents in DB:', docs);
      
      if (docs) {
        // 2. For each document, try to generate a signed URL
        const results = [];
        for (const doc of docs) {
          const path = doc.storage_path;
          console.log(`\nChecking doc: ${doc.doc_type}`);
          console.log(`  Original path: ${path}`);
          
          // Try with path as-is
          const { data: d1, error: e1 } = await supabase.storage
            .from('seller_details')
            .createSignedUrl(path, 60);
          console.log(`  Direct path result:`, d1 ? 'SUCCESS' : `ERROR: ${e1?.message}`);
          
          // Try removing seller_details/ prefix
          if (path.startsWith('seller_details/')) {
            const cleanPath = path.substring('seller_details/'.length);
            const { data: d2, error: e2 } = await supabase.storage
              .from('seller_details')
              .createSignedUrl(cleanPath, 60);
            console.log(`  Clean path (${cleanPath}):`, d2 ? 'SUCCESS' : `ERROR: ${e2?.message}`);
            
            results.push({
              docType: doc.doc_type,
              originalPath: path,
              cleanPath: cleanPath,
              directWorks: !!d1,
              cleanWorks: !!d2,
              signedUrl: d2?.signedUrl || d1?.signedUrl
            });
          } else {
            results.push({
              docType: doc.doc_type,
              originalPath: path,
              cleanPath: path,
              directWorks: !!d1,
              cleanWorks: !!d1,
              signedUrl: d1?.signedUrl
            });
          }
        }
        
        setDebug({
          docs,
          results,
          docTypes: docs.map(d => d.doc_type),
          uniqueTypes: [...new Set(docs.map(d => d.doc_type))]
        });
        
        console.log('\n=== SUMMARY ===');
        console.log('Total documents:', docs.length);
        console.log('Unique types:', [...new Set(docs.map(d => d.doc_type))]);
        console.log('Results:', results);
      }
    }
    
    checkDocs();
  }, [sellerId]);

  if (!debug) return <div>Loading debug info...</div>;

  return (
    <div className="p-4 bg-gray-100 rounded my-4 text-xs font-mono">
      <h3 className="font-bold mb-2">Document Debug Info</h3>
      <p>Total docs in DB: {debug.docs.length}</p>
      <p>Unique types: {debug.uniqueTypes.join(', ')}</p>
      
      <div className="mt-2 space-y-2">
        {debug.results.map((r: DebugResult, i: number) => (
          <div key={i} className="bg-white p-2 rounded">
            <p className="font-bold">{r.docType}</p>
            <p>Path: {r.originalPath}</p>
            <p>Direct works: {r.directWorks ? '✅' : '❌'}</p>
            <p>Clean works: {r.cleanWorks ? '✅' : '❌'}</p>
            {r.signedUrl && (
              <img src={r.signedUrl} alt={r.docType} className="w-32 h-32 object-cover mt-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
