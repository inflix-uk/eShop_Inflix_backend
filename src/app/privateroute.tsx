// src/components/PrivateRoute.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/app/context/Auth";
 enum UserRoles {
  USER = "user",
  ADMIN = "admin",
}
interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRoles[];
  redirectTo?: string;
}
const PrivateRoute = ({
  children,
  requiredRoles = [],
  redirectTo = "/login",
}: PrivateRouteProps) => {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push(redirectTo);
    } else if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      // Redirect based on role if the user doesn't have the required role
      switch (user.role) {
        case UserRoles.USER:
          router.push("/customer/dashboard");
          break;
        case UserRoles.ADMIN:
          router.push("/admin/dashboard");
          break;
        default:
          router.push("/login");
      }
    }
  }, [user, requiredRoles, redirectTo, router]);

  // If user is not authenticated or doesn't have the required role, don't render the children
  if (
    !user ||
    (requiredRoles.length > 0 && !requiredRoles.includes(user.role))
  ) {
    return null; // You can render a loader here if desired
  }
  return <>{children}</>;
};

export default PrivateRoute;
