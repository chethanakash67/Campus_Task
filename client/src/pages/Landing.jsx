// client/src/pages/Landing.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiCalendar, FiUsers } from 'react-icons/fi'; // Importing icons
import './Landing.css';

function Landing() {
  return (
    <div className="landing-page">
      {/* Background Overlay */}
      <div className="background-grid"></div>

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">CampusTasks<span className="dot">.</span></div>
        
        <div className="nav-links">
          <Link to="/login">
            <button className="btn btn-secondary">Login</button>
          </Link>
          <Link to="/signup">
            <button className="btn btn-primary">Sign Up</button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <div className="hero-content">
          <h1>
            Master Your Team Projects. <br /> 
            <span className="highlight">Simplify Collaboration.</span>
          </h1>
          <p>
            The ultimate task management tool designed for students and remote teams. 
            Track deadlines, assign responsibilities, and boost productivity.
          </p>
          <div className="cta-group">
            <Link to="/signup">
              <button className="btn btn-primary btn-large">Get Started Free</button>
            </Link>
          </div>
        </div>
      </header>

      {/* Feature Grid */}
      <section className="features">
          <div className="feature-card delay-1">
              <div className="icon-wrapper">
                <FiTrendingUp className="feature-icon" />
              </div>
              <h3>Track Progress</h3>
              <p>See who is doing what in real-time with our intuitive Kanban boards.</p>
          </div>
          <div className="feature-card delay-2">
              <div className="icon-wrapper">
                <FiCalendar className="feature-icon" />
              </div>
              <h3>Meet Deadlines</h3>
              <p>Automated reminders ensure you never miss an assignment submission again.</p>
          </div>
          <div className="feature-card delay-3">
              <div className="icon-wrapper">
                <FiUsers className="feature-icon" />
              </div>
              <h3>Teamwork Made Easy</h3>
              <p>Built specifically for student groups, hackathons, and remote squads.</p>
          </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} CampusTasks. Built for efficiency.</p>
      </footer>
    </div>
  );
}

export default Landing;