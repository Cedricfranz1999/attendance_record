"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  User,
  LogOut,
  Home,
  BookOpen,
  Calendar,
  Users,
} from "lucide-react";
import LogoutButton from "@/app/_components/logout";

const Header = () => {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const userString = localStorage.getItem("user");
    if (userString) {
      try {
        const userData = JSON.parse(userString);
        setUser(userData);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  // Don't render anything during SSR to avoid hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Check if user exists
  if (!user) {
    return null;
  }

  const isTeacher = user.role === "teacher";
  const basePath = isTeacher ? "/teacher" : "/student";

  const getInitials = (firstname: any, lastName: any) => {
    return `${(firstname || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between pr-20">
        <div className="flex items-center">
          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0"></SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href={basePath} className="ml-4 md:ml-0"></Link>

          {/* Desktop Navigation */}
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image} alt={user.firstname} />
                <AvatarFallback className="bg-primary/10">
                  {getInitials(user.firstname, user.lastName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user.firstname} {user.lastName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.username}
                </p>
                <p className="text-xs font-medium text-primary">
                  {isTeacher ? "Teacher" : "Student"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="">
              <LogoutButton
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer justify-start p-0"
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
