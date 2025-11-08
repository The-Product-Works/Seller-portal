import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Clock } from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ChatMessage = {
  id: string;
  is_from_admin: boolean;
  message: string;
  created_at: string;
  product_title?: string;
  read_at?: string;
};

type ProductOption = { listing_id: string; seller_title: string };

export default function ChatWithAdmin() {
  const [sellerId, setSellerId] = useState<string>("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const loadProducts = useCallback(async (sid: string) => {
    try {
      const { data, error } = await supabase
        .from("seller_product_listings")
        .select("listing_id, seller_title")
        .eq("seller_id", sid)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading products:", error);
        return;
      }
      setProducts((data || []) as ProductOption[]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const sid = await getAuthenticatedSellerId();
      if (!sid) {
        toast({ title: "Sign in required", description: "Please sign in to access chat", variant: "destructive" });
        return;
      }
      setSellerId(sid);
      await loadProducts(sid);

      // Mock initial messages (replace with real chat table later)
      const now = new Date();
      setMessages([
        { id: "m1", is_from_admin: true, message: "Hello! Admin here — how can we help?", created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString() },
        { id: "m2", is_from_admin: false, message: "I have a question about a product listing.", created_at: new Date(now.getTime() - 1000 * 60 * 60 * 23).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loadProducts, toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const message: ChatMessage = {
        id: `m-${Date.now()}`,
        is_from_admin: false,
        message: newMessage.trim(),
        created_at: new Date().toISOString(),
        product_title: selectedProduct ? products.find(p => p.listing_id === selectedProduct)?.seller_title : undefined,
      };

      setMessages(prev => [...prev, message]);
      setNewMessage("");

      // Simulate admin acknowledgement
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { id: `a-${Date.now()}`, is_from_admin: true, message: "Thanks — we'll review and get back to you.", created_at: new Date().toISOString() },
        ]);
      }, 1200);
      toast({ title: "Message sent", description: "Admin will respond shortly" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }, [newMessage, sending, selectedProduct, products, toast]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Chat with Admin</h1>
        <Badge variant="secondary" className="flex items-center gap-1">
          <MessageCircle className="w-4 h-4" />
          Support Chat
        </Badge>
      </div>

      <Card className="h-[580px] flex flex-col">
        <CardHeader className="flex items-center gap-4 justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" /> Admin Support
          </CardTitle>
          <div className="w-80">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select product (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific product</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.listing_id} value={p.listing_id}>{p.seller_title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-500">Start a conversation with admin for help.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.is_from_admin ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[70%] rounded-lg p-3 ${msg.is_from_admin ? 'bg-gray-100 text-gray-900' : 'bg-blue-500 text-white'}`}>
                  {msg.product_title && <div className="text-xs opacity-80 mb-1">Re: {msg.product_title}</div>}
                  <div className="text-sm leading-relaxed">{msg.message}</div>
                  <div className="text-xs opacity-70 mt-2 text-right">{new Date(msg.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={2} placeholder="Type your message..." />
            </div>
            <div className="flex flex-col">
              <Button onClick={sendMessage} disabled={!newMessage.trim() || sending}>
                {sending ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />} 
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-4 text-sm text-gray-600">
        <h3 className="font-medium mb-2">Chat Guidelines</h3>
        <ul className="space-y-1 text-xs">
          <li>• Admin typically responds within 24 hours.</li>
          <li>• Include product details for faster resolution.</li>
          <li>• Do not share sensitive personal information in chat.</li>
        </ul>
      </div>
    </div>
  );
}
