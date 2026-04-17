import PrivateRoute from "@/app/privateroute";
import { SpeedInsights } from "@vercel/speed-insights/next";

enum UserRoles {
  USER = "user",
  ADMIN = "admin",
}
export default function ReturnOrdersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <PrivateRoute requiredRoles={[UserRoles.USER]}>
          {children}
        </PrivateRoute>
  );
}
