import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
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
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  RefreshCw,
  Flag,
  Eye,
  Wallet,
  CreditCard,
  Lock,
  PauseCircle,
  Ban,
  HandCoins,
} from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { format } from "date-fns";
import { SellerRaiseDispute } from "@/components/SellerRaiseDispute";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSellerEarnings, type PayoutItem, type RefundDetail } from "@/hooks/useSellerEarnings";

export default function Earnings() {
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PayoutItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const { toast } = useToast();

  // Use the new earnings hook
  const { data: earningsData, isLoading, refetch, error } = useSellerEarnings(sellerId);

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
    } catch (err) {
      console.error("Error initializing earnings page:", err);
      toast({
        title: "Error loading data",
        description: "Failed to load earnings information",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    initializePage();
  }, [initializePage]);

  const handleRefresh = () => {
    refetch();
  };

  const handleViewDetails = (item: PayoutItem) => {
    setSelectedItem(item);
    setDetailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      delivered: { variant: "default", className: "bg-green-100 text-green-800" },
      pending: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
      processing: { variant: "secondary", className: "bg-blue-100 text-blue-800" },
      shipped: { variant: "secondary", className: "bg-purple-100 text-purple-800" },
      cancelled: { variant: "destructive", className: "bg-red-100 text-red-800" },
      returned: { variant: "destructive", className: "bg-orange-100 text-orange-800" },
    };
    const config = statusConfig[status] || { variant: "outline" as const, className: "" };
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getNetEarning = (item: PayoutItem) => {
    const gross = Number(item.item_subtotal || 0);
    const fees = Number(item.allocated_razorpay_fee || 0);
    return gross - fees;
  };

  const getProductName = (item: PayoutItem) => {
    const orderItemData = Array.isArray(item.order_items)
      ? item.order_items[0]
      : item.order_items;
    return (
      orderItemData?.seller_product_listings?.global_products?.product_name ||
      orderItemData?.seller_product_listings?.seller_title ||
      "Product"
    );
  };

  const getQuantity = (item: PayoutItem) => {
    const orderItemData = Array.isArray(item.order_items)
      ? item.order_items[0]
      : item.order_items;
    return orderItemData?.quantity || 1;
  };

  const getPricePerUnit = (item: PayoutItem) => {
    const orderItemData = Array.isArray(item.order_items)
      ? item.order_items[0]
      : item.order_items;
    return orderItemData?.price_per_unit || 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 mt-16">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load earnings data. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const stats = earningsData?.stats;
  const onHoldItems = earningsData?.onHold || [];
  const pendingItems = earningsData?.pending || [];
  const withheldItems = earningsData?.withheld || [];
  const refundItems = earningsData?.refunds || [];
  const approvedItems = earningsData?.approved || [];
  const paidItems = earningsData?.paid || [];

  // Helper to render payout item table
  const renderPayoutItemsTable = (
    items: PayoutItem[],
    showReturnWindow: boolean = false,
    emptyMessage: string = "No items"
  ) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <TableHead className="text-right">Net Earning</TableHead>
              {showReturnWindow && <TableHead>Return Window</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.payout_item_id}>
                <TableCell className="font-medium">
                  {format(new Date(item.order_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <p className="text-sm font-medium truncate">{getProductName(item)}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {getQuantity(item)} × {formatCurrency(getPricePerUnit(item))}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(item._metadata?.status || "pending")}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.item_subtotal)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  -{formatCurrency(item.allocated_razorpay_fee)}
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  {formatCurrency(getNetEarning(item))}
                </TableCell>
                {showReturnWindow && (
                  <TableCell>
                    {item._metadata?.is_return_window_closed ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Closed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <Clock className="h-3 w-3 mr-1" />
                        {item._metadata?.days_remaining || 0} days left
                      </Badge>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(item)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Render refunds table
  const renderRefundsTable = (refunds: RefundDetail[]) => {
    if (refunds.length === 0) {
      return (
        <div className="text-center py-12">
          <Ban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No pending refunds</p>
          <p className="text-sm text-muted-foreground mt-2">
            Refunds from cancelled or returned orders will appear here
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Refund Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.map((refund) => (
              <TableRow key={refund.refund_id}>
                <TableCell className="font-medium">
                  {format(new Date(refund.order_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium truncate max-w-xs">
                    {refund.product_name}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">
                    {refund.refund_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-red-600 font-medium">
                  -{formatCurrency(refund.item_subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-800">
            Total Pending Refunds: {formatCurrency(
              refunds.reduce((sum, r) => sum + r.item_subtotal, 0)
            )}
          </p>
          <p className="text-xs text-red-700 mt-1">
            These amounts will be deducted from your next payout
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50/30 via-white to-blue-50/30 relative">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 pattern-dots opacity-[0.03] pointer-events-none"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8 text-primary" />
              My Earnings
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your balance, payouts, and order settlements
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

        {/* Balance Overview - Updated per final_payout_system.md */}
        <div className="grid gap-6 md:grid-cols-4 mb-6">
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Total Paid Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(stats?.totalPayoutTillDate || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime earnings received
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Future Payout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(stats?.futurePayoutAmount || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pending + On-Hold + Withheld
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last Month Payout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(stats?.lastMonthPayout || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Previous month settlement
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Ban className="h-4 w-4" />
                Total Refunds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(stats?.totalRefundsDeducted || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Deducted till date
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Settlement Cycle:</strong> Payouts are processed on the 28th of each month. 
            Your most recent 3 delivered orders are held until the next cycle. 
            Orders with open return windows remain in "Withheld" until the window closes.
          </AlertDescription>
        </Alert>

        {/* Tabbed Content - Updated tabs per final_payout_system.md */}
        <Tabs defaultValue="on_hold" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto bg-yellow-100">
            <TabsTrigger value="on_hold" className="flex items-center gap-1 text-xs data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900">
              <Lock className="h-3 w-3" />
              On-Hold ({stats?.onHoldCount || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-1 text-xs data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900">
              <Clock className="h-3 w-3" />
              Pending ({stats?.pendingCount || 0})
            </TabsTrigger>
            <TabsTrigger value="withheld" className="flex items-center gap-1 text-xs data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900">
              <PauseCircle className="h-3 w-3" />
              Withheld ({stats?.withheldCount || 0})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="flex items-center gap-1 text-xs data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900">
              <Ban className="h-3 w-3" />
              Refunds ({stats?.refundsCount || 0})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-1 text-xs data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900">
              <CheckCircle className="h-3 w-3" />
              Approved ({stats?.approvedCount || 0})
            </TabsTrigger>
            <TabsTrigger value="paid" className="flex items-center gap-1 text-xs data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900">
              <HandCoins className="h-3 w-3" />
              Paid ({stats?.paidCount || 0})
            </TabsTrigger>
          </TabsList>

          {/* On-Hold Tab */}
          <TabsContent value="on_hold">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-purple-600" />
                  On-Hold Orders
                </CardTitle>
                <CardDescription>
                  Your most recent 3 valid fulfilled orders are held until next month's payout cycle.
                  This ensures any potential returns can be processed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderPayoutItemsTable(
                  onHoldItems,
                  false,
                  "No on-hold orders. Orders appear here after delivery and return window closure."
                )}
                {onHoldItems.length > 0 && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
                    <p className="text-sm font-medium text-purple-800">
                      Total On-Hold: {formatCurrency(
                        onHoldItems.reduce((sum, item) => sum + getNetEarning(item), 0)
                      )}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      These will be released in next month's payout cycle
                    </p>
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
                  Delivered orders with completed return windows, ready for payout on the 28th.
                  Net = Gross - Razorpay Fees - Refunds
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderPayoutItemsTable(
                  pendingItems,
                  false,
                  "No pending settlements. Orders move here after the return window closes and they're not in the recent 3."
                )}
                {pendingItems.length > 0 && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-sm font-medium text-orange-800">
                      Total Pending: {formatCurrency(
                        pendingItems.reduce((sum, item) => sum + getNetEarning(item), 0)
                      )}
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Expected settlement date: 28th of current/next month
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withheld Tab */}
          <TabsContent value="withheld">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PauseCircle className="h-5 w-5 text-yellow-600" />
                  Withheld Orders
                </CardTitle>
                <CardDescription>
                  Orders pending delivery or with open return windows. These will move to 
                  Pending/On-Hold once delivered and return window closes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderPayoutItemsTable(
                  withheldItems,
                  true,
                  "No withheld orders. Orders waiting for delivery or return window closure appear here."
                )}
                {withheldItems.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm font-medium text-yellow-800">
                      Total Withheld: {formatCurrency(
                        withheldItems.reduce((sum, item) => sum + getNetEarning(item), 0)
                      )}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Will be eligible for payout after delivery + return window completion
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5 text-red-600" />
                  Pending Refunds
                </CardTitle>
                <CardDescription>
                  Cancelled or returned orders with pending refund deductions. 
                  These amounts will be deducted from your next payout.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderRefundsTable(refundItems)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approved Tab */}
          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  Approved Payouts
                </CardTitle>
                <CardDescription>
                  Payouts approved by admin, awaiting payment processing.
                  Refund deductions have been applied.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderPayoutItemsTable(
                  approvedItems,
                  false,
                  "No approved payouts. Approved payouts awaiting payment will appear here."
                )}
                {approvedItems.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-800">
                      Total Approved: {formatCurrency(
                        approvedItems.reduce((sum, item) => sum + getNetEarning(item), 0)
                      )}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Payment will be processed shortly
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paid Tab */}
          <TabsContent value="paid">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandCoins className="h-5 w-5 text-green-600" />
                  Completed Payouts
                </CardTitle>
                <CardDescription>
                  Successfully paid out orders. Payment has been credited to your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderPayoutItemsTable(
                  paidItems,
                  false,
                  "No completed payouts yet. Paid items will appear here after settlement."
                )}
                {paidItems.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Gross (after fees):</span>
                        <span className="text-green-800">{formatCurrency(stats?.paidGrossAmount || 0)}</span>
                      </div>
                      {(stats?.paidRefundsDeducted || 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">Refunds Deducted:</span>
                          <span className="text-red-600">-{formatCurrency(stats?.paidRefundsDeducted || 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium border-t border-green-300 pt-1">
                        <span className="text-green-800">Net Paid:</span>
                        <span className="text-green-800">{formatCurrency(stats?.totalPayoutTillDate || 0)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Understanding Your Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-800">On-Hold</span>
                </div>
                <p className="text-sm text-purple-700">
                  Latest 3 valid fulfilled orders. Held until next month's cycle to handle potential returns.
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Pending</span>
                </div>
                <p className="text-sm text-orange-700">
                  Delivered orders with closed return windows, ready for this month's payout (28th).
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <PauseCircle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Withheld</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Orders awaiting delivery or with open return windows. Not yet eligible for payout.
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Ban className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-800">Refunds</span>
                </div>
                <p className="text-sm text-red-700">
                  Cancelled/returned orders. Amounts deducted from your next payout.
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Approved</span>
                </div>
                <p className="text-sm text-blue-700">
                  Payouts approved by admin, awaiting payment processing.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <HandCoins className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Paid</span>
                </div>
                <p className="text-sm text-green-700">
                  Completed payouts credited to your bank account.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Item Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Item Details</DialogTitle>
            <DialogDescription>
              Detailed breakdown of this order item
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-medium">{getProductName(selectedItem)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedItem.order_date), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">{getQuantity(selectedItem)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedItem._metadata?.status || "pending")}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Amount Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Amount</span>
                    <span>{formatCurrency(selectedItem.item_subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Razorpay Fee</span>
                    <span>-{formatCurrency(selectedItem.allocated_razorpay_fee)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>Net Earning</span>
                    <span className="text-green-600">
                      {formatCurrency(getNetEarning(selectedItem))}
                    </span>
                  </div>
                </div>
              </div>

              {selectedItem._metadata && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Return Window Info</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Return Days</p>
                      <p>
                        {selectedItem._metadata.is_non_returnable
                          ? "Non-returnable"
                          : `${selectedItem._metadata.return_days} days`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Days Since Order</p>
                      <p>{selectedItem._metadata.days_since_order} days</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Window Status</p>
                      <p>
                        {selectedItem._metadata.is_return_window_closed ? (
                          <Badge variant="outline" className="text-green-600">
                            Closed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            {selectedItem._metadata.days_remaining} days remaining
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Eligible for Payout</p>
                      <p>
                        {selectedItem._metadata.is_valid_fulfilled ? (
                          <Badge className="bg-green-100 text-green-800">Yes</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">Not Yet</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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


