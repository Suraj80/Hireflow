import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import {
  Zap,
  GitBranch,
  Brain,
  CalendarDays,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Star,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const gentleFloat = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const features = [
  { icon: GitBranch, title: "Kanban Pipeline", desc: "Drag-and-drop candidates through customizable hiring stages with real-time updates." },
  { icon: Brain, title: "AI Resume Scoring", desc: "Instantly score resumes 0–100 with AI-powered matching against job requirements." },
  { icon: CalendarDays, title: "Interview Scheduling", desc: "Coordinate interviews with built-in calendar, reminders, and availability management." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Track time-to-hire, source effectiveness, and pipeline health with rich visualizations." },
];

const steps = [
  { num: "01", title: "Post a Job", desc: "Create detailed job listings and publish them to your career page instantly." },
  { num: "02", title: "Receive & Score", desc: "Applications flow in and get automatically scored by our AI engine." },
  { num: "03", title: "Hire the Best", desc: "Move candidates through your pipeline, schedule interviews, and make offers." },
];

const testimonials = [
  { name: "Sarah Mitchell", role: "VP of People, TechCorp", quote: "HireFlow cut our time-to-hire by 40%. The AI scoring alone saved our team 20 hours per week.", rating: 5 },
  { name: "David Park", role: "Head of Talent, ScaleUp", quote: "The Kanban pipeline is incredibly intuitive. Our recruiters were productive from day one.", rating: 5 },
  { name: "Emily Rodriguez", role: "HR Director, GrowthCo", quote: "Finally an ATS that doesn't feel like it was built in 2005. Clean, fast, and powerful.", rating: 5 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">HireFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(221_83%_53%/0.08),transparent_50%)]" />
        <motion.div
          className="absolute right-[8%] top-20 hidden h-48 w-48 rounded-full bg-primary/10 blur-3xl lg:block"
          variants={gentleFloat}
          animate="animate"
        />
        <motion.div
          className="absolute left-[10%] top-40 hidden h-32 w-32 rounded-full bg-sky-400/10 blur-3xl md:block"
          variants={gentleFloat}
          animate="animate"
          transition={{ delay: 1.2 }}
        />
        <div className="container relative py-24 md:py-32 lg:py-40">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
                <Zap className="mr-1.5 h-3.5 w-3.5" /> Now with AI Resume Scoring
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Streamline Your Hiring with{" "}
              <span className="text-gradient">HireFlow</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              The modern applicant tracking system that helps HR teams find, evaluate, and hire top talent faster with AI-powered workflows.
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-center justify-center">
              <Link to="/dashboard">
                <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg" className="gradient-primary text-primary-foreground border-0 h-12 px-8 text-base">
                    Get started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-24">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <Badge variant="secondary" className="mb-4">Features</Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything you need to hire smarter</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Powerful tools designed to simplify every step of your hiring process.</p>
        </motion.div>
        <motion.div
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          {features.map((f, i) => (
            <motion.div key={i} variants={fadeUp} whileHover={{ y: -6 }}>
              <Card className="group border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5">
              <CardContent className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted/30 py-24">
        <div className="container">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Three steps to better hiring</h2>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
          >
            {steps.map((s, i) => (
              <motion.div key={i} className="text-center" variants={fadeUp}>
                <div className="text-5xl font-extrabold text-gradient mb-4">{s.num}</div>
                <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < 2 && (
                  <ChevronRight className="hidden md:block h-6 w-6 text-muted-foreground/40 absolute right-0 top-1/2 -translate-y-1/2" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="container py-24">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <Badge variant="secondary" className="mb-4">Testimonials</Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Loved by HR teams everywhere</h2>
        </motion.div>
        <motion.div
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          {testimonials.map((t, i) => (
            <motion.div key={i} variants={fadeUp} whileHover={{ y: -6 }}>
              <Card className="border border-border">
              <CardContent className="p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed italic">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="container py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp}
        >
          <Card className="gradient-primary border-0 overflow-hidden">
          <CardContent className="p-12 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Ready to transform your hiring?</h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of companies using HireFlow to build great teams faster.
            </p>
            <Link to="/dashboard">
              <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
          </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="container py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
                  <Zap className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-bold">HireFlow</span>
              </div>
              <p className="text-sm text-muted-foreground">Modern applicant tracking for modern teams.</p>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "GDPR"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2026 HireFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
