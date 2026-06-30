import { useState, useEffect } from "react";
import { useNutrition } from "@/context/NutritionContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Sparkles, Leaf, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const {
    user,
    loading: authLoading,
    signIn,
    signUp,
    resetPassword,
    signInWithGoogle,
    isFirebaseConfigured,
  } = useNutrition();

  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // If already logged in, redirect to homepage or previous state
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleToggleMode = (newMode: "login" | "signup" | "forgot") => {
    setMode(newMode);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleGuestMode = () => {
    sessionStorage.setItem("nutritrack:guest", "true");
    toast({
      title: "Guest Mode Activated",
      description: "You are tracking calories offline. Progress will be saved locally.",
    });
    navigate("/", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      toast({
        title: "Configuration Missing",
        description: "Firebase credentials are not set in your .env file.",
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
          description: "Check your email inbox for password reset instructions.",
        });
        setMode("login");
      } else if (mode === "login") {
        if (!password) {
          toast({ title: "Password required", description: "Please enter your password.", variant: "destructive" });
          setLoading(false);
          return;
        }
        await signIn(email, password);
        toast({ title: "Welcome!", description: "Successfully logged in." });
      } else {
        if (!password || !confirmPassword) {
          toast({ title: "Password required", description: "Please confirm your password.", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast({ title: "Passwords do not match", description: "Please ensure passwords are identical.", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
          setLoading(false);
          return;
        }
        await signUp(email, password);
        toast({ title: "Account Created", description: "Welcome to NutriTrack!" });
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = "An authentication error occurred.";
      if (err.code === "auth/user-not-found") {
        errMsg = "This email address is not registered. Please create an account first.";
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        errMsg = "Invalid credentials. Please verify your email/password, or click 'Sign Up' if you don't have an account yet.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "This email is already registered. Try signing in instead.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Password is too weak. It must be at least 6 characters.";
      } else if (err.code === "auth/user-disabled") {
        errMsg = "This account has been disabled. Please contact support.";
      } else if (err.code === "auth/too-many-requests") {
        errMsg = "Too many failed attempts. Access has been temporarily restricted. Try again later.";
      } else if (err.message) {
        errMsg = err.message;
      }
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast({ title: "Welcome!", description: "Successfully signed in with Google." });
    } catch (err: any) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        toast({
          title: "Google sign-in failed",
          description: err.message || "Could not complete authorization.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative bg-background overflow-hidden">
      {/* Left panel: Info & Premium Brand Visual */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-secondary/30 relative overflow-hidden border-r border-border/40">
        <div className="flex items-center gap-3 z-10">
          <div className="h-10 w-10 rounded-2xl bg-primary grid place-items-center shadow-card">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-display font-semibold tracking-tight text-primary block">NutriTrack</span>
            <p className="text-[10px] text-accent -mt-0.5 uppercase tracking-[0.18em] font-semibold">Track · Learn · Thrive</p>
          </div>
        </div>

        <div className="space-y-6 max-w-md z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/25 text-accent text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Now with Cloud Synchronization</span>
          </div>
          <h1 className="text-4xl font-display font-semibold tracking-tight leading-[1.15] text-primary">
            Take control of your metabolic health.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Register custom ingredients, track micro & macronutrients, log daily water targets, and export reports seamlessly across devices.
          </p>

          <div className="space-y-3 pt-4 border-t border-border/50">
            <div className="flex items-center gap-3 text-xs text-primary/80 font-medium">
              <ShieldCheck className="h-4.5 w-4.5 text-primary shrink-0" />
              <span>Secure personal storage on Firestore</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-primary/80 font-medium">
              <ShieldCheck className="h-4.5 w-4.5 text-primary shrink-0" />
              <span>Sync plates across phones, tablets, & desktops</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground z-10">
          &copy; {new Date().getFullYear()} NutriTrack Inc. All rights reserved.
        </div>

        {/* Decorative ambient blobs */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/15 rounded-full blur-3xl" />
      </div>

      {/* Right panel: Authentication forms */}
      <div className="flex flex-col justify-center px-6 py-12 md:px-12 lg:px-20 relative">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 lg:hidden mb-4">
              <div className="h-8 w-8 rounded-xl bg-primary grid place-items-center shadow-card">
                <Leaf className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-primary">NutriTrack</span>
            </div>
            <h2 className="text-2xl font-display font-semibold tracking-tight text-primary">
              {mode === "login" && "Welcome back"}
              {mode === "signup" && "Get started today"}
              {mode === "forgot" && "Reset your password"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === "login" && "Enter your credentials to log into your account"}
              {mode === "signup" && "Enter details below to register your cloud account"}
              {mode === "forgot" && "Enter your email address and we'll send a reset link"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Social Login (Hide for Forgot Password tab) */}
              {mode !== "forgot" && isFirebaseConfigured && (
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 font-semibold gap-2 border-border/80 hover:bg-secondary/40 transition-colors"
                    onClick={handleGoogleSignIn}
                    disabled={loading || authLoading}
                  >
                    {/* Google SVG Logo */}
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="24" height="24">
                      <path
                        fill="#ea4335"
                        d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"
                      />
                      <path
                        fill="#34a853"
                        d="M16.04 15.345c-1.077.733-2.436 1.173-4.04 1.173a7.077 7.077 0 0 1-6.733-4.855L3.24 14.782C5.199 18.73 9.27 21.43 12 21.43c3.11 0 5.763-1.027 7.682-2.791l-3.64-3.294z"
                      />
                      <path
                        fill="#4285f4"
                        d="M23.49 12.275c0-.818-.073-1.609-.209-2.373H12v4.545h6.455c-.277 1.482-1.11 2.736-2.364 3.582l3.64 3.294c2.127-1.964 3.759-4.855 3.759-8.048z"
                      />
                      <path
                        fill="#fbbc05"
                        d="M5.266 14.235L1.24 17.35A11.948 11.948 0 0 1 0 12c0-1.927.455-3.75 1.24-5.35l4.026 3.115a7.037 7.037 0 0 0-.209 2.235c0 .782.073 1.536.209 2.235z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-border/50"></div>
                    <span className="flex-shrink mx-4 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Or email</span>
                    <div className="flex-grow border-t border-border/50"></div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email Address</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || authLoading}
                      className="pl-9 h-10 border-border/80"
                      required
                    />
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/75" />
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
                          className="text-xs text-accent hover:underline font-semibold"
                          tabIndex={-1}
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading || authLoading}
                        className="pl-9 pr-10 h-10 border-border/80"
                        required
                      />
                      <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/75" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                        disabled={loading || authLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading || authLoading}
                        className="pl-9 pr-10 h-10 border-border/80"
                        required
                      />
                      <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/75" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                        disabled={loading || authLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full h-10 gradient-primary text-primary-foreground font-semibold" disabled={loading || authLoading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      {mode === "login" && "Sign In"}
                      {mode === "signup" && "Register Cloud Account"}
                      {mode === "forgot" && "Send Password Reset Link"}
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          </AnimatePresence>

          <div className="text-center text-xs space-y-4 text-muted-foreground">
            <div>
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

            <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/40">
              <span>Or prefer offline mode?</span>
              <button
                type="button"
                onClick={handleGuestMode}
                className="text-primary hover:underline font-semibold flex items-center gap-0.5"
              >
                Continue as Guest
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
