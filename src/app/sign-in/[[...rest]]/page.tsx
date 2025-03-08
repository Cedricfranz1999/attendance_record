import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignIn } from "@clerk/nextjs";

export default function LoginForm() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-bold">
            Attendance System
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignIn
            path="/sign-in"
            fallbackRedirectUrl="/attendanceRecord/dashboard"
            routing="path"
            signUpUrl="/sign-up"
          />
        </CardContent>
      </Card>
    </div>
  );
}
