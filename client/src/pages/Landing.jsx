import { Link } from "react-router-dom";
import {
  ArrowRight,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  Zap,
  Shield,
  BarChart3,
  Github,
  Linkedin,
  Sparkles,
  Mail,
  Phone,
  Info,
  CircleHelp,
} from "lucide-react";
import { useState } from "react";
import "./Landing.css";

// ==================== NAVBAR ====================
function Navbar() {
  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <Link to="/" className="landing-logo">
          <div className="landing-logo-icon">
            <span>C</span>
          </div>
          <span className="landing-logo-text">
            CampusTasks<span className="landing-logo-dot">.</span>
          </span>
        </Link>

        <div className="landing-nav-links">
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#stats" className="landing-nav-link">Stats</a>
          <a href="#cta" className="landing-nav-link">Pricing</a>
        </div>

        <div className="landing-nav-actions">
          <Link to="/login" className="landing-btn landing-btn-ghost">Sign In</Link>
          <Link to="/signup" className="landing-btn landing-btn-primary">Get Started</Link>
        </div>
      </div>
    </nav>
  );
}

// ==================== HERO ====================
function Hero() {
  return (
    <section className="landing-hero">
      <div className="landing-hero-bg" />
      <div className="landing-hero-grid" />
      
      <div className="landing-hero-content">
        <div className="landing-hero-badge">
          <Sparkles size={16} />
          <span>Now with AI-powered task suggestions</span>
        </div>
        
        <h1 className="landing-hero-title">
          Manage Tasks.<br />
          <span className="landing-hero-gradient">Ace Your Semester.</span>
        </h1>
        
        <p className="landing-hero-subtitle">
          The modern task management platform built for students and teams.
          Organize assignments, track deadlines, and collaborate seamlessly.
        </p>
        
        <div className="landing-hero-actions">
          <Link to="/signup" className="landing-btn landing-btn-gradient landing-btn-large">
            Get Started Free
            <ArrowRight size={18} />
          </Link>
          <a href="#features" className="landing-btn landing-btn-outline landing-btn-large">
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}

// ==================== STATS SECTION ====================
const stats = [
  { icon: Users, value: "2+", label: "Active Users", color: "accent" },
  { icon: CheckCircle, value: "2+", label: "Tasks Completed", color: "green" },
  { icon: Clock, value: "45%", label: "Time Saved", color: "purple" },
  { icon: TrendingUp, value: "98%", label: "Success Rate", color: "pink" },
];

function StatsSection() {
  return (
    <section id="stats" className="landing-stats">
      <div className="landing-stats-inner">
        <div className="landing-stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="landing-stat-card">
              <div className={`landing-stat-icon ${stat.color}`}>
                <stat.icon />
              </div>
              <div className="landing-stat-value">{stat.value}</div>
              <div className="landing-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== FEATURES SECTION ====================
const features = [
  { 
    icon: TrendingUp, 
    title: "Track Progress", 
    description: "See who is doing what in real-time with our intuitive Kanban boards and progress tracking.", 
    color: "blue",
    span: true 
  },
  { 
    icon: Calendar, 
    title: "Meet Deadlines", 
    description: "Automated reminders ensure you never miss an assignment submission again.", 
    color: "purple" 
  },
  { 
    icon: Users, 
    title: "Teamwork Made Easy", 
    description: "Built specifically for student groups, hackathons, and remote squads.", 
    color: "pink" 
  },
  { 
    icon: Zap, 
    title: "Lightning Fast", 
    description: "Instant sync across all devices. Your tasks update in real-time, everywhere.", 
    color: "yellow" 
  },
  { 
    icon: Shield, 
    title: "Secure and Private", 
    description: "Enterprise-grade security keeps your academic work safe and confidential.", 
    color: "green" 
  },
  { 
    icon: BarChart3, 
    title: "Analytics and Insights", 
    description: "Understand your team's performance with detailed productivity reports and charts.", 
    color: "accent",
    span: true 
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="landing-features">
      <div className="landing-features-inner">
        <div className="landing-section-header">
          <span className="landing-section-badge">Features</span>
          <h2 className="landing-section-title">Everything You Need to Succeed</h2>
          <p className="landing-section-subtitle">
            Powerful features designed to help students and teams collaborate effectively.
          </p>
        </div>

        <div className="landing-features-grid">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`landing-feature-card ${feature.span ? "span-2" : ""}`}
            >
              <div className={`landing-feature-icon ${feature.color}`}>
                <feature.icon />
              </div>
              <h3 className="landing-feature-title">{feature.title}</h3>
              <p className="landing-feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== CTA SECTION ====================
function CTASection() {
  return (
    <section id="cta" className="landing-cta">
      <div className="landing-cta-bg" />
      <div className="landing-cta-content">
        <div className="landing-hero-badge">
          <Sparkles size={16} />
          <span>Free Forever for Students</span>
        </div>
        
        <h2 className="landing-cta-title">
          Ready to Transform Your{" "}
          <span className="landing-hero-gradient">Productivity?</span>
        </h2>
        
        <p className="landing-cta-subtitle">
          Join thousands of students and teams who are already managing their projects more effectively.
          No credit card required.
        </p>
        
        <Link to="/signup" className="landing-btn landing-btn-gradient landing-btn-large">
          Start For Free
          <ArrowRight size={18} />
        </Link>
        
        <div className="landing-cta-features">
          <div className="landing-cta-feature">
            
            
          </div>
          <div className="landing-cta-feature">
            
            
          </div>
          <div className="landing-cta-feature">
            
            
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== FOOTER ====================
const socialLinks = [
  { icon: Github, label: "GitHub", href: "https://github.com/chethanakash67" },
  { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/chethan-akash" },
];

const footerSections = [
  {
    title: "Contact",
    icon: Phone,
    items: [
      { label: "Phone", value: "8919870959", href: "tel:8919870959" },
      { label: "Email", value: "chethanakash67@gmail.com", href: "mailto:chethanakash67@gmail.com" },
      ],
  },
  {
    title: "About",
    icon: Info,
    items: [
      { label: "What is CampusTasks?", value: "A student-focused task manager for tracking assignments, deadlines, and team work in one clean workspace." },
      { label: "Who is it for?", value: "Built for students, project teams, and anyone who wants a simple way to stay organized during the semester." },
    ],
  },
  {
    title: "Help",
    icon: CircleHelp,
    items: [
      { label: "Need help?", value: "Use the contact details here for questions, project feedback, or collaboration." },
      { label: "Best way to reach out", value: "Email is best for detailed queries. Phone is useful for quick contact." },
    ],
  },
];

function Footer() {
  const [activeSection, setActiveSection] = useState(footerSections[0]);

  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <Link to="/" className="landing-logo">
              <div className="landing-logo-icon">
                <span>C</span>
              </div>
              <span className="landing-logo-text">
                CampusTasks<span className="landing-logo-dot">.</span>
              </span>
            </Link>
            <p>
              A simple task management workspace for students who want clarity, deadlines, and better collaboration.
            </p>
            <div className="landing-footer-social">
              {socialLinks.map((social, index) => (
                <a 
                  key={index} 
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label} 
                  className="landing-footer-social-link"
                >
                  <social.icon />
                </a>
              ))}
            </div>
          </div>

          <div className="landing-footer-details">
            <div className="landing-footer-options">
              {footerSections.map((section) => (
                <button
                  key={section.title}
                  type="button"
                  className={`landing-footer-option${activeSection.title === section.title ? " active" : ""}`}
                  onClick={() => setActiveSection(section)}
                >
                  <span className="landing-footer-option-title">
                    <section.icon size={16} />
                    {section.title}
                  </span>
                </button>
              ))}
            </div>

            <div className="landing-footer-card">
              <div className="landing-footer-card-header">
                <span className="landing-footer-card-icon">
                  <activeSection.icon size={18} />
                </span>
                <h4>{activeSection.title}</h4>
              </div>

              <div className="landing-footer-card-body">
                {activeSection.items.map((item) => (
                  <div key={item.label} className="landing-footer-detail-item">
                    <span className="landing-footer-detail-label">{item.label}</span>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p>{item.value}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <p>{new Date().getFullYear()} CampusTasks. All rights reserved.</p>
          <p>Built with care for students everywhere</p>
        </div>
      </div>
    </footer>
  );
}

// ==================== MAIN LANDING COMPONENT ====================
export default function Landing() {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <StatsSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
}
