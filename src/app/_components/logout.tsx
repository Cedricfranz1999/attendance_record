"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const LogoutButton = ({
  variant = "default",
  size = "default",
  className = "",
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);

    // Simulate a small delay to show loading state
    setTimeout(() => {
      // Get the current user to display their name in the toast
      const userString = localStorage.getItem("user");
      let userName = "User";

      if (userString) {
        try {
          const userData = JSON.parse(userString);
          userName = userData.firstname || userData.username || "User";
        } catch (e) {
          console.error("Error parsing user data:", e);
        }
      }

      // Clear user data from localStorage
      localStorage.removeItem("user");

      // Show success toast
      toast({
        title: "Logged Out Successfully",
        description: `Goodbye, ${userName}! You have been logged out.`,
        className: "bg-blue-50 border-blue-200",
      });

      // Redirect to login page
      router.push("/login");
    }, 800); // Small delay for UX
  };

  // Simple button without confirmation dialog
  if (variant === "ghost" || variant === "link") {
    return (
      <Button
        variant={variant}
        className={className}
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Logging out...
          </>
        ) : (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </>
        )}
      </Button>
    );
  }

  // With confirmation dialog for more prominent variants
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className={className}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be logged out of your account and redirected to the login
            page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="bg-primary"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              "Logout"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LogoutButton;
