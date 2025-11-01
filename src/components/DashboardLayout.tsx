import React from "react";

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-14 border-b flex items-center px-4 font-semibold bg-card">
        Admin Dashboard
      </header>
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
};
