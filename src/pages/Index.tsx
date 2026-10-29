import { motion } from "framer-motion";
import { Header } from "@/components/nutrition/Header";
import { Link } from "react-router-dom";
import { ArrowRight, Leaf, Activity, Target, Download, Sparkles, Search, BarChart3, Bookmark, PlusCircle, User } from "lucide-react";
import { useNutrition } from "@/context/NutritionContext";
import React from "react";

export default function Index() {
  const { user } = useNutrition();
  const hasAccess = Boolean(user);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[100px] -z-10" />

          <div className="max-w-7xl mx-auto px-4 md:px-8 relative text-center z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent text-sm font-semibold mb-8 border border-accent/20 shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              Your Personal Metabolic Dashboard
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-display font-semibold tracking-tight text-primary max-w-4xl mx-auto leading-[1.1]"
            >
              Take control of your <br className="hidden md:block" />
              <span className="text-accent relative whitespace-nowrap">
                <span className="relative z-10">metabolic health</span>
                <span className="absolute -bottom-2 left-0 right-0 h-4 bg-accent/20 -rotate-1 -z-10" />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Track micro & macronutrients, log daily water targets, create custom foods, and visualize your progress with intelligent reporting.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {hasAccess ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl gradient-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                >
                  Go to Dashboard <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl gradient-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                >
                  Start Tracking for Free <ArrowRight className="h-5 w-5" />
                </Link>
              )}
            </motion.div>
          </div>
        </section>

        {/* Feature Showcase Section (GIFs / Animations) */}
        <section className="py-16 bg-gradient-to-b from-transparent to-secondary/40 relative overflow-hidden">
          {/* Subtle background glow for the showcase section */}
          <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-24 relative z-10">

            {/* Showcase 1: Setup Profile */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="flex flex-col md:flex-row items-center gap-12 lg:gap-20"
            >
              <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary shadow-sm">
                  <User className="h-7 w-7" />
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-semibold text-primary tracking-tight">
                  Personalized Profile Setup
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Start by configuring your unique physical profile. Set your goals, activity levels, and personal details to generate highly accurate nutritional targets tailored just for you.
                </p>
              </div>
              <div className="flex-1 w-full">
                <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-2xl aspect-video bg-card group">
                  <video
                    src="/setup_profile.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="none"
                    poster="/placeholder.svg"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>

            {/* Showcase 2: Searching & Adding Foods (Reversed) */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20"
            >
              <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-accent/10 text-accent shadow-sm">
                  <Search className="h-7 w-7" />
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-semibold text-primary tracking-tight">
                  Search & Add Foods
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Easily find any food in our comprehensive database. Adjust portion sizes precisely and watch your plate's nutritional profile update in real-time.
                </p>
              </div>
              <div className="flex-1 w-full">
                {/* Replace src with your actual GIF like src="/search-demo.gif" */}
                <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-2xl aspect-video bg-card group">
                  <video
                    src="/search_demo.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="none"
                    poster="/placeholder.svg"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>

            {/* Showcase 3: Charts */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="flex flex-col md:flex-row items-center gap-12 lg:gap-20"
            >
              <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary shadow-sm">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-semibold text-primary tracking-tight">
                  Visualize Your Progress
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Interactive charts break down your macronutrient distribution and provide a historical view of your daily calorie intake. Know exactly where you stand.
                </p>
              </div>
              <div className="flex-1 w-full">
                <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-2xl aspect-video bg-card group">
                  <video
                    src="/chart.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="none"
                    poster="/placeholder.svg"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>

            {/* Showcase 4: Saving Meals (Reversed) */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20"
            >
              <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-accent/10 text-accent shadow-sm">
                  <Bookmark className="h-7 w-7" />
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-semibold text-primary tracking-tight">
                  Save Meals & Track Daily Calories
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Turn your perfect plate into a saved meal with a single click. Easily add it to today's log to keep your daily calorie tracking accurate and effortless.
                </p>
              </div>
              <div className="flex-1 w-full">
                <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-2xl aspect-video bg-card group">
                  <video
                    src="/savedMeal.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="none"
                    poster="/placeholder.svg"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>

            {/* Showcase 5: Custom Foods */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="flex flex-col md:flex-row items-center gap-12 lg:gap-20"
            >
              <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary shadow-sm">
                  <PlusCircle className="h-7 w-7" />
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-semibold text-primary tracking-tight">
                  Create Custom Foods
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Can't find a specific item? Easily add custom foods with their exact macronutrients and calories to ensure your daily logs remain perfectly accurate.
                </p>
              </div>
              <div className="flex-1 w-full">
                <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-2xl aspect-video bg-card group">
                  <video
                    src="/customFood.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="none"
                    poster="/placeholder.svg"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-secondary/40 relative overflow-hidden">
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-semibold text-primary tracking-tight">
                Everything you need to thrive
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Stop guessing what you're eating. NutriTrack gives you precision tools to measure exactly what enters your body.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Target className="h-6 w-6" />}
                title="Dynamic RDA Targets"
                description="Targets recalculate instantly based on your profile, age, gender, and specific goals like muscle gain or pregnancy."
                delay={0.1}
              />
              <FeatureCard
                icon={<Activity className="h-6 w-6" />}
                title="37-Nutrient Tracking"
                description="Track core macros, fat types, 13 vitamins, 13 minerals, and choline, with USDA food data where reported."
                delay={0.2}
              />
              <FeatureCard
                icon={<Download className="h-6 w-6" />}
                title="PDF Export & Library"
                description="Save your favourite meals into a personal library and generate PDF reports of your daily plates to share with your dietician."
                delay={0.3}
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-background/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 md:px-8 relative text-center">
            <h2 className="text-4xl md:text-6xl font-display font-semibold text-primary-foreground mb-6 tracking-tight">
              Ready to meet your goals?
            </h2>
            <p className="text-primary-foreground/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Join today to start logging your meals and taking absolute control of your daily nutrition targets.
            </p>
            <Link
              to={hasAccess ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-background text-primary font-semibold text-lg hover:scale-105 transition-transform shadow-xl"
            >
              {hasAccess ? "Open Dashboard" : "Create Free Account"} <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-background py-10 border-t border-border/40 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xl bg-primary grid place-items-center shadow-sm">
            <Leaf className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-semibold text-primary">NutriTrack</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Track. Learn. Thrive.
        </p>
        <p className="text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} NutriTrack Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className="bento-tile p-8 bg-card border border-border/50 hover:border-accent/30 hover:shadow-lg transition-all group"
    >
      <div className="h-14 w-14 rounded-2xl bg-secondary group-hover:bg-accent/10 flex items-center justify-center text-primary group-hover:text-accent transition-colors mb-6 shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-display font-semibold text-primary mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}
