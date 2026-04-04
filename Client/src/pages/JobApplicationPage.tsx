import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Zap, MapPin, Clock, Briefcase, Upload, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function JobApplicationPage() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-border animate-scale-in">
          <CardContent className="p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Thank you for applying. We'll review your application and get back to you soon.
            </p>
            <Link to="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold">HireFlow</span>
          </Link>
        </div>
      </nav>

      <div className="container max-w-2xl py-12">
        <Card className="border border-border mb-6">
          <CardContent className="p-6">
            <Badge variant="secondary" className="mb-3">Engineering</Badge>
            <h1 className="text-2xl font-bold mb-2">Senior Frontend Developer</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Remote</span>
              <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> Full-time</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> $120k – $160k</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              We're looking for a Senior Frontend Developer to join our engineering team. You'll work on building beautiful, performant user interfaces using React, TypeScript, and modern web technologies.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader><CardTitle className="text-lg">Apply for this Position</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="fname">First Name *</Label><Input id="fname" placeholder="John" className="mt-1.5" /></div>
              <div><Label htmlFor="lname">Last Name *</Label><Input id="lname" placeholder="Doe" className="mt-1.5" /></div>
            </div>
            <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" placeholder="john@example.com" className="mt-1.5" /></div>
            <div><Label htmlFor="phone">Phone</Label><Input id="phone" placeholder="+1 (555) 000-0000" className="mt-1.5" /></div>
            <div><Label htmlFor="linkedin">LinkedIn Profile</Label><Input id="linkedin" placeholder="https://linkedin.com/in/..." className="mt-1.5" /></div>
            <div>
              <Label>Resume *</Label>
              <div className="mt-1.5 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Drop your resume here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC up to 10MB</p>
              </div>
            </div>
            <div><Label htmlFor="cover">Cover Letter</Label><Textarea id="cover" placeholder="Why are you interested in this role?" className="mt-1.5 min-h-[120px]" /></div>
            <Button className="w-full gradient-primary text-primary-foreground border-0 h-11" onClick={() => setSubmitted(true)}>
              Submit Application
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
