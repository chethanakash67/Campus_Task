import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  Zap,
  Shield,
  BarChart3,
  Plus,
  FolderPlus,
  UserPlus,
  FileText,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Rocket,
  FolderOpen,
  Github,
  Twitter,
  Linkedin,
} from "lucide-react";
import "./Landing.css";

// ==================== NAVBAR ====================
function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="navbar"
    >
      <div className="navbar-container">
        <div className="navbar-content">
          <Link to="/" className="navbar-logo">
            <div className="logo-icon">
              <span>C</span>
            </div>
            <span className="logo-text">
              CampusTasks<span className="logo-dot">.</span>
            </span>
          </Link>

          <div className="navbar-links">
            <a href="#features">Features</a>
            <a href="#stats">Stats</a>
            <a href="#pricing">Pricing</a>
          </div>

          <div className="navbar-actions">
            <Link to="/login" className="btn btn-ghost">Login</Link>
            <Link to="/signup" className="btn btn-primary">Sign Up</Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

// ==================== HERO ====================
function Hero() {
  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="hero-glow-bottom" />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hero-content"
        >
          <div className="hero-badge">
            <Sparkles className="icon-sm" />
            <span>Now with AI-powered task suggestions</span>
          </div>
          <h1 className="hero-title">
            Manage Tasks.<br />
            <span className="text-gradient-accent">Ace Your Semester.</span>
          </h1>
          <p className="hero-subtitle">
            The modern task management platform built for students and teams.
            Organize assignments, track deadlines, and collaborate seamlessly.
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-hero">
              Get Started Free
              <ArrowRight className="icon-sm" />
            </Link>
          </div>
          
        </motion.div>
      </div>
    </section>
  );
}

