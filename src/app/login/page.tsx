"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogIn } from "lucide-react";
import { motion } from "framer-motion";

const LoginPage = () => {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("student");

  // Student login mutation
  const studentLogin = api.auth.studentLogin.useMutation({
    onSuccess: (data) => {
      handleLoginSuccess(data, "student");
    },
    onError: (error) => {
      handleLoginError(error.message);
    },
  });

  // Teacher login mutation
  const teacherLogin = api.auth.teacherLogin.useMutation({
    onSuccess: (data) => {
      handleLoginSuccess(data, "teacher");
    },
    onError: (error) => {
      handleLoginError(error.message);
    },
  });

  const handleLoginSuccess = (userData: any, role: any) => {
    setLoading(false);

    // Store user data in localStorage
    localStorage.setItem(
      "user",
      JSON.stringify({
        ...userData,
        role: role,
      }),
    );

    // Show success message
    toast({
      title: "Login Successful",
      description: `Welcome back, ${userData.firstname || userData.username}!`,
      className: "bg-green-50 border-green-200",
    });

    // Redirect based on role
    if (role === "teacher") {
      router.push("/teacher/attendance");
    } else {
      router.push("/student/attendance");
    }
  };

  const handleLoginError = (message: any) => {
    setLoading(false);
    toast({
      title: "Login Failed",
      description: message || "Invalid username or password. Please try again.",
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");

    if (!username || !password) {
      handleLoginError("Username and password are required");
      return;
    }

    if (activeTab === "student") {
      studentLogin.mutate({ username, password } as any);
    } else {
      teacherLogin.mutate({ username, password } as any);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-primary/10 shadow-lg">
          <CardHeader className="space-y-1 bg-primary/5 text-center">
            <CardTitle className="text-2xl font-bold">School Portal</CardTitle>
            <CardDescription>Login to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs
              defaultValue="student"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="teacher">Teacher</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      placeholder="Enter your username"
                      required
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <a
                        href="#"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          toast({
                            title: "Password Recovery",
                            description:
                              "Please contact your administrator to reset your password.",
                          });
                        }}
                      >
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="mt-6 w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Login as {activeTab === "student" ? "Student" : "Teacher"}
                    </>
                  )}
                </Button>
              </form>
            </Tabs>
          </CardContent>
          <CardFooter className="border-t bg-gray-50/50 p-4 text-center text-sm text-muted-foreground">
            Academic Year 2024-2025
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
