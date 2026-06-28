import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container flex min-h-16 items-center justify-between gap-3 py-3 sm:gap-4 sm:py-0">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight min-[390px]:text-lg sm:text-xl">HireFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm" className="whitespace-nowrap px-3 sm:px-4">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative flex min-h-[calc(100svh-4rem)] overflow-hidden gradient-hero">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(221_83%_53%/0.08),transparent_50%)]" />
        <motion.div
          className="absolute right-[8%] top-20 hidden h-48 w-48 rounded-full bg-primary/10 blur-3xl xl:block"
          variants={gentleFloat}
          animate="animate"
        />
        <motion.div
          className="absolute left-[10%] top-40 hidden h-32 w-32 rounded-full bg-sky-400/10 blur-3xl md:block"
          variants={gentleFloat}
          animate="animate"
          transition={{ delay: 1.2 }}
        />
        <div className="container relative flex flex-1 items-center px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:py-32">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="secondary" className="mb-5 px-4 py-1.5 text-xs font-medium sm:mb-6 sm:text-sm">
                <Zap className="mr-1.5 h-3.5 w-3.5" /> Now with AI Resume Scoring
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="mx-auto mb-5 max-w-2xl text-3xl font-extrabold tracking-tight leading-[1.08] sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Streamline Your Hiring with{" "}
              <span className="text-gradient">HireFlow</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mb-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl"
            >
              The modern applicant tracking system that helps HR teams find, evaluate, and hire top talent faster with AI-powered workflows.
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-center justify-center">
              <Link to="/dashboard">
                <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg" className="gradient-primary h-12 w-full border-0 px-8 text-base text-primary-foreground sm:w-auto">
                    Get started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