// ==================== MOCKUP WINDOW ====================
function MockupWindow() {
  const bars = [60, 85, 45, 70, 90, 55, 75, 80];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="mockup-wrapper"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.5 }}
        className="mockup-window"
      >
        <div className="mockup-header">
          <div className="mockup-dot red" />
          <div className="mockup-dot yellow" />
          <div className="mockup-dot green" />
          <span className="mockup-title">CampusTasks Dashboard</span>
        </div>

        <div className="mockup-body">
          <div className="mockup-sidebar">
            <div className="skeleton-line w-40" />
            <div className="skeleton-line w-60" />
            <div className="skeleton-line w-80" />
            <div className="skeleton-line w-75 mt-6" />
            <div className="skeleton-line w-50" />
            <div className="skeleton-line w-66" />
          </div>

          <div className="mockup-main">
            <div className="mockup-glow" />
            <div className="mockup-code">
              <span className="code-comment">{"// "}</span>
              <span className="code-keyword">Project</span>
              <span className="code-operator">{" = "}</span>
              <span className="code-string">"CS101 Final Project"</span>
              <span className="code-cursor" />
            </div>

            <div className="analytics-bars">
              {bars.map((height, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                  className="bar"
                />
              ))}
            </div>

            <div className="stats-row">
              {[
                { label: "Tasks", value: "24" },
                { label: "Done", value: "18" },
                { label: "Progress", value: "75%" },
              ].map((stat, index) => (
                <div key={index} className="stat-box">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== STATS SECTION ====================
const stats = [
  { icon: Users, value: "10,000+", label: "Active Users", description: "Students & teams using CampusTasks", color: "blue" },
  { icon: CheckCircle, value: "250,000+", label: "Tasks Completed", description: "Assignments delivered on time", color: "green" },
  { icon: Clock, value: "45%", label: "Time Saved", description: "Average productivity boost", color: "purple" },
  { icon: TrendingUp, value: "98%", label: "Success Rate", description: "Projects completed successfully", color: "pink" },
];

function StatsSection() {
  return (
    <section id="stats" className="section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header"
        >
          <h2>Trusted by Thousands</h2>
          <p>Join the growing community of students and teams who have transformed their productivity.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="stats-grid"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card stat-card ${stat.color}`}
            >
              <div className={`icon-box ${stat.color}`}>
                <stat.icon className="icon" />
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <p className="stat-description">{stat.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ==================== FEATURES SECTION ====================
const features = [
  { icon: TrendingUp, title: "Track Progress", description: "See who is doing what in real-time with our intuitive Kanban boards.", gradient: "blue-purple", span: true },
  { icon: Calendar, title: "Meet Deadlines", description: "Automated reminders ensure you never miss an assignment submission again.", gradient: "purple-pink" },
  { icon: Users, title: "Teamwork Made Easy", description: "Built specifically for student groups, hackathons, and remote squads.", gradient: "pink-orange" },
  { icon: Zap, title: "Lightning Fast", description: "Instant sync across all devices. Your tasks update in real-time, everywhere.", gradient: "yellow-pink" },
  { icon: Shield, title: "Secure & Private", description: "Enterprise-grade security keeps your academic work safe and confidential.", gradient: "green-blue" },
  { icon: BarChart3, title: "Analytics & Insights", description: "Understand your team's performance with detailed productivity reports.", gradient: "blue-cyan", span: true },
];

function FeaturesSection() {
  return (
    <section id="features" className="section">
      <div className="section-glow" />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header"
        >
          <span className="badge">Features</span>
          <h2>Everything You Need to Succeed</h2>
          <p>Powerful features designed to help students and teams collaborate effectively.</p>
        </motion.div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card feature-card ${feature.span ? "span-2" : ""}`}
            >
              <div className={`icon-box gradient-${feature.gradient}`}>
                <feature.icon className="icon" />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== QUICK ACTIONS ====================
const actions = [
  { icon: Plus, title: "Create New Task", description: "Start tracking your next assignment", color: "blue" },
  { icon: FolderPlus, title: "New Project", description: "Set up a new team workspace", color: "purple" },
  { icon: UserPlus, title: "Invite Team", description: "Add collaborators to your project", color: "pink" },
  { icon: FileText, title: "Import Tasks", description: "Bring tasks from other tools", color: "green" },
];

function QuickActions() {
  return (
    <section className="section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header-left"
        >
          <h2>Quick Actions</h2>
          <p>Get started in seconds with these shortcuts</p>
        </motion.div>

        <div className="actions-grid">
          {actions.map((action, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`action-card ${action.color}`}
            >
              <div className={`icon-box ${action.color}`}>
                <action.icon className="icon-sm" />
              </div>
              <div>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== INFO BOXES ====================
const infoCards = [
  { type: "tip", icon: Lightbulb, title: "Pro Tip", message: "Use keyboard shortcuts to navigate faster. Press '?' to see all available shortcuts.", color: "yellow" },
  { type: "success", icon: CheckCircle2, title: "All Systems Operational", message: "All services are running smoothly. Last sync: 2 minutes ago.", color: "green" },
  { type: "alert", icon: AlertCircle, title: "Deadline Approaching", message: "You have 3 tasks due within the next 48 hours. Review them now.", color: "orange", action: "View Tasks" },
  { type: "promo", icon: Rocket, title: "Upgrade to Pro", message: "Get unlimited projects, priority support, and advanced analytics.", color: "purple", action: "Learn More" },
];

function InfoBoxes() {
  return (
    <section className="section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header-left"
        >
          <h2>Stay Informed</h2>
          <p>Important updates and helpful tips at a glance</p>
        </motion.div>

        <div className="info-grid">
          {infoCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`info-card ${card.color}`}
            >
              <div className={`icon-box ${card.color}`}>
                <card.icon className="icon-sm" />
              </div>
              <div className="info-content">
                <h3>{card.title}</h3>
                <p>{card.message}</p>
                {card.action && (
                  <button className={`btn-link ${card.color}`}>{card.action} →</button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== EMPTY STATE ====================
function EmptyState({ title = "No projects yet", description = "Create your first project to start organizing tasks with your team.", actionLabel = "Create Project" }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="empty-state"
    >
      <div className="empty-icon">
        <FolderOpen className="icon-lg" />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="btn btn-gradient">
        <Plus className="icon-sm" />
        {actionLabel}
      </button>
    </motion.div>
  );
}

function EmptyStateShowcase() {
  return (
    <section className="section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header-left"
        >
          <h2>Beautiful Empty States</h2>
          <p>Thoughtfully designed placeholder states for when data is missing</p>
        </motion.div>

        <div className="empty-grid">
          <EmptyState />
          <EmptyState
            title="No tasks found"
            description="When you add tasks to this project, they'll appear here. Get started by creating your first task."
            actionLabel="Add Task"
          />
        </div>
      </div>
    </section>
  );
}

// ==================== CTA SECTION ====================
function CTASection() {
  return (
    <section id="pricing" className="section cta-section">
      <div className="cta-glow" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="cta-content"
      >
        <div className="hero-badge">
          <Sparkles className="icon-sm" />
          <span>Free Forever for Students</span>
        </div>

        <h2>
          Ready to Transform Your <span className="text-gradient-accent">Productivity?</span>
        </h2>

        <p>
          Join thousands of students and teams who are already managing their projects more effectively.
          No credit card required.
        </p>

        <div className="cta-buttons">
          <Link to="/signup" className="btn btn-gradient">
            Start For Free
            <ArrowRight className="icon-sm" />
          </Link>
        </div>

        <div className="trust-badges">
          <span><span className="dot green" /> No credit card required</span>
          <span><span className="dot green" /> 14-day free trial</span>
          <span><span className="dot green" /> Cancel anytime</span>
        </div>
      </motion.div>
    </section>
  );
}

// ==================== FOOTER ====================
const footerLinks = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap"],
  Resources: ["Documentation", "API", "Guides", "Blog"],
  Company: ["About", "Careers", "Press", "Contact"],
  Legal: ["Privacy", "Terms", "Security", "Cookies"],
};

const socialLinks = [
  { icon: Twitter, label: "Twitter" },
  { icon: Github, label: "GitHub" },
  { icon: Linkedin, label: "LinkedIn" },
];

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="navbar-logo">
              <div className="logo-icon"><span>C</span></div>
              <span className="logo-text">CampusTasks<span className="logo-dot">.</span></span>
            </div>
            <p>The ultimate task management tool designed for students and remote teams.</p>
            <div className="social-links">
              {socialLinks.map((social, index) => (
                <a key={index} href="#" aria-label={social.label} className="social-link">
                  <social.icon className="icon-sm" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="footer-column">
              <h4>{category}</h4>
              <ul>
                {links.map((link) => (
                  <li key={link}><a href="#">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CampusTasks. Built for efficiency.</p>
          <p>Made with ❤️ for students everywhere</p>
        </div>
      </div>
    </footer>
  );
}

// ==================== MAIN LANDING COMPONENT ====================
export default function Landing() {
  return (
    <div className="landing">
      <div className="noise-overlay" />
      <Navbar />
      <Hero />
      <StatsSection />
      <FeaturesSection />
      <QuickActions />
      <InfoBoxes />
      <EmptyStateShowcase />
      <CTASection />
      <Footer />
    </div>
  );
}
