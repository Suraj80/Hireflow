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

type FieldErrors = Partial<
  Record<"firstName" | "lastName" | "email" | "password" | "confirmPassword", string>
>;

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, isAuthenticated, isLoading } = useAuth();
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

    if (isRegister) {
      if (!firstName.trim()) nextFieldErrors.firstName = "First name is required.";
      if (!lastName.trim()) nextFieldErrors.lastName = "Last name is required.";
      if (!confirmPassword.trim()) nextFieldErrors.confirmPassword = "Please confirm your password.";
    }

    if (!email.trim()) nextFieldErrors.email = "Email is required.";
    if (!password.trim()) nextFieldErrors.password = "Password is required.";

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register({
          name: `${firstName} ${lastName}`.trim(),
          email,
          password,
        });
      } else {
        await login({ email, password });
      }

      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(getFriendlyError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 gradient-hero">
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
            <CardTitle className="text-xl">{isRegister ? "Create Account" : "Welcome Back"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isRegister ? "Start managing your hiring pipeline" : "Sign in to your dashboard"}
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {isRegister && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      placeholder="John"
                      className={`mt-1.5 ${fieldErrors.firstName ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        clearFieldError("firstName");
                      }}
                    />
                    {fieldErrors.firstName && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.firstName}</p>}
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      placeholder="Doe"
                      className={`mt-1.5 ${fieldErrors.lastName ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        clearFieldError("lastName");
                      }}
                    />
                    {fieldErrors.lastName && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.lastName}</p>}
                  </div>
                </div>
              )}
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
                      if (isRegister) {
                        clearFieldError("confirmPassword");
                      }
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
              {isRegister && (
                <div>
                  <Label>Confirm Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className={`pr-10 ${fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearFieldError("confirmPassword");
                      }}
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
                </div>
              )}
              <Button
                className="w-full gradient-primary text-primary-foreground border-0 h-10"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setFieldErrors({});
                    setShowPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {isRegister ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
