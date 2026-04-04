import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();

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
          <CardContent className="space-y-4">
            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name</Label><Input placeholder="John" className="mt-1.5" /></div>
                <div><Label>Last Name</Label><Input placeholder="Doe" className="mt-1.5" /></div>
              </div>
            )}
            <div><Label>Email</Label><Input type="email" placeholder="john@company.com" className="mt-1.5" /></div>
            <div><Label>Password</Label><Input type="password" placeholder="••••••••" className="mt-1.5" /></div>
            {isRegister && (
              <div><Label>Confirm Password</Label><Input type="password" placeholder="••••••••" className="mt-1.5" /></div>
            )}
            <Button className="w-full gradient-primary text-primary-foreground border-0 h-10" onClick={() => navigate("/dashboard")}>
              {isRegister ? "Create Account" : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setIsRegister(!isRegister)} className="text-primary hover:underline font-medium">
                {isRegister ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
