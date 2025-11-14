import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, TrendingDown, Calculator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CommissionWarningProps {
  mrp?: number;
  onMrpChange?: (mrp: number) => void;
  showInlineCalculator?: boolean;
  variant?: 'warning' | 'info' | 'compact';
}

export function CommissionWarning({
  mrp = 100,
  onMrpChange,
  showInlineCalculator = true,
  variant = 'warning',
}: CommissionWarningProps) {
  const [customMrp, setCustomMrp] = useState<number>(mrp);

  // Commission calculation formula
  const commission = customMrp * 0.02; // 2%
  const gst = commission * 0.18; // 18% of commission
  const totalDeduction = commission + gst;
  const sellerReceives = customMrp - totalDeduction;
  const percentageReceived = ((sellerReceives / customMrp) * 100).toFixed(2);

  const handleMrpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setCustomMrp(value);
    onMrpChange?.(value);
  };

  if (variant === 'compact') {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          <strong>Commission: 2% + 18% GST</strong>
          <br />
          On ₹{customMrp.toFixed(2)}: You get ₹{sellerReceives.toFixed(2)} ({percentageReceived}%)
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Warning Card */}
      <Alert className={`${
        variant === 'info' 
          ? 'border-blue-200 bg-blue-50' 
          : 'border-amber-200 bg-amber-50'
      }`}>
        <AlertTriangle className={`h-5 w-5 ${
          variant === 'info' ? 'text-blue-600' : 'text-amber-600'
        }`} />
        <AlertTitle className={variant === 'info' ? 'text-blue-900' : 'text-amber-900'}>
          {variant === 'info' ? '📋 Commission Structure' : '⚠️ Important Commission Details'}
        </AlertTitle>
        <AlertDescription className={variant === 'info' ? 'text-blue-800' : 'text-amber-800'}>
          <div className="mt-2 space-y-2 text-sm">
            <p>
              <strong>Every time a customer purchases:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Our platform takes <strong>2% commission</strong> for payment processing</li>
              <li>Plus <strong>18% GST</strong> on that 2% commission</li>
              <li>This means you receive <strong>97.64%</strong> of the MRP</li>
            </ul>
            <p className="mt-3">
              This applies to <strong>every transaction</strong> - order placement, cancellations, and refunds.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Interactive Calculator */}
      {showInlineCalculator && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Real-time Commission Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MRP Input */}
              <div>
                <Label htmlFor="mrp-input" className="text-sm font-medium">
                  Enter Product MRP (₹)
                </Label>
                <div className="mt-2 relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="mrp-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={customMrp}
                    onChange={handleMrpChange}
                    placeholder="Enter MRP"
                    className="pl-8 bg-white border-2 border-blue-300 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Seller Receives */}
              <div>
                <Label className="text-sm font-medium text-green-700">
                  💰 Seller Receives (Per Sale)
                </Label>
                <div className="mt-2 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">
                    ₹{sellerReceives.toFixed(2)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {percentageReceived}% of MRP
                  </p>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Customer pays:</span>
                <Badge variant="outline" className="bg-gray-50">
                  ₹{customMrp.toFixed(2)}
                </Badge>
              </div>
              <div className="border-t" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-amber-700 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" /> Commission (2%):
                </span>
                <span className="font-medium text-red-600">
                  -₹{commission.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-amber-700 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" /> GST (18% on commission):
                </span>
                <span className="font-medium text-red-600">
                  -₹{gst.toFixed(2)}
                </span>
              </div>
              <div className="border-t-2 border-blue-300 flex justify-between items-center text-sm font-bold">
                <span className="text-green-700">You receive:</span>
                <span className="text-green-700 text-lg">
                  ₹{sellerReceives.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-3">
              <p className="text-sm text-indigo-900">
                <strong>💡 Pro Tip:</strong> If you want to earn ₹100 per unit, set your MRP to approximately{' '}
                <strong className="text-indigo-700">₹{(100 / 0.9764).toFixed(2)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Details */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">When Commissions Are Applied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded border border-blue-200">
              <Badge className="mt-1 bg-blue-600">1</Badge>
              <div>
                <p className="font-medium text-sm text-blue-900">Order Placed ✓</p>
                <p className="text-xs text-blue-800 mt-1">
                  Commission deducted from order amount immediately
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded border border-orange-200">
              <Badge className="mt-1 bg-orange-600">2</Badge>
              <div>
                <p className="font-medium text-sm text-orange-900">Order Cancelled ✓</p>
                <p className="text-xs text-orange-800 mt-1">
                  Commission still applies to the transaction amount
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded border border-red-200">
              <Badge className="mt-1 bg-red-600">3</Badge>
              <div>
                <p className="font-medium text-sm text-red-900">Order Refunded ✓</p>
                <p className="text-xs text-red-800 mt-1">
                  Refund amount has commission deducted
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MRP Adjustment Guide */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-base text-green-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            MRP Adjustment Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-green-900">
              To account for the 2.36% effective deduction (2% + 18% of 2%), adjust your MRP using this formula:
            </p>
            <div className="bg-white p-3 rounded border-2 border-green-300 font-mono text-center">
              <p className="text-green-700 font-bold">
                Desired Earnings ÷ 0.9764 = Required MRP
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-white rounded border">
                <p className="text-gray-600">Want to earn:</p>
                <p className="font-bold text-green-700">₹100</p>
                <p className="text-gray-600 mt-1">Set MRP to:</p>
                <p className="font-bold text-blue-700">₹102.42</p>
              </div>
              <div className="p-2 bg-white rounded border">
                <p className="text-gray-600">Want to earn:</p>
                <p className="font-bold text-green-700">₹500</p>
                <p className="text-gray-600 mt-1">Set MRP to:</p>
                <p className="font-bold text-blue-700">₹512.10</p>
              </div>
              <div className="p-2 bg-white rounded border">
                <p className="text-gray-600">Want to earn:</p>
                <p className="font-bold text-green-700">₹1000</p>
                <p className="text-gray-600 mt-1">Set MRP to:</p>
                <p className="font-bold text-blue-700">₹1024.19</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Version for Product Details */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50">
            📊 View Detailed Commission Breakdown
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commission & Fee Structure</DialogTitle>
            <DialogDescription>
              Complete breakdown of how commissions are calculated on every transaction
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">Platform Commission</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">2%</p>
                <p className="text-xs text-blue-600 mt-2">On order value</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-600 font-medium">GST on Commission</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">18%</p>
                <p className="text-xs text-orange-600 mt-2">Of 2% commission</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 font-medium">You Receive</p>
                <p className="text-2xl font-bold text-green-700 mt-1">97.64%</p>
                <p className="text-xs text-green-600 mt-2">Of order value</p>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                This applies to all transactions including cancellations and refunds. Always adjust your MRP accordingly
                to ensure profitability.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
