import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Wallet, DollarSign, CreditCard, Bank, 
  TrendingUp, Calendar, CheckCircle, 
  AlertCircle, Download, Eye 
} from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BankDetails {
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  ifsc_code: string;
  branch_name: string;
  account_type: 'savings' | 'current';
}

interface EarningsData {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  monthlyEarnings: { month: string; amount: number }[];
  recentTransactions: {
    id: string;
    type: 'sale' | 'commission' | 'bonus' | 'redemption';
    amount: number;
    description: string;
    date: string;
    status: 'completed' | 'pending' | 'failed';
  }[];
}

interface RedemptionRequest {
  amount: number;
  bank_details: BankDetails;
  requested_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transaction_id?: string;
}

export default function Redeem() {
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    account_holder_name: "",
    account_number: "",
    bank_name: "",
    ifsc_code: "",
    branch_name: "",
    account_type: "savings",
  });
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    availableBalance: 0,
    pendingBalance: 0,
    monthlyEarnings: [],
    recentTransactions: [],
  });
  const [redeemAmount, setRedeemAmount] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [recentRedemptions, setRecentRedemptions] = useState<RedemptionRequest[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadRedeemData();
  }, [loadRedeemData]);

  const loadRedeemData = useCallback(async () => {
    setLoading(true);
    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) {
        toast({
          title: "Authentication Error",
          description: "Please log in to access redeem options",
          variant: "destructive",
        });
        return;
      }

      // Load seller bank details (simulated - you'd create a seller_bank_details table)
      // const { data: bankData } = await supabase
      //   .from("seller_bank_details")
      //   .select("*")
      //   .eq("seller_id", sellerId)
      //   .single();

      // Simulate bank details
      const mockBankDetails = {
        account_holder_name: "John Doe",
        account_number: "1234567890",
        bank_name: "State Bank of India",
        ifsc_code: "SBIN0001234",
        branch_name: "Main Branch",
        account_type: "savings" as const,
      };
      setBankDetails(mockBankDetails);

      // Calculate earnings from orders
      const { data: orderData, error: orderError } = await supabase
        .from("order_items")
        .select(`
          quantity,
          price_per_unit,
          subtotal,
          orders!inner(
            status,
            created_at,
            seller_id
          )
        `)
        .eq("orders.seller_id", sellerId)
        .eq("orders.status", "delivered");

      if (orderError) {
        console.error("Error fetching earnings:", orderError);
      }

      const currentDate = new Date();
      const totalEarnings = (orderData || []).reduce((sum, item) => 
        sum + (item.subtotal || (item.quantity * item.price_per_unit)), 0
      );

      // Simulate commission (10% platform fee)
      const netEarnings = totalEarnings * 0.9;
      const availableBalance = netEarnings * 0.8; // 80% available for redemption
      const pendingBalance = netEarnings * 0.2; // 20% pending

      // Generate monthly earnings
      const monthlyEarnings = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en', { month: 'short', year: 'numeric' });
        const amount = Math.random() * 5000 + 1000; // Random amount for demo
        monthlyEarnings.push({ month: monthName, amount });
      }

      // Generate recent transactions
      const recentTransactions = [
        {
          id: "1",
          type: "sale" as const,
          amount: 850,
          description: "Product sale commission",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: "completed" as const,
        },
        {
          id: "2",
          type: "sale" as const,
          amount: 1200,
          description: "Product sale commission",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: "completed" as const,
        },
        {
          id: "3",
          type: "bonus" as const,
          amount: 500,
          description: "Performance bonus",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "completed" as const,
        },
        {
          id: "4",
          type: "redemption" as const,
          amount: -2000,
          description: "Bank transfer redemption",
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: "completed" as const,
        },
      ];

      setEarningsData({
        totalEarnings: netEarnings,
        availableBalance,
        pendingBalance,
        monthlyEarnings,
        recentTransactions,
      });

      // Load recent redemptions
      const mockRedemptions: RedemptionRequest[] = [
        {
          amount: 2000,
          bank_details: mockBankDetails,
          requested_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: "completed",
          transaction_id: "TXN123456789",
        },
        {
          amount: 1500,
          bank_details: mockBankDetails,
          requested_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          status: "completed",
          transaction_id: "TXN123456788",
        },
      ];
      setRecentRedemptions(mockRedemptions);

    } catch (error) {
      console.error("Error loading redeem data:", error);
      toast({
        title: "Error",
        description: "Failed to load redeem information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveBankDetails = async () => {
    setSaving(true);
    try {
      // In real implementation, save to seller_bank_details table
      // const { error } = await supabase
      //   .from("seller_bank_details")
      //   .upsert([{ ...bankDetails, seller_id: sellerId }]);

      toast({
        title: "Bank Details Saved",
        description: "Your bank details have been updated successfully",
      });
      setShowBankForm(false);
    } catch (error) {
      console.error("Error saving bank details:", error);
      toast({
        title: "Error",
        description: "Failed to save bank details",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const requestRedemption = async () => {
    const amount = parseFloat(redeemAmount);
    if (!amount || amount <= 0 || amount > earningsData.availableBalance) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid redemption amount",
        variant: "destructive",
      });
      return;
    }

    if (!bankDetails.account_number) {
      toast({
        title: "Bank Details Required",
        description: "Please add your bank details first",
        variant: "destructive",
      });
      setShowBankForm(true);
      return;
    }

    setRedeeming(true);
    try {
      // In real implementation, create redemption request
      // const { error } = await supabase
      //   .from("redemption_requests")
      //   .insert([{
      //     seller_id: sellerId,
      //     amount,
      //     bank_details: bankDetails,
      //     status: 'pending'
      //   }]);

      const newRedemption: RedemptionRequest = {
        amount,
        bank_details: bankDetails,
        requested_at: new Date().toISOString(),
        status: "pending",
      };

      setRecentRedemptions(prev => [newRedemption, ...prev]);
      setEarningsData(prev => ({
        ...prev,
        availableBalance: prev.availableBalance - amount,
        pendingBalance: prev.pendingBalance + amount,
      }));

      toast({
        title: "Redemption Requested",
        description: `₹${amount} redemption request submitted successfully`,
      });
      setRedeemAmount("");
    } catch (error) {
      console.error("Error requesting redemption:", error);
      toast({
        title: "Error",
        description: "Failed to process redemption request",
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "default",
      pending: "secondary",
      processing: "outline",
      failed: "destructive",
    } as const;
    return variants[status as keyof typeof variants] || "secondary";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Redeem Earnings</h1>
        <Button
          variant="outline"
          onClick={() => setShowBankForm(true)}
          className="flex items-center gap-2"
        >
          <Bank className="w-4 h-4" />
          Bank Details
        </Button>
      </div>

      {/* Earnings Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(earningsData.totalEarnings)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lifetime earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(earningsData.availableBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for redemption
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(earningsData.pendingBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Processing/Locked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Redemption Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Request Redemption
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="amount">Amount to Redeem</Label>
              <Input
                id="amount"
                type="number"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                placeholder="Enter amount"
                max={earningsData.availableBalance}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum available: {formatCurrency(earningsData.availableBalance)}
              </p>
            </div>
            <div className="flex flex-col justify-end">
              <Button
                onClick={requestRedemption}
                disabled={redeeming || !redeemAmount}
                className="flex items-center gap-2"
              >
                {redeeming ? (
                  <>Loading...</>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    Redeem
                  </>
                )}
              </Button>
            </div>
          </div>

          {bankDetails.account_number && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Bank Details on File:</p>
              <p className="text-sm text-gray-600">
                {bankDetails.account_holder_name} - {bankDetails.bank_name}
                <br />
                Account: ****{bankDetails.account_number.slice(-4)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {earningsData.monthlyEarnings.map((month, index) => {
              const maxAmount = Math.max(...earningsData.monthlyEarnings.map(m => m.amount));
              const percentage = (month.amount / maxAmount) * 100;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium">{month.month}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="w-24 text-sm text-right">
                    {formatCurrency(month.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {earningsData.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </p>
                    <Badge variant={getStatusBadge(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Redemptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRedemptions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No redemptions yet
                </p>
              ) : (
                recentRedemptions.map((redemption, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Bank Transfer</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(redemption.requested_at)}
                      </p>
                      {redemption.transaction_id && (
                        <p className="text-xs text-muted-foreground">
                          TXN: {redemption.transaction_id}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(redemption.amount)}</p>
                      <Badge variant={getStatusBadge(redemption.status)}>
                        {redemption.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Details Dialog */}
      <Dialog open={showBankForm} onOpenChange={setShowBankForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bank Details</DialogTitle>
            <DialogDescription>
              Add or update your bank details for redemptions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="account_holder">Account Holder Name</Label>
              <Input
                id="account_holder"
                value={bankDetails.account_holder_name}
                onChange={(e) => setBankDetails(prev => ({ 
                  ...prev, account_holder_name: e.target.value 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                value={bankDetails.account_number}
                onChange={(e) => setBankDetails(prev => ({ 
                  ...prev, account_number: e.target.value 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={bankDetails.bank_name}
                onChange={(e) => setBankDetails(prev => ({ 
                  ...prev, bank_name: e.target.value 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="ifsc">IFSC Code</Label>
              <Input
                id="ifsc"
                value={bankDetails.ifsc_code}
                onChange={(e) => setBankDetails(prev => ({ 
                  ...prev, ifsc_code: e.target.value 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="branch">Branch Name</Label>
              <Input
                id="branch"
                value={bankDetails.branch_name}
                onChange={(e) => setBankDetails(prev => ({ 
                  ...prev, branch_name: e.target.value 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="account_type">Account Type</Label>
              <Select
                value={bankDetails.account_type}
                onValueChange={(value: 'savings' | 'current') => 
                  setBankDetails(prev => ({ ...prev, account_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={saveBankDetails}
              disabled={saving}
              className="w-full"
            >
              {saving ? "Saving..." : "Save Bank Details"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}