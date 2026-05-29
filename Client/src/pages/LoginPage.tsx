import { FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Eye, EyeOff, Zap } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || "/dashboard";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  const getFriendlyError = (error: unknown) => {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message || "Something went wrong. Please try again.";
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFieldErrors: FieldErrors = {};

    if (!email.trim()) nextFieldErrors.email = "Email is required.";
    if (!password.trim()) nextFieldErrors.password = "Password is required.";

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(getFriendlyError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background gradient-hero">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">HireFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/">
              <Button variant="ghost" size="sm">Home</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">HireFlow</span>
            </Link>
          </div>

          <Card className="border border-border shadow-float animate-scale-in">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Welcome Back</CardTitle>
              <p className="text-sm text-muted-foreground">
                Access is provided by your organization administrator.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    className={`mt-1.5 ${fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError("email");
                    }}
                  />
                  {fieldErrors.email && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.email}</p>}
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className={`pr-10 ${fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFieldError("password");
                      }}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.password}</p>}
                </div>
                <Button
                  className="w-full gradient-primary text-primary-foreground border-0 h-10"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Please wait..." : "Sign In"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Need access? Contact your organization administrator.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
