import PrivateRoute from "@/app/privateroute";
import { SpeedInsights } from "@vercel/speed-insights/next";

enum UserRoles {
  USER = "user",
  ADMIN = "admin",
}
export default function MyOrdersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <PrivateRoute requiredRoles={[UserRoles.USER]}>
          <SpeedInsights />
          {children}
        </PrivateRoute>
  );
}
