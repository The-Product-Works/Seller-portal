-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own data
CREATE POLICY "Users can view own data"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Policy: Sellers can view buyer data for their orders
CREATE POLICY "Sellers can view buyers from their orders"
ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.orders o
    JOIN public.sellers s ON s.id = o.seller_id
    WHERE o.buyer_id = users.id
    AND s.user_id = auth.uid()
  )
);

-- Policy: Allow service role to manage all users
CREATE POLICY "Service role can manage all users"
ON public.users
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add similar policy for user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Sellers can view buyer profiles from their orders
CREATE POLICY "Sellers can view buyer profiles from their orders"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.orders o
    JOIN public.sellers s ON s.id = o.seller_id
    WHERE o.buyer_id = user_profiles.user_id
    AND s.user_id = auth.uid()
  )
);

-- Policy: Service role can manage all profiles
CREATE POLICY "Service role can manage all profiles"
ON public.user_profiles
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON POLICY "Sellers can view buyers from their orders" ON public.users IS 
'Allows sellers to view basic user information (email, phone) of buyers who have placed orders with them';

COMMENT ON POLICY "Sellers can view buyer profiles from their orders" ON public.user_profiles IS 
'Allows sellers to view profile information (name, etc) of buyers who have placed orders with them';
