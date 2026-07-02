import { useState } from "react";
import { useNutrition } from "@/context/NutritionContext";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, LogIn, Mail, ShieldAlert } from "lucide-react";

interface AuthDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AuthDialog({ trigger, open, onOpenChange }: AuthDialogProps) {
  const { signIn, signUp, resetPassword } = useNutrition();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleToggleMode = (newMode: "login" | "signup" | "forgot") => {
    setMode(newMode);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      toast({
        title: "Configuration Required",
        description: "Firebase is not configured. Please set up your environment variables.",
        variant: "destructive",
      });
      return;
    }

    if (!email) {
      toast({ title: "Email required", description: "Please enter your email.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (mode === "forgot") {
        await resetPassword(email);
        toast({
          title: "Reset link sent",
          description: "Check your email for instructions to reset your password.",
        });
        setMode("login");
      } else if (mode === "login") {
        if (!password) {
          toast({ title: "Password required", description: "Please enter your password.", variant: "destructive" });
          setLoading(false);
          return;
        }
        await signIn(email, password);
        toast({ title: "Welcome back!", description: "You have logged in successfully." });
        setIsOpen(false);
      } else {
        if (!password || !confirmPassword) {
          toast({ title: "Password required", description: "Please enter and confirm your password.", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast({ title: "Passwords match", description: "Your passwords do not match.", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
          setLoading(false);
          return;
        }
        await signUp(email, password);
        toast({ title: "Account created!", description: "You are now signed up and logged in." });
        setIsOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = "An unexpected error occurred.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        errMsg = "Invalid credentials. If you previously signed up with Google, please use the main Login page to sign in with Google.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "An account with this email already exists. Try signing in with your password, or use Google Sign-in on the main Login page.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Please enter a valid email address.";
      } else if (err.message) {
        errMsg = err.message;
      }
      toast({
        title: "Authentication failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="h-9 px-4 rounded-full flex items-center gap-1.5 text-xs font-medium">
      <LogIn className="h-3.5 w-3.5" /> Log In
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger === undefined ? <DialogTrigger asChild>{defaultTrigger}</DialogTrigger> : trigger}
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-center font-display">
            {mode === "login" && "Sign In"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Reset Password"}
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            {mode === "login" && "Enter your email and password to access your logs"}
            {mode === "signup" && "Sign up to track calories and sync your progress"}
            {mode === "forgot" && "Enter your email to receive a password reset link"}
          </DialogDescription>
        </DialogHeader>

        {!isFirebaseConfigured ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex flex-col gap-2 mt-2 items-center text-center">
            <ShieldAlert className="h-8 w-8 text-destructive animate-pulse" />
            <h4 className="font-semibold text-sm text-destructive">Firebase Offline Mode</h4>
            <p className="text-xs text-muted-foreground leading-normal">
              Authentication and database persistence are currently unavailable. Setup your Firebase keys in your <code>.env</code> file.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-9 h-10"
                  required
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => handleToggleMode("forgot")}
                      className="text-xs text-accent hover:underline font-medium"
                      tabIndex={-1}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-10"
                  required
                />
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="h-10"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full h-10 gradient-primary text-primary-foreground font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  {mode === "login" && "Sign In"}
                  {mode === "signup" && "Sign Up"}
                  {mode === "forgot" && "Send Reset Link"}
                </>
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground pt-1">
              {mode === "login" && (
                <p>
                  Don't have an account?{" "}
                  <button type="button" onClick={() => handleToggleMode("signup")} className="text-accent hover:underline font-semibold">
                    Sign Up
                  </button>
                </p>
              )}
              {mode === "signup" && (
                <p>
                  Already have an account?{" "}
                  <button type="button" onClick={() => handleToggleMode("login")} className="text-accent hover:underline font-semibold">
                    Sign In
                  </button>
                </p>
              )}
              {mode === "forgot" && (
                <button type="button" onClick={() => handleToggleMode("login")} className="text-accent hover:underline font-semibold">
                  Back to Sign In
                </button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
