import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Package,
  RefreshCw,
  Flag,
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  History,
} from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/database.types";
import { SellerRaiseDispute } from "@/components/SellerRaiseDispute";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Type aliases
type SellerBalance = Database['public']['Tables']['seller_balances']['Row'];
type SellerTransaction = Database['public']['Tables']['seller_balance_transactions']['Row'];
type PayoutItem = Database['public']['Tables']['seller_payout_items']['Row'];

interface TransactionWithDetails extends SellerTransaction {
  orders?: {
    order_number: string;
  };
  order_items?: {
    quantity: number;
    price_per_unit: number;
    seller_product_listings?: {
      seller_title: string;
      global_products?: {
        product_name: string;
      };
    };
  };
}

interface PayoutItemWithDetails extends PayoutItem {
  orders?: {
    order_number: string;
  };
  order_items?: {
    quantity: number;
    price_per_unit: number;
    seller_product_listings?: {
      seller_title: string;
      global_products?: {
        product_name: string;
      };
    };
  };
  payments?: {
    razorpay_payment_id: string | null;
    amount: number;
  };
}

export default function Earnings() {
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [payoutItems, setPayoutItems] = useState<PayoutItemWithDetails[]>([]);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const { toast } = useToast();

  const initializePage = useCallback(async () => {
    try {
      const id = await getAuthenticatedSellerId();
      if (!id) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view earnings",
          variant: "destructive",
        });
        return;
      }
      setSellerId(id);
      await Promise.all([
        fetchBalance(id),
        fetchTransactions(id),
        fetchPayoutItems(id),
      ]);
    } catch (error) {
      console.error("Error initializing earnings page:", error);
      toast({
        title: "Error loading data",
        description: "Failed to load earnings information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    initializePage();
  }, [initializePage]);

  const fetchBalance = async (id: string) => {
    console.log('📊 Fetching balance for seller:', id);
    const { data, error } = await supabase
      .from("seller_balances")
      .select("*")
      .eq("seller_id", id)
      .single();

    if (error) {
      console.error("Error fetching balance:", error);
      console.log("⚠️ No balance record found - this is normal for new sellers");
      // Balance might not exist yet - that's okay
      return;
    }

    console.log('✅ Balance data:', data);
    setBalance(data);
  };

  const fetchTransactions = async (id: string) => {
    console.log('💰 Fetching transactions for seller:', id);
    const { data, error } = await supabase
      .from("seller_balance_transactions")
      .select("*")
      .eq("seller_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("❌ Error fetching transactions:", error);
      return;
    }

    console.log('✅ Transactions found:', data?.length || 0, data);
    setTransactions(data as unknown as TransactionWithDetails[]);
  };

  const fetchPayoutItems = async (id: string) => {
    console.log('🎯 Fetching payout items for seller:', id);
    // Get seller's order items first
    const { data: orderItems, error: orderError } = await supabase
      .from("order_items")
      .select("order_item_id")
      .eq("seller_id", id);

    if (orderError) {
      console.error("❌ Error fetching order items:", orderError);
      return;
    }

    if (!orderItems?.length) {
      console.log("⚠️ No order items found for this seller");
      setPayoutItems([]);
      return;
    }

    console.log('📦 Found order items:', orderItems.length);
    const orderItemIds = orderItems.map(item => item.order_item_id);

    // First get basic payout items (to ensure table works)
    const { data: payoutData, error: payoutError } = await supabase
      .from("seller_payout_items")
      .select(`
        *,
        payments(
          amount,
          razorpay_fee,
          razorpay_tax
        )
      `)
      .in("order_item_id", orderItemIds)
      .order("created_at", { ascending: false })
      .limit(100);

    if (payoutError) {
      console.error("❌ Error fetching payout items:", payoutError);
      return;
    }

    if (!payoutData?.length) {
      setPayoutItems([]);
      return;
    }

    // Now enrich with product and order data
    const enrichedData = await Promise.all(
      payoutData.map(async (item) => {
        console.log('🔍 Enriching item with order_id:', item.order_id);
        
        // Get order details - just order_id since that's what we have
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("order_id")
          .eq("order_id", item.order_id)
          .single();

        if (orderError) {
          console.error('❌ Order fetch error for order_id', item.order_id, ':', orderError);
        } else {
          console.log('✅ Order data fetched:', orderData);
        }

        // Get order item details
        const { data: orderItemData, error: orderItemError } = await supabase
          .from("order_items")
          .select(`
            quantity,
            price_per_unit,
            seller_product_listings(
              seller_title,
              global_products(product_name)
            )
          `)
          .eq("order_item_id", item.order_item_id)
          .single();

        if (orderItemError) {
          console.error('❌ Order item fetch error for order_item_id', item.order_item_id, ':', orderItemError);
        } else {
          console.log('✅ Order item data fetched:', orderItemData);
        }

        const result = {
          ...item,
          orders: orderData ? { order_number: orderData.order_id } : null,
          order_items: orderItemData
        };
        
        console.log('📦 Final enriched item:', { 
          order_id: item.order_id, 
          has_order_data: !!orderData,
          order_number: orderData?.order_id 
        });
        
        return result;
      })
    );

    console.log('✅ Payout items with product data:', enrichedData.length);
    setPayoutItems(enrichedData as unknown as PayoutItemWithDetails[]);
  };

  const handleRefresh = () => {
    if (sellerId) {
      setLoading(true);
      initializePage();
    }
  };

  const calculateNetEarning = (item: PayoutItemWithDetails) => {
    return item.item_subtotal - item.allocated_razorpay_fee - item.allocated_razorpay_tax;
  };

  // Recalculate fees proportionally for display (without changing database)
  const recalculateProportionalFees = (item: PayoutItemWithDetails) => {
    // If we have payment data, recalculate fees proportionally
    if (item.payments) {
      const totalOrderAmount = item.payments.amount || 0;
      const totalRazorpayFee = item.payments.razorpay_fee || 0;
      const totalRazorpayTax = item.payments.razorpay_tax || 0;

      if (totalOrderAmount > 0) {
        const proportion = item.item_subtotal / totalOrderAmount;
        const correctFee = totalRazorpayFee * proportion;
        const correctTax = totalRazorpayTax * proportion;

        return {
          allocated_razorpay_fee: correctFee,
          allocated_razorpay_tax: correctTax,
          isRecalculated: true
        };
      }
    }

    // Fallback to stored values if no payment data
    return {
      allocated_razorpay_fee: item.allocated_razorpay_fee,
      allocated_razorpay_tax: item.allocated_razorpay_tax,
      isRecalculated: false
    };
  };

  const getCorrectedFees = (item: PayoutItemWithDetails) => {
    return recalculateProportionalFees(item);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "payout":
        return <ArrowDownRight className="h-4 w-4 text-blue-600" />;
      case "refund":
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default:
        return <History className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "order":
        return "text-green-600";
      case "payout":
        return "text-blue-600";
      case "refund":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getPendingItems = () => {
    return payoutItems.filter(item => !item.is_settled && !item.is_refunded);
  };

  const getSettledItems = () => {
    return payoutItems.filter(item => item.is_settled && !item.is_refunded);
  };

  const getRefundedItems = () => {
    return payoutItems.filter(item => item.is_refunded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const pendingItems = getPendingItems();
  const settledItems = getSettledItems();
  const refundedItems = getRefundedItems();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8 text-primary" />
              My Earnings
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your balance, transactions, and payout history
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setIsDisputeOpen(true)} variant="outline" size="sm">
              <Flag className="h-4 w-4 mr-2" />
              Raise Dispute
            </Button>
          </div>
        </div>

        {/* Balance Overview */}
        <div className="grid gap-6 md:grid-cols-4 mb-6">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                ₹{balance?.available_balance?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ready for withdrawal
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                ₹{balance?.pending_balance?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting settlement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₹{balance?.total_earned?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Total Paid Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₹{balance?.total_paid_out?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {balance?.last_payout_date
                  ? `Last: ${format(new Date(balance.last_payout_date), "MMM d, yyyy")}`
                  : "No payouts yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Alert */}
        {balance && (balance.pending_balance || 0) > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Settlement Schedule:</strong> Your first 3 delivered orders are held until
              the 28th of the next month. From the 4th order onwards, earnings are available for
              payout on the 28th of the current month.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabbed Content */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto bg-yellow-100">
            <TabsTrigger value="transactions" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900">
              <History className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900">
              <Clock className="h-4 w-4" />
              Pending ({pendingItems.length})
            </TabsTrigger>
            <TabsTrigger value="settled" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900">
              <CheckCircle className="h-4 w-4" />
              Settled ({settledItems.length})
            </TabsTrigger>
            <TabsTrigger value="refunded" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900">
              <AlertCircle className="h-4 w-4" />
              Refunded ({refundedItems.length})
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All balance movements in your account</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No transactions yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Transactions will appear here when orders are delivered
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((txn) => (
                          <TableRow key={txn.transaction_id}>
                            <TableCell className="font-medium">
                              {format(new Date(txn.created_at || new Date()), "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTransactionIcon(txn.type)}
                                <Badge variant="outline" className="capitalize">
                                  {txn.type}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md">
                                <p className="text-sm">{txn.description}</p>
                                {txn.orders && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Order: #{txn.orders.order_number}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${getTransactionColor(txn.type)}`}>
                              {txn.amount >= 0 ? "+" : ""}₹{txn.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              ₹{txn.balance_after.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Pending Settlements
                </CardTitle>
                <CardDescription>
                  Orders awaiting settlement on the 28th of the month
                  {balance?.pending_balance && balance.pending_balance > 0 && (
                    <span className="ml-2 font-semibold text-orange-600">
                      (₹{balance.pending_balance.toFixed(2)} pending)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    {balance?.pending_balance && balance.pending_balance > 0 ? (
                      <div>
                        <p className="text-lg font-semibold text-orange-600 mb-2">
                          ₹{balance.pending_balance.toFixed(2)} Pending
                        </p>
                        <p className="text-muted-foreground">
                          Your pending earnings are being processed
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Settlement date: 28th of the month
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No pending settlements</p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right">Fees</TableHead>
                          <TableHead className="text-right">Net Earning</TableHead>
                          <TableHead>Settlement Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingItems.map((item) => (
                          <TableRow key={item.payout_item_id}>
                            <TableCell className="font-medium">
                              {format(new Date(item.order_date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {item.orders?.order_number ? `#${item.orders.order_number}` : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="text-sm font-medium truncate">
                                  {item.order_items?.seller_product_listings?.global_products?.product_name ||
                                    item.order_items?.seller_product_listings?.seller_title ||
                                    "Product Item"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Quantity: {item.order_items?.quantity || 0} × ₹{(item.order_items?.price_per_unit || 0).toFixed(2)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{item.item_subtotal.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {(() => {
                                const correctedFees = getCorrectedFees(item);
                                const totalFees = correctedFees.allocated_razorpay_fee + correctedFees.allocated_razorpay_tax;
                                return (
                                  <div className="flex items-center justify-end gap-1">
                                    <span>-₹{totalFees.toFixed(2)}</span>
                                    {correctedFees.isRecalculated && (
                                      <span className="text-xs text-blue-600 font-medium" title="Fee recalculated proportionally">
                                        *
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {(() => {
                                const correctedFees = getCorrectedFees(item);
                                const netEarning = item.item_subtotal - correctedFees.allocated_razorpay_fee - correctedFees.allocated_razorpay_tax;
                                return `₹${netEarning.toFixed(2)}`;
                              })()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(item.settlement_hold_until), "MMM d, yyyy")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
                      <p className="text-sm font-medium text-orange-800">
                        Total Pending: ₹
                        {pendingItems
                          .reduce((sum, item) => {
                            const correctedFees = getCorrectedFees(item);
                            return sum + (item.item_subtotal - correctedFees.allocated_razorpay_fee - correctedFees.allocated_razorpay_tax);
                          }, 0)
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settled Tab */}
          <TabsContent value="settled">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Settled Items
                </CardTitle>
                <CardDescription>Successfully settled and paid out orders</CardDescription>
              </CardHeader>
              <CardContent>
                {settledItems.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No settled items yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right">Fees</TableHead>
                          <TableHead className="text-right">Net Earning</TableHead>
                          <TableHead>Settled Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settledItems.map((item) => (
                          <TableRow key={item.payout_item_id}>
                            <TableCell className="font-medium">
                              {format(new Date(item.order_date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {item.orders?.order_number ? `#${item.orders.order_number}` : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="text-sm font-medium truncate">
                                  {item.order_items?.seller_product_listings?.global_products?.product_name ||
                                    item.order_items?.seller_product_listings?.seller_title ||
                                    "Product Item"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Quantity: {item.order_items?.quantity || 0}  {(item.order_items?.price_per_unit || 0).toFixed(2)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{item.item_subtotal.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {(() => {
                                const correctedFees = getCorrectedFees(item);
                                const totalFees = correctedFees.allocated_razorpay_fee + correctedFees.allocated_razorpay_tax;
                                return (
                                  <div className="flex items-center justify-end gap-1">
                                    <span>-₹{totalFees.toFixed(2)}</span>
                                    {correctedFees.isRecalculated && (
                                      <span className="text-xs text-blue-600 font-medium" title="Fee recalculated proportionally">
                                        *
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {(() => {
                                const correctedFees = getCorrectedFees(item);
                                const netEarning = item.item_subtotal - correctedFees.allocated_razorpay_fee - correctedFees.allocated_razorpay_tax;
                                return `₹${netEarning.toFixed(2)}`;
                              })()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Settled
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm font-medium text-green-800">
                        Total Settled: ₹
                        {settledItems
                          .reduce((sum, item) => {
                            const correctedFees = getCorrectedFees(item);
                            return sum + (item.item_subtotal - correctedFees.allocated_razorpay_fee - correctedFees.allocated_razorpay_tax);
                          }, 0)
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Refunded Tab */}
          <TabsContent value="refunded">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Refunded Items
                </CardTitle>
                <CardDescription>Orders that were refunded to customers</CardDescription>
              </CardHeader>
              <CardContent>
                {refundedItems.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No refunded items</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Original Amount</TableHead>
                          <TableHead className="text-right">Refund Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {refundedItems.map((item) => (
                          <TableRow key={item.payout_item_id}>
                            <TableCell className="font-medium">
                              {format(new Date(item.order_date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {item.orders?.order_number ? `#${item.orders.order_number}` : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="text-sm font-medium truncate">
                                  {item.order_items?.seller_product_listings?.global_products?.product_name ||
                                    item.order_items?.seller_product_listings?.seller_title ||
                                    "Product Item"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Quantity: {item.order_items?.quantity || 0}  {(item.order_items?.price_per_unit || 0).toFixed(2)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{item.item_subtotal.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              -₹{(item.refund_amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Refunded
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm font-medium text-red-800">
                        Total Refunded: ₹
                        {refundedItems
                          .reduce((sum, item) => sum + (item.refund_amount || 0), 0)
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Fee Recalculation Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Fees marked with <span className="text-blue-600 font-medium">*</span> have been recalculated proportionally 
            based on each item's contribution to the total order amount. This ensures fair fee distribution across all sellers in multi-seller orders.
          </p>
        </div>
      </div>

      {/* Dispute Dialog */}
      {sellerId && (
        <SellerRaiseDispute
          isOpen={isDisputeOpen}
          onClose={() => setIsDisputeOpen(false)}
          sellerId={sellerId}
          context={{
            type: "earnings",
          }}
        />
      )}
    </div>
  );
}


