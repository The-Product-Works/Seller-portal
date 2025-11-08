import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface SalesData {
  date: string;
  sales: number;
  profit: number;
}

interface OrderRecord {
  created_at: string;
  total_amount: number;
}

interface SellerGraphProps {
  sellerId: string;
}

export function SellerGraph({ sellerId }: SellerGraphProps) {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (sellerId) {
      loadSalesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, timeRange]);

  const loadSalesData = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const daysBack = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .eq("seller_id", sellerId)
        .gte("created_at", startDate.toISOString())
        .order("created_at");

      if (error) throw error;

      // Group by date
      const groupedData: Record<string, number> = {};
      (orders || []).forEach((order: OrderRecord) => {
        const date = new Date(order.created_at).toLocaleDateString();
        groupedData[date] = (groupedData[date] || 0) + (order.total_amount || 0);
      });

      // Calculate profit (assume 20% profit margin for demo)
      const formattedData = Object.entries(groupedData).map(([date, sales]) => ({
        date,
        sales: Math.round(sales),
        profit: Math.round(sales * 0.2)
      }));

      setSalesData(formattedData.slice(-30)); // Show last 30 data points max
    } catch (error) {
      console.error('Error loading sales data:', error);
      setSalesData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Sales and Profit Overview</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 rounded ${
              timeRange === 'week' ? 'bg-primary text-white' : 'bg-gray-100'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 rounded ${
              timeRange === 'month' ? 'bg-primary text-white' : 'bg-gray-100'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-3 py-1 rounded ${
              timeRange === 'year' ? 'bg-primary text-white' : 'bg-gray-100'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          Loading...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#8884d8"
              name="Total Sales"
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#82ca9d"
              name="Total Profit"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}