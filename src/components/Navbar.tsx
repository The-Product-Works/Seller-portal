import { NavLink, useNavigate } from "react-router-dom";
import { 
  Home, BarChart2, Boxes, ClipboardList, 
  Megaphone, Wallet, UserCircle, LogOut, 
  Heart, Bell, Shield, AlertCircle, Menu, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface NavItem {
  title: string;
  path: string;
  icon: React.ElementType;
  badge?: number;
}

export function Navbar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sellerNavItems: NavItem[] = [
    { title: "Home", path: "/landing", icon: Home },
    { title: "Dashboard", path: "/dashboard", icon: BarChart2 },
    { title: "Inventory", path: "/inventory", icon: Boxes },
    { title: "Orders", path: "/orders", icon: ClipboardList },
    { title: "Customer Feedback", path: "/customer-feedback", icon: Megaphone },
    { title: "Earnings", path: "/earnings", icon: Wallet },
  ];

  const adminNavItems: NavItem[] = [
    { title: "Dashboard", path: "/admin", icon: BarChart2 },
    { title: "Sellers", path: "/admin/sellers", icon: UserCircle },
    { title: "Verifications", path: "/admin/verifications", icon: Shield, badge: pendingVerifications },
  ];

  useEffect(() => {
    loadProfile();
    checkAdminStatus();
    checkKYCStatus();
    if (isAdmin) {
      checkPendingVerifications();
    }
    checkNotifications();
  }, [isAdmin]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const nav = document.querySelector('nav');
      if (nav && !nav.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("sellers")
          .select("id,name,business_name")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (data) {
          // Use seller's name, business name, or extract from email
          const sellerName = data.business_name || data.name || user.email?.split('@')[0] || "Seller";
          setUsername(sellerName);
          // try to load profile photo from seller_documents
          const { data: docs } = await supabase
            .from('seller_documents')
            .select('storage_path')
            .eq('seller_id', data.id)
            .eq('doc_type', 'profile')
            .limit(1);
          if (docs && docs.length > 0) setProfilePhoto(docs[0].storage_path);
        } else {
          // Fallback to email username if no seller data
          setUsername(user.email?.split('@')[0] || "Seller");
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Fallback to user email username on error
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUsername(user?.email?.split('@')[0] || "Seller");
      } catch {
        setUsername("Seller");
      }
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        setIsAdmin(data?.role_id === "admin");
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const checkKYCStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("sellers")
          .select("verification_status")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        setKycStatus(data?.verification_status || null);
      }
    } catch (error) {
      console.error("Error checking KYC status:", error);
    }
  };

  const checkPendingVerifications = async () => {
    try {
      const { count } = await supabase
        .from("seller_edit_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setPendingVerifications(count || 0);
    } catch (error) {
      console.error("Error checking pending verifications:", error);
    }
  };

  const checkNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from("seller_edit_notifications")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", user.id)
          .eq("status", "unread");

        setUnreadNotifications(count || 0);
      }
    } catch (error) {
      console.error("Error checking notifications:", error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      navigate("/auth/signin");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-navbar transition-smooth">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary fill-primary" />
            <span className="text-xl font-bold gradient-text">ProtiMart</span>
          </div>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {(isAdmin ? adminNavItems : sellerNavItems).map((item) => {
              const isKYCVerified = isAdmin || kycStatus === "approved" || kycStatus === "verified";
              // Allow customer feedback even with pending KYC
              const isCustomerFeedback = item.path === "/customer-feedback";
              const isDisabled = !isAdmin && !isKYCVerified && !isCustomerFeedback;
              
              if (isDisabled) {
                return (
                  <div
                    key={item.path}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-smooth text-muted-foreground/50 cursor-not-allowed opacity-60 pointer-events-none"
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm">{item.title}</span>
                      {item.badge ? (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              }
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg transition-smooth ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    }`
                  }
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.title}</span>
                    {item.badge ? (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                </NavLink>
              );
            })}
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-b shadow-lg">
              <div className="px-4 py-2 space-y-1">
                {(isAdmin ? adminNavItems : sellerNavItems).map((item) => {
                  const isKYCVerified = isAdmin || kycStatus === "approved" || kycStatus === "verified";
                  const isCustomerFeedback = item.path === "/customer-feedback";
                  const isDisabled = !isAdmin && !isKYCVerified && !isCustomerFeedback;
                  
                  if (isDisabled) {
                    return (
                      <div
                        key={item.path}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground/50 cursor-not-allowed opacity-60"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.title}</span>
                        {item.badge ? (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                    );
                  }
                  
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-2 rounded-lg transition-smooth ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted"
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm">{item.title}</span>
                      {item.badge ? (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" asChild>
              <NavLink to={isAdmin ? "/admin/verifications" : "/notifications"} className="relative">
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-xs flex items-center justify-center bg-red-500 text-white rounded-full">
                    {unreadNotifications}
                  </span>
                )}
              </NavLink>
            </Button>

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-9 h-9 border-2 border-primary/20 transition-smooth hover:border-primary cursor-pointer">
                  <AvatarImage src={profilePhoto} alt={username} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {isAdmin ? 'Administrator' : 'Seller'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <UserCircle className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                {!isAdmin && (
                <>
                <DropdownMenuItem onClick={() => navigate('/seller-verification')}>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Verification Status
                </DropdownMenuItem>
                </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}

