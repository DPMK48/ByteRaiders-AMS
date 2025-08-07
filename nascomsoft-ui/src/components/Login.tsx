import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, Mail, Lock, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import nascomsoftLogo from "../assets/a.png"; // adjust the path as needed

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading, user } = useAuth();
  console.log("User role:", user);


  const stampedEmail = localStorage.getItem("stampedEmail");
  const userRole = localStorage.getItem("userRole")
  
  
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter your password");
      return;
    }

    if (!stampedEmail && !email) {
      setError("Please enter your email");
      return;
    }

    const loginEmail = stampedEmail || email;

    const success = await login(loginEmail, password);

    if (success) {
      if (!stampedEmail) {
        localStorage.setItem("stampedEmail", loginEmail);
      }
      onLoginSuccess();
    } else {
      setError("Invalid credentials");
    }
  };

  const handleSwitchUser = () => {
    localStorage.removeItem("stampedEmail");
    // localStorage.removeItem("userRole");
    setEmail("");
    setPassword("");
    window.location.reload(); // This will refresh the page and reload the Login component
  };


  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md fade-in">
          <Card className="card-elevated">
            <CardHeader className="space-y-6 text-center">
              <div className="flex justify-center">
                <ImageWithFallback
                  src={nascomsoftLogo}
                  alt="Nascomsoft Embedded Logo"
                  className="h-20 w-auto"
                />
              </div>

              <div className="space-y-2">
                <CardTitle className="text-2xl text-foreground-muted">
                  Welcome to Nascomsoft
                </CardTitle>
                <CardDescription className="text-base text-foreground-muted">
                  Embedded Attendance System
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email input only when not stamped */}
                {!stampedEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="h-11 pl-10 input-focus"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-11 pl-10 input-focus"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="status-error">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 button-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                {/* Switch user if stamped email exists */}
                {stampedEmail && userRole === "admin" && (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={handleSwitchUser}
                    className="w-full text-sm text-muted-foreground hover:text-foreground border-gray-800"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Switch user
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
