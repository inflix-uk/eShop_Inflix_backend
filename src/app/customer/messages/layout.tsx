import PrivateRoute from "@/app/privateroute";
import { SpeedInsights } from "@vercel/speed-insights/next";

enum UserRoles {
  USER = "user",
  ADMIN = "admin",
}
export default function MessagesLayout({
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
