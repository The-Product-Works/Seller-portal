/**
 * Email Service Utilities
 * Common utility functions for email operations
 */

/**
 * Extract first name from full name
 */
export function getFirstName(fullName: string): string {
  if (!fullName || fullName.trim().length === 0) {
    return 'there';
  }
  return fullName.split(' ')[0];
}

/**
 * Generate email-safe order number display
 */
export function formatOrderNumber(orderNumber: string): string {
  if (!orderNumber) return 'N/A';
  return orderNumber.toUpperCase();
}

/**
 * Generate tracking URL if tracking number exists
 */
export function generateTrackingUrl(trackingNumber: string, carrier?: string): string {
  if (!trackingNumber) return '';
  
  // Common carrier tracking URLs
  const carrierUrls: Record<string, string> = {
    'bluedart': `https://www.bluedart.com/tracking/${trackingNumber}`,
    'dhl': `https://www.dhl.com/in-en/home/tracking.html?tracking-id=${trackingNumber}`,
    'fedex': `https://www.fedex.com/fedextrack/?tracknumber=${trackingNumber}`,
    'aramex': `https://www.aramex.com/track/results?ShipmentNumber=${trackingNumber}`,
    'dtdc': `https://www.dtdc.in/tracking.asp?strTrackNo=${trackingNumber}`,
    'ecom': `https://ecomexpress.in/track_me/${trackingNumber}`,
    'default': `https://www.google.com/search?q=track+package+${trackingNumber}`,
  };

  const lowerCarrier = carrier?.toLowerCase() || 'default';
  return carrierUrls[lowerCarrier] || carrierUrls.default;
}

/**
 * Generate seller dashboard URL with specific page
 */
export function generateSellerDashboardUrl(page?: string, id?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sellerportal.com';
  let path = '/seller/dashboard';
  
  if (page) {
    path += `/${page}`;
    if (id) {
      path += `/${id}`;
    }
  }
  
  return `${baseUrl}${path}`;
}

/**
 * Generate buyer order URL
 */
export function generateBuyerOrderUrl(orderId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BUYER_APP_URL || 'https://buyerportal.com';
  return `${baseUrl}/orders/${orderId}`;
}

/**
 * Generate admin dashboard URL
 */
export function generateAdminDashboardUrl(page?: string, id?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.sellerportal.com';
  let path = '/admin';
  
  if (page) {
    path += `/${page}`;
    if (id) {
      path += `/${id}`;
    }
  }
  
  return `${baseUrl}${path}`;
}

/**
 * Generate support URL with pre-filled details
 */
export function generateSupportUrl(params?: {
  subject?: string;
  orderNumber?: string;
  userId?: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPPORT_URL || 'https://support.sellerportal.com';
  
  if (!params) {
    return baseUrl;
  }

  const searchParams = new URLSearchParams();
  
  if (params.subject) {
    searchParams.set('subject', params.subject);
  }
  
  if (params.orderNumber) {
    searchParams.set('order', params.orderNumber);
  }
  
  if (params.userId) {
    searchParams.set('user', params.userId);
  }

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Sanitize and validate email address
 */
export function sanitizeEmail(email: string): { email: string; isValid: boolean } {
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return {
    email: sanitized,
    isValid: emailRegex.test(sanitized),
  };
}

/**
 * Generate review URL for a product/order
 */
export function generateReviewUrl(orderId: string, productId?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BUYER_APP_URL || 'https://buyerportal.com';
  const path = productId 
    ? `/orders/${orderId}/review/${productId}`
    : `/orders/${orderId}/review`;
  
  return `${baseUrl}${path}`;
}

/**
 * Calculate estimated delivery date
 */
export function calculateEstimatedDelivery(orderDate: Date | string, deliveryDays: number = 7): string {
  const order = orderDate instanceof Date ? orderDate : new Date(orderDate);
  const estimated = new Date(order);
  estimated.setDate(estimated.getDate() + deliveryDays);
  
  return estimated.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get time-appropriate greeting
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

/**
 * Truncate text for email display
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Convert rating to star display
 */
export function getRatingStars(rating: number): string {
  const fullStars = '★'.repeat(Math.floor(rating));
  const halfStar = rating % 1 >= 0.5 ? '½' : '';
  const emptyStars = '☆'.repeat(5 - Math.ceil(rating));
  
  return fullStars + halfStar + emptyStars;
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currency: string = '₹'): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `${currency}0.00`;
  }
  
  return `${currency}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Get order status color for email styling
 */
export function getOrderStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'pending': '#f59e0b',
    'confirmed': '#3b82f6',
    'processing': '#8b5cf6',
    'shipped': '#06b6d4',
    'delivered': '#10b981',
    'cancelled': '#ef4444',
    'returned': '#f97316',
    'refunded': '#84cc16',
  };
  
  return statusColors[status.toLowerCase()] || '#6b7280';
}

/**
 * Validate and format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Indian phone numbers
  if (cleaned.length === 10) {
    return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
  }
  
  return phone; // Return original if not standard format
}

/**
 * Generate unique email tracking ID
 */
export function generateTrackingId(): string {
  return `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}