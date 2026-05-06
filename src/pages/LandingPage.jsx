import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';


const SpectraLogo = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3.34 7V17L12 22L20.66 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M12 2V7" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M3.34 7L7.67 9.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M20.66 7L16.33 9.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M3.34 17L7.67 14.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M20.66 17L16.33 14.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M12 22V17" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M12 7L16.33 9.5L12 12L7.67 9.5L12 7Z" fill="currentColor" fillOpacity="1.0" />
    <path d="M7.67 9.5V14.5L12 17V12L7.67 9.5Z" fill="currentColor" fillOpacity="0.7" />
    <path d="M16.33 9.5V14.5L12 17V12L16.33 9.5Z" fill="currentColor" fillOpacity="0.4" />
  </svg >
);

const FEATURES = [
  {
    title: 'Streaming Responses',
    desc: 'Watch answers appear token by token in real-time — fast, fluid, and alive.',
    badge: null,
  },
  {
    title: 'PDF Intelligence',
    desc: 'Upload any PDF and ask questions. Spectra reads, indexes, and answers with precision.',
    badge: { label: 'RAG', type: 'new' },
  },
  {
    title: 'YouTube Summarizer',
    desc: 'Paste any YouTube URL and get a structured summary in seconds.',
    badge: null,
  },
  {
    title: 'Conversation Memory',
    desc: 'Full context window — every conversation remembers what came before.',
    badge: null,
  },
  {
    title: 'Code Rendering',
    desc: 'Syntax-highlighted code blocks with one-click copy. 100+ languages.',
    badge: null,
  },
  {
    title: 'Light & Dark Mode',
    desc: 'Pixel-perfect themes that adapt to your environment and preference.',
    badge: null,
  },
];

const USECASES = [
  { title: 'Students', desc: 'Summarize papers, explain concepts, ace your studies.' },
  { title: 'Developers', desc: 'Debug code, architect systems, review pull requests.' },
  { title: 'Business', desc: 'Analyze reports, write proposals, extract insights.' },
  { title: 'Creators', desc: 'Draft content, brainstorm ideas, refine your writing.' },
];

const TESTIMONIALS = [
  {
    quote: '"Spectra AI completely changed how I study. I upload my lecture PDFs and just ask questions — it\'s like having a personal tutor that\'s read everything."',
    stars: '★★★★★', name: 'Priya S.', role: 'Computer Science Student',
  },
  {
    quote: '"The YouTube summarizer alone saves me hours every week. I can get the gist of any technical talk in under a minute."',
    stars: '★★★★★', name: 'Marcus T.', role: 'Software Engineer',
  },
  {
    quote: '"Clean, fast, and incredibly smart. The streaming responses feel like magic — it never just sits there loading."',
    stars: '★★★★★', name: 'Lena K.', role: 'Product Designer',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useChat();
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('features');
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navLinksRef = useRef([]);

  const handleStart = () => {
    navigate(isAuthenticated ? '/chat' : '/login');
  };

  const ctaLabel = isAuthenticated ? 'Go to Chat' : 'Try for free';

  useEffect(() => {
    // Enable scrolling on the body for the landing page
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';

    return () => {
      // Revert back when leaving the landing page
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      if (mobileMenuOpen) setMobileMenuOpen(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const options = {
      root: null,
      rootMargin: '-40% 0px -40% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, options);

    ['features', 'how', 'usecases'].forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const updatePill = () => {
      const activeIndex = ['features', 'how', 'usecases'].indexOf(activeSection);
      const activeEl = navLinksRef.current[activeIndex];
      if (activeEl) {
        setPillStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1
        });
      }
    };

    updatePill();
    window.addEventListener('resize', updatePill);
    // Also update after a short delay to account for potential layout shifts
    const timer = setTimeout(updatePill, 100);
    return () => {
      window.removeEventListener('resize', updatePill);
      clearTimeout(timer);
    };
  }, [activeSection]);

  const scrollTo = (e, id) => {
    if (e) e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const offset = 80; // Approximate navbar height
      const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Move focus to the section for accessibility
      el.focus({ preventScroll: true });

      setActiveSection(id);
      // Update hash in URL without jump
      window.history.pushState(null, null, `#${id}`);
    }
  };


  return (
    <div className="landing" data-theme={theme}>
      {/* ── NAVBAR ─────────────────────────────────── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="/" className="nav-logo">
          <SpectraLogo />
          <span className="nav-logo-name">Spectra AI</span>
        </a>

        <div className="nav-links-pill">
          {/* Sliding Background Pill */}
          <div className="nav-pill-bg" style={pillStyle} />

          <a href="#features"
            onClick={(e) => scrollTo(e, 'features')}
            ref={el => navLinksRef.current[0] = el}
            className={`nav-link-item ${activeSection === 'features' ? 'active' : ''}`}>
            Features
          </a>
          <a href="#how"
            onClick={(e) => scrollTo(e, 'how')}
            ref={el => navLinksRef.current[1] = el}
            className={`nav-link-item ${activeSection === 'how' ? 'active' : ''}`}>
            How it works
          </a>
          <a href="#usecases"
            onClick={(e) => scrollTo(e, 'usecases')}
            ref={el => navLinksRef.current[2] = el}
            className={`nav-link-item ${activeSection === 'usecases' ? 'active' : ''}`}>
            Use cases
          </a>
        </div>

        <div className="nav-actions">
          <button id="themeToggle" className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun sun-icon"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon moon-icon"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path></svg>
          </button>
          <button className="nav-cta desktop-only" onClick={handleStart}>
            {ctaLabel} →
          </button>
          <button
            id="mobileMenuBtn"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg>
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU OVERLAY ───────────────────────── */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-inner">
          <a
            href="#features"
            className={`mobile-nav-item ${activeSection === 'features' ? 'active' : ''}`}
            onClick={(e) => { scrollTo(e, 'features'); setMobileMenuOpen(false); }}
          >
            Features
          </a>
          <a
            href="#how"
            className={`mobile-nav-item ${activeSection === 'how' ? 'active' : ''}`}
            onClick={(e) => { scrollTo(e, 'how'); setMobileMenuOpen(false); }}
          >
            How it works
          </a>
          <a
            href="#usecases"
            className={`mobile-nav-item ${activeSection === 'usecases' ? 'active' : ''}`}
            onClick={(e) => { scrollTo(e, 'usecases'); setMobileMenuOpen(false); }}
          >
            Use cases
          </a>
          <div className="mobile-menu-footer">
            <button className="nav-cta" style={{ width: '100%', marginTop: '8px' }} onClick={handleStart}>
              {ctaLabel} →
            </button>
          </div>
        </div>
      </div>

      {/* ── HERO ───────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="hero-grid" />
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Now with RAG • PDF Intelligence • YouTube Summarizer
          </div>

          <h1 className="hero-headline">
            The AI that{' '}
            <span className="gradient-text">thinks faster</span>
            <br />than you can type
          </h1>

          <p className="hero-sub">
            Spectra AI combines blazing-fast streaming chat, document intelligence,
            and multimodal understanding in one premium experience.
          </p>

          <div className="hero-actions">
            <button className="hero-cta" onClick={handleStart}>
              {ctaLabel} <SpectraLogo size={16} />
            </button>
            <a href="#features" className="hero-secondary">
              See what it can do
            </a>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">100ms</div>
              <div className="hero-stat-label">First token latency</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">∞</div>
              <div className="hero-stat-label">Conversation context</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">3</div>
              <div className="hero-stat-label">Specialized AI modes</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">100%</div>
              <div className="hero-stat-label">Local & private</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO PREVIEW ──────────────────────────── */}
      <section className="demo-section">
        <div className="demo-window">
          <div className="demo-titlebar">
            <div className="demo-dot red" />
            <div className="demo-dot yellow" />
            <div className="demo-dot green" />
            <div className="demo-url">spectra-ai.local — Chat</div>
          </div>
          <div className="demo-body">
            <div className="demo-sidebar-mock">
              <div className="demo-sidebar-item" style={{ height: '32px', width: '80%' }} />
              <div className="demo-sidebar-item active" />
              <div className="demo-sidebar-item" />
              <div className="demo-sidebar-item" />
              <div className="demo-sidebar-item" />
            </div>
            <div className="demo-chat-mock">
              <div className="demo-msg user" style={{ animationDelay: '0.1s' }}>
                <div className="demo-msg-avatar" />
                <div className="demo-msg-bubble">
                  Explain the difference between RAG and fine-tuning for LLMs
                </div>
              </div>
              <div className="demo-msg ai" style={{ animationDelay: '0.4s' }}>
                <div className="demo-msg-avatar" />
                <div className="demo-msg-bubble">
                  Great question! RAG (Retrieval-Augmented Generation) and fine-tuning are both techniques to improve LLM outputs, but they work very differently…
                </div>
              </div>
              <div className="demo-msg user" style={{ animationDelay: '0.7s' }}>
                <div className="demo-msg-avatar" />
                <div className="demo-msg-bubble">Which is better for a knowledge base?</div>
              </div>
              <div className="demo-msg ai" style={{ animationDelay: '1s' }}>
                <div className="demo-msg-avatar" />
                <div className="demo-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────── */}
      <section className="features-section" id="features" tabIndex="-1">
        <div className="section-label">Capabilities</div>
        <h2 className="section-title">
          Everything you need,<br />
          <span className="gradient-text">nothing you don't</span>
        </h2>
        <p className="section-sub">
          Built from the ground up for speed, intelligence, and delight.
        </p>

        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div className="feature-card fade-up" key={i}
              style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
              {f.badge && (
                <span className={`feature-badge ${f.badge.type}`}>{f.badge.label}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────── */}
      <section className="how-section" id="how" tabIndex="-1">
        <div className="how-inner">
          <div className="section-label">Process</div>
          <h2 className="section-title">How it works</h2>
          <p className="section-sub">
            Three steps from thought to answer — no setup, no waiting.
          </p>
          <div className="how-steps">
            <div className="how-step">
              <div className="how-step-num">1</div>
              <div className="how-step-title">Type your prompt</div>
              <div className="how-step-desc">Ask anything — a question, a task, a document to analyse, or a YouTube link to summarise.</div>
            </div>
            <div className="how-step">
              <div className="how-step-num">2</div>
              <div className="how-step-title">AI processes instantly</div>
              <div className="how-step-desc">Spectra routes your request to the best model — chat, RAG, or video summarisation — and starts streaming immediately.</div>
            </div>
            <div className="how-step">
              <div className="how-step-num">3</div>
              <div className="how-step-title">Get a rich response</div>
              <div className="how-step-desc">Markdown, code blocks, tables, citations — answers are formatted beautifully and ready to use.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USE CASES ─────────────────────────────── */}
      <section className="usecases-section" id="usecases" tabIndex="-1">
        <div className="section-label">Who it's for</div>
        <h2 className="section-title">Built for <span className="gradient-text">everyone</span></h2>
        <p className="section-sub">From students to senior engineers — Spectra adapts to what you need.</p>

        <div className="usecases-grid">
          {USECASES.map((u, i) => (
            <div className="usecase-card" key={i}>
              <div className="usecase-title">{u.title}</div>
              <div className="usecase-desc">{u.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────── */}
      <section className="testimonials-section">
        <div className="testimonials-inner">
          <div className="section-label">Testimonials</div>
          <h2 className="section-title">Loved by builders</h2>
          <p className="section-sub">Real people. Real results.</p>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div className="testimonial-card" key={i}>
                <div className="testimonial-stars">{t.stars}</div>
                <div className="testimonial-quote">{t.quote}</div>
                <div className="testimonial-author">
                  <div className="testimonial-author-info">
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ────────────────────────────── */}
      <section className="bottom-cta-section">
        <div className="bottom-cta-bg" />
        <h2 className="bottom-cta-title">
          Ready to think<br />
          <span className="gradient-text">at light speed?</span>
        </h2>
        <p className="bottom-cta-sub">Start your first conversation in seconds. Free account included.</p>
        <div className="bottom-cta-actions">
          <button className="hero-cta" onClick={handleStart}>
            {ctaLabel} <SpectraLogo size={16} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div>
            <a href="/" className="nav-logo" style={{ textDecoration: 'none' }}>
              <SpectraLogo />
              <span className="nav-logo-name">Spectra AI</span>
            </a>
            <p className="footer-brand-desc">
              A premium AI assistant powered by local LLMs, RAG pipelines, and streaming inference.
            </p>
          </div>
          <div>
            <div className="footer-col-title">Product</div>
            <div className="footer-links">
              <a href="#features" className="footer-link" onClick={(e) => scrollTo(e, 'features')}>Features</a>
              <a href="#how" className="footer-link" onClick={(e) => scrollTo(e, 'how')}>How it works</a>
              <a href="#usecases" className="footer-link" onClick={(e) => scrollTo(e, 'usecases')}>Use cases</a>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Legal</div>
            <div className="footer-links">
              <a href="#" className="footer-link">Privacy Policy</a>
              <a href="#" className="footer-link">Terms of Service</a>
              <a href="#" className="footer-link">Cookie Policy</a>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <div className="footer-links">
              <a href="#" className="footer-link">About</a>
              <a href="#" className="footer-link">Blog</a>
              <a href="#" className="footer-link">Contact</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Spectra AI. All rights reserved.</span>
          <div className="footer-social">
            <a href="#" title="Twitter">𝕏</a>
            <a href="#" title="GitHub">⌥</a>
            <a href="#" title="Discord">◆</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
