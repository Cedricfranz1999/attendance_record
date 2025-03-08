"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export const ProtectedAdminRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    // Only check auth after Clerk has loaded the user data
    if (isLoaded) {
      if (!isSignedIn) {
        router.push("/sign-in");
      } else {
        // User is authenticated, stop loading
        setLoading(false);
      }
    }
  }, [isLoaded, isSignedIn, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
