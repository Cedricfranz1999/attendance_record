"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader } from "lucide-react";

const ProtectedRoute = ({ children }: any) => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check authentication
    const checkAuth = () => {
      const userString = localStorage.getItem("user");

      if (!userString) {
        // No user found, redirect to login
        router.push("/login");
        return;
      }

      try {
        const user = JSON.parse(userString);
        const userRole = user.role;

        // Check if user is on the correct path based on role
        if (userRole === "teacher" && !pathname.startsWith("/teacher")) {
          router.push("/teacher/attendance");
        } else if (
          userRole === "student" &&
          !pathname.startsWith("/student/")
        ) {
          router.push("/student/attendance");
        } else {
          // User is on the correct path, show content
          setLoading(false);
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("user");
        router.push("/login");
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
