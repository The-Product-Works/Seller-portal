import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Wallet, DollarSign, CreditCard, Building, 
  TrendingUp, Calendar, CheckCircle, 
  AlertCircle, Download, Eye, Flag
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
import { SellerRaiseDispute } from "@/components/SellerRaiseDispute";

interface BankDetails {
  account_holder_name: string | null;
  account_number: string | null;
  bank_name: string | null;
  ifsc_code: string | null;
  account_type: string | null;
  account_verified: boolean | null;
}

interface EarningsData {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  weeklyEarnings: { day: string; amount: number }[];
  monthlyEarnings: { month: string; amount: number }[];
  yearlyEarnings: { month: string; amount: number }[];
  recentTransactions: {
    id: string;
    type: 'sale' | 'commission' | 'bonus' | 'redemption';
    amount: number;
    description: string;
    date: string;
    status: 'completed' | 'pending' | 'failed';
    grossAmount?: number;
    commission?: number;
    gst?: number;
  }[];
  allTransactions?: {
    id: string;
    type: 'sale' | 'commission' | 'bonus' | 'redemption';
    amount: number;
    description: string;
    date: string;
    status: 'completed' | 'pending' | 'failed';
    grossAmount?: number;
    commission?: number;
    gst?: number;
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
    account_holder_name: null,
    account_number: null,
    bank_name: null,
    ifsc_code: null,
    account_type: null,
    account_verified: null,
  });
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    availableBalance: 0,
    pendingBalance: 0,
    weeklyEarnings: [],
    monthlyEarnings: [],
    yearlyEarnings: [],
    recentTransactions: [],
    allTransactions: [],
  });
  const [redeemAmount, setRedeemAmount] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [recentRedemptions, setRecentRedemptions] = useState<RedemptionRequest[]>([]);
  const [graphView, setGraphView] = useState<'week' | 'month' | 'year'>('month');
  const [showLedger, setShowLedger] = useState(false);
  const [sellerId, setSellerId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const initLoad = async () => {
      const id = await getAuthenticatedSellerId();
      if (id) {
        setSellerId(id);
        await loadRedeemData(id);
      }
    };
    initLoad();
  }, []);

  const loadRedeemData = useCallback(async (id: string) => {
    setLoading(true);
    try {
      // Load seller bank details from sellers table
      const { data: seller, error: sellerError } = await supabase
        .from("sellers")
        .select(`
          account_holder_name,
          account_number,
          bank_name,
          ifsc_code,
          account_type,
          account_verified
        `)
        .eq("id", id)
        .single();

      if (sellerError) {
        console.error("Error fetching seller:", sellerError);
      } else if (seller) {
        setBankDetails(seller as BankDetails);
      }

      // Calculate earnings from order_items
      const { data: orderItems, error: orderError } = await supabase
        .from("order_items")
        .select(`
          quantity,
          price_per_unit,
          created_at,
          orders!inner(status, created_at)
        `)
        .eq("seller_id", id)
        .in("orders.status", ["completed", "delivered"]);

      if (orderError) {
        console.error("Error fetching earnings:", orderError);
      }

      // Calculate earnings with 2% commission - 18% GST
      const currentDate = new Date();
      let totalRevenue = 0;
      const dayEarnings: { [key: string]: number } = {};
      const monthEarnings: { [key: string]: number } = {};
      const yearEarnings: { [key: string]: number } = {};

      (orderItems || []).forEach((item) => {
        const itemTotal = item.quantity * item.price_per_unit;
        const commission = itemTotal * 0.02;
        const gst = commission * 0.18;
        const sellerEarning = itemTotal - commission - gst;
        
        totalRevenue += sellerEarning;

        // Group by date
        const itemDate = new Date(item.created_at);
        const dayKey = itemDate.toISOString().split('T')[0];
        const monthKey = itemDate.toLocaleDateString('en', { month: 'short' });
        const yearMonthKey = itemDate.toLocaleDateString('en', { 
          year: '2-digit', 
          month: 'short' 
        });

        dayEarnings[dayKey] = (dayEarnings[dayKey] || 0) + sellerEarning;
        monthEarnings[monthKey] = (monthEarnings[monthKey] || 0) + sellerEarning;
        yearEarnings[yearMonthKey] = (yearEarnings[yearMonthKey] || 0) + sellerEarning;
      });

      // Generate week data (last 7 days)
      const weekData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        const dayKey = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en', { weekday: 'short' });
        weekData.push({
          day: dayName,
          amount: dayEarnings[dayKey] || 0,
        });
      }

      // Generate month data (last 12 months)
      const monthData = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en', { month: 'short' });
        monthData.push({
          month: monthKey,
          amount: monthEarnings[monthKey] || 0,
        });
      }

      // Generate year data (last 12 months with year)
      const yearData = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        const yearMonthKey = date.toLocaleDateString('en', { 
          year: '2-digit', 
          month: 'short' 
        });
        yearData.push({
          month: yearMonthKey,
          amount: yearEarnings[yearMonthKey] || 0,
        });
      }

      // Available (80%) vs Pending (20%)
      const availableBalance = totalRevenue * 0.8;
      const pendingBalance = totalRevenue * 0.2;

      // Generate ALL transactions for ledger (not just recent 4)
      const allTransactions = (orderItems || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((item, idx) => {
          const itemTotal = item.quantity * item.price_per_unit;
          const commission = itemTotal * 0.02;
          const gst = commission * 0.18;
          const sellerEarning = itemTotal - commission - gst;
          
          return {
            id: `trans-${idx}`,
            type: "sale" as const,
            amount: sellerEarning,
            description: `Product sale (${item.quantity} units @ ₹${item.price_per_unit})`,
            date: item.created_at,
            status: "completed" as const,
            grossAmount: itemTotal,
            commission: commission,
            gst: gst,
          };
        });
      
      // Recent transactions (last 4 for overview)
      const recentTransactions = allTransactions.slice(0, 4);

      // Console logs for debugging and seller reference
      console.log('=== SELLER REDEEM PAGE - EARNINGS SUMMARY ===');
      console.log('Seller ID:', id);
      console.log('Total Orders Processed:', allTransactions.length);
      console.log('Total Revenue (Gross):', totalRevenue + (allTransactions.reduce((sum, t) => sum + (t.commission || 0) + (t.gst || 0), 0)));
      console.log('Total After Commission & GST (Net):', totalRevenue);
      console.log('Available for Redeem (80%):', availableBalance);
      console.log('Pending Admin Approval (20%):', pendingBalance);
      console.log('---');
      console.log('Transaction Breakdown:');
      allTransactions.forEach((trans, idx) => {
        console.log(`${idx + 1}. Date: ${new Date(trans.date).toLocaleDateString()}, Gross: ₹${trans.grossAmount}, Commission: ₹${trans.commission?.toFixed(2)}, GST: ₹${trans.gst?.toFixed(2)}, Net: ₹${trans.amount.toFixed(2)}`);
      });
      console.log('===========================================');

      setEarningsData({
        totalEarnings: totalRevenue,
        availableBalance,
        pendingBalance,
        weeklyEarnings: weekData,
        monthlyEarnings: monthData,
        yearlyEarnings: yearData,
        recentTransactions,
        allTransactions,
      });

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
    if (!bankDetails.account_holder_name || !bankDetails.account_number || 
        !bankDetails.bank_name || !bankDetails.ifsc_code) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all bank details",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Update sellers table with KYC bank details
      const { error } = await supabase
        .from("sellers")
        .update({
          account_holder_name: bankDetails.account_holder_name,
          account_number: bankDetails.account_number,
          bank_name: bankDetails.bank_name,
          ifsc_code: bankDetails.ifsc_code,
          account_type: bankDetails.account_type,
        })
        .eq("id", sellerId);

      if (error) {
        throw error;
      }

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

  const getGraphData = () => {
    switch (graphView) {
      case 'week':
        return earningsData.weeklyEarnings;
      case 'year':
        return earningsData.yearlyEarnings;
      case 'month':
      default:
        return earningsData.monthlyEarnings;
    }
  };

  const graphLabel = graphView === 'week' ? 'Day' : (graphView === 'year' ? 'Month-Year' : 'Month');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Redeem Your Earnings</h1>
            <p className="text-gray-600 mt-2">Monitor your earnings and manage redemptions</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDispute(true)}
              className="flex items-center gap-2"
            >
              <Flag className="w-4 h-4" />
              Raise Dispute
            </Button>
            <Button
              onClick={() => setShowBankForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Building className="w-4 h-4" />
              Bank Details
            </Button>
          </div>
        </div>

        {/* Bank Details Status - Enhanced */}
        {bankDetails.account_number ? (
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900 text-lg">✓ Bank Details Verified</p>
                  <p className="text-sm text-green-700 mt-2">
                    <strong>{bankDetails.account_holder_name}</strong> at {bankDetails.bank_name}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Account: ****{bankDetails.account_number.slice(-4)} ({bankDetails.account_type})
                  </p>
                </div>
                {bankDetails.account_verified && (
                  <div className="text-right">
                    <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                    <p className="text-xs text-green-700">Ready to Redeem</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-amber-900">No Bank Details Added</p>
                  <p className="text-sm text-amber-700">Add your bank details to enable redemptions</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowBankForm(true)}
                >
                  Add Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Earnings Overview - Enhanced */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-900">Total Earnings</CardTitle>
              <div className="bg-green-200 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                {formatCurrency(earningsData.totalEarnings)}
              </div>
              <p className="text-xs text-green-600 mt-2">
                After 2% commission + 18% GST
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Available Balance</CardTitle>
              <div className="bg-blue-200 p-2 rounded-lg">
                <Wallet className="h-5 w-5 text-blue-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {formatCurrency(earningsData.availableBalance)}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Ready for redemption (80%)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-orange-900">Pending Balance</CardTitle>
              <div className="bg-orange-200 p-2 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700">
                {formatCurrency(earningsData.pendingBalance)}
              </div>
              <p className="text-xs text-orange-600 mt-2">
                Awaiting admin approval (20%)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Redemption Form - Enhanced */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <DollarSign className="w-6 h-6 text-blue-600" />
              Request Redemption
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">Transfer your earnings to your bank account</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="amount" className="text-sm font-semibold">Amount to Redeem</Label>
                <Input
                  id="amount"
                  type="number"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  placeholder="Enter amount"
                  max={earningsData.availableBalance}
                  disabled={!bankDetails.account_number}
                  className="mt-2 border-2 focus:border-blue-500"
                />
                <p className="text-xs text-blue-600 mt-2">
                  Maximum available: <strong>{formatCurrency(earningsData.availableBalance)}</strong>
                </p>
              </div>
              <div className="flex flex-col justify-end">
                <Button
                  onClick={requestRedemption}
                  disabled={redeeming || !redeemAmount || !bankDetails.account_number}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 h-10"
                >
                  {redeeming ? (
                    <>Processin...</>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Request Redemption
                    </>
                  )}
                </Button>
              </div>
            </div>

            {redeemAmount && !isNaN(parseFloat(redeemAmount)) && (
              <div className="bg-white border-2 border-blue-200 p-4 rounded-lg">
                <p className="font-semibold text-gray-900 mb-3">Redemption Details:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount to Redeem:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(parseFloat(redeemAmount))}</span>
                  </div>
                  <div className="border-t pt-2">
                    <p className="text-gray-600 text-xs">✓ Direct transfer to your bank account</p>
                    <p className="text-gray-600 text-xs">✓ Processed within 3-5 business days</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings Charts */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Earnings Overview</CardTitle>
              <Select value={graphView} onValueChange={(v: 'week' | 'month' | 'year') => setGraphView(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getGraphData().map((data, index) => {
                const maxAmount = Math.max(...getGraphData().map(d => d.amount), 1);
                const percentage = Math.round((data.amount / maxAmount) * 100);
                const label = graphView === 'week' ? data.day : data.month;
                
                // Create width class based on percentage
                let widthClass = 'w-0';
                if (percentage > 90) widthClass = 'w-full';
                else if (percentage > 80) widthClass = 'w-11/12';
                else if (percentage > 70) widthClass = 'w-10/12';
                else if (percentage > 60) widthClass = 'w-9/12';
                else if (percentage > 50) widthClass = 'w-8/12';
                else if (percentage > 40) widthClass = 'w-7/12';
                else if (percentage > 30) widthClass = 'w-6/12';
                else if (percentage > 20) widthClass = 'w-5/12';
                else if (percentage > 10) widthClass = 'w-4/12';
                else if (percentage > 0) widthClass = 'w-1/12';
                
                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-16 text-sm font-medium">{label}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${widthClass} bg-blue-500 h-2 rounded-full transition-all duration-300`}
                      />
                    </div>
                    <div className="w-24 text-sm text-right">
                      {formatCurrency(data.amount)}
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
              {earningsData.recentTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-4">
                  {earningsData.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600 text-sm">
                          +{formatCurrency(transaction.amount)}
                        </p>
                        <Badge variant="default" className="text-xs">
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Redemptions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentRedemptions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No redemptions yet
                </p>
              ) : (
                <div className="space-y-4">
                  {recentRedemptions.map((redemption, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">Bank Transfer</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(redemption.requested_at)}
                        </p>
                        {redemption.transaction_id && (
                          <p className="text-xs text-muted-foreground">
                            {redemption.transaction_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatCurrency(redemption.amount)}</p>
                        <Badge variant={getStatusBadge(redemption.status)} className="text-xs">
                          {redemption.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Full Transaction Ledger */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Complete Transaction Ledger</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLedger(!showLedger)}
              >
                {showLedger ? "Hide" : "Show"} All ({earningsData.allTransactions?.length || 0})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showLedger && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Date</th>
                      <th className="text-right py-2 px-2">Gross Amount</th>
                      <th className="text-right py-2 px-2">Commission (2%)</th>
                      <th className="text-right py-2 px-2">GST (18%)</th>
                      <th className="text-right py-2 px-2">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(earningsData.allTransactions || []).map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{formatDate(transaction.date)}</td>
                        <td className="text-right py-2 px-2 font-medium">
                          {formatCurrency(transaction.grossAmount || 0)}
                        </td>
                        <td className="text-right py-2 px-2 text-orange-600">
                          -{formatCurrency(transaction.commission || 0)}
                        </td>
                        <td className="text-right py-2 px-2 text-orange-600">
                          -{formatCurrency(transaction.gst || 0)}
                        </td>
                        <td className="text-right py-2 px-2 font-bold text-green-600">
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold bg-gray-50">
                      <td colSpan={2} className="py-3 px-2">TOTAL</td>
                      <td className="text-right py-3 px-2 text-orange-600">
                        -{formatCurrency(
                          (earningsData.allTransactions || []).reduce((sum, t) => sum + (t.commission || 0), 0)
                        )}
                      </td>
                      <td className="text-right py-3 px-2 text-orange-600">
                        -{formatCurrency(
                          (earningsData.allTransactions || []).reduce((sum, t) => sum + (t.gst || 0), 0)
                        )}
                      </td>
                      <td className="text-right py-3 px-2 text-green-600">
                        {formatCurrency(earningsData.totalEarnings)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-900"><strong>Current Summary:</strong></p>
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                <div>
                  <p className="text-blue-700">Available Now (80%)</p>
                  <p className="font-bold text-lg text-blue-600">{formatCurrency(earningsData.availableBalance)}</p>
                </div>
                <div>
                  <p className="text-orange-700">Pending Approval (20%)</p>
                  <p className="font-bold text-lg text-orange-600">{formatCurrency(earningsData.pendingBalance)}</p>
                </div>
                <div>
                  <p className="text-green-700">Total Net Earnings</p>
                  <p className="font-bold text-lg text-green-600">{formatCurrency(earningsData.totalEarnings)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Raise Dispute Modal */}
        <Dialog open={showDispute} onOpenChange={setShowDispute}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <SellerRaiseDispute
              type="earnings"
              context={{
                earnedAmount: earningsData.totalEarnings,
                availableAmount: earningsData.availableBalance,
                pendingAmount: earningsData.pendingBalance,
              }}
              onClose={() => setShowDispute(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Bank Details Dialog */}
        <Dialog open={showBankForm} onOpenChange={setShowBankForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bank Details</DialogTitle>
              <DialogDescription>
                Add or update your bank details for redemptions (from KYC)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="account_holder">Account Holder Name</Label>
                <Input
                  id="account_holder"
                  value={bankDetails.account_holder_name || ""}
                  onChange={(e) => setBankDetails(prev => ({ 
                    ...prev, account_holder_name: e.target.value 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={bankDetails.account_number || ""}
                  onChange={(e) => setBankDetails(prev => ({ 
                    ...prev, account_number: e.target.value 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={bankDetails.bank_name || ""}
                  onChange={(e) => setBankDetails(prev => ({ 
                    ...prev, bank_name: e.target.value 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="ifsc">IFSC Code</Label>
                <Input
                  id="ifsc"
                  value={bankDetails.ifsc_code || ""}
                  onChange={(e) => setBankDetails(prev => ({ 
                    ...prev, ifsc_code: e.target.value 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="account_type">Account Type</Label>
                <Select
                  value={bankDetails.account_type || "savings"}
                  onValueChange={(value: string) => 
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
      </>
    </div>
  );
}