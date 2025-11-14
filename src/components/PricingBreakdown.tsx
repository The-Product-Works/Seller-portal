import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PricingBreakdownProps {
  sellingPrice: number;
  showDialog?: boolean;
  children?: React.ReactNode;
}

export const PricingBreakdown = ({ sellingPrice, showDialog = true, children }: PricingBreakdownProps) => {
  // Commission structure
  const COMMISSION_PERCENT = 2; // 2% commission
  const GST_PERCENT = 18; // 18% GST on commission

  const commission = (sellingPrice * COMMISSION_PERCENT) / 100;
  const gstOnCommission = (commission * GST_PERCENT) / 100;
  const totalDeduction = commission + gstOnCommission;
  const sellerReceives = sellingPrice - totalDeduction;

  const content = (
    <Card className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          Earnings Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-white border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            When you receive an order, payment, refund, or cancellation, platform charges apply automatically.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-white rounded border">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Selling Price</span>
              <span className="text-xs text-gray-500">Amount customer pays</span>
            </div>
            <span className="font-semibold text-gray-900">₹{sellingPrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-red-900">Razorpay Commission (2%)</span>
              <span className="text-xs text-red-700">Charges on every transaction</span>
            </div>
            <span className="font-semibold text-red-600">-₹{commission.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-orange-50 rounded border border-orange-200">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-orange-900">GST on Commission (18%)</span>
              <span className="text-xs text-orange-700">18% GST on the 2% commission</span>
            </div>
            <span className="font-semibold text-orange-600">-₹{gstOnCommission.toFixed(2)}</span>
          </div>

          <div className="border-t-2 border-gray-200 pt-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-green-900">You Will Receive</span>
                <span className="text-xs text-green-700">
                  {((sellerReceives / sellingPrice) * 100).toFixed(1)}% of selling price
                </span>
              </div>
              <span className="font-bold text-green-600 text-lg">₹{sellerReceives.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-xs text-gray-600 space-y-1 mt-4 p-3 bg-gray-50 rounded">
            <p>
              <strong>Formula:</strong> ₹{sellerReceives.toFixed(2)} = ₹{sellingPrice.toFixed(2)} - ₹{commission.toFixed(2)} - ₹{gstOnCommission.toFixed(2)}
            </p>
            <p className="mt-2">
              This applies to all transactions including orders, refunds, and cancellations.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (showDialog) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          {children || (
            <div className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 underline">
              View breakdown
            </div>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pricing Breakdown</DialogTitle>
            <DialogDescription>
              Understand exactly how much you earn from each transaction
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
};

interface PricingBreakdownInlineProps {
  price: number;
  compact?: boolean;
}

export const PricingBreakdownInline = ({ price, compact = false }: PricingBreakdownInlineProps) => {
  const COMMISSION_PERCENT = 2;
  const GST_PERCENT = 18;

  const commission = (price * COMMISSION_PERCENT) / 100;
  const gstOnCommission = (commission * GST_PERCENT) / 100;
  const totalDeduction = commission + gstOnCommission;
  const sellerReceives = price - totalDeduction;

  if (compact) {
    return (
      <div className="text-xs space-y-1">
        <div className="flex justify-between text-gray-600">
          <span>Commission (2%):</span>
          <span className="text-red-600">-₹{commission.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>GST on Commission (18%):</span>
          <span className="text-orange-600">-₹{gstOnCommission.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold text-green-600 pt-1 border-t">
          <span>You Receive:</span>
          <span>₹{sellerReceives.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-600">Price</p>
          <p className="font-semibold">₹{price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-600">Commission (2%)</p>
          <p className="font-semibold text-red-600">-₹{commission.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-600">GST (18% on 2%)</p>
          <p className="font-semibold text-orange-600">-₹{gstOnCommission.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-600">You Receive</p>
          <p className="font-semibold text-green-600">₹{sellerReceives.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};
