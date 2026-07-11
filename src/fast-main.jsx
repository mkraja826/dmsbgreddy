import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './public-site-v2.css';

const phone = '+91 98493 26242';
const phoneDigits = '919849326242';
const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=Sri%20B.G%20Reddy%20Dental%20Clinic&query_place_id=ChIJu7OqUvuOyzsRp7eapGfA-6I';
const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent('Hello Sri B.G Reddy Dental Clinic, I would like to book a dental appointment.')}`;

const treatments = [
  { icon: 'braces', title: 'Braces & alignment', desc: 'Orthodontic planning for crowding, gaps and bite concerns with clear follow-up guidance.' },
  { icon: 'root', title: 'Root canal treatment', desc: 'Focused pain relief, tooth-saving care and suitable crown planning after treatment.' },
  { icon: 'crown', title: 'Crowns & bridges', desc: 'Restorations planned for strength, function and a natural-looking smile.' },
  { icon: 'implant', title: 'Implants & dentures', desc: 'Practical replacement options for missing teeth based on comfort and long-term function.' },
  { icon: 'extract', title: 'Gentle extraction', desc: 'Careful tooth removal with simple explanations and after-care instructions.' },
  { icon: 'clean', title: 'Cleaning & gum care', desc: 'Scaling, polishing and preventive guidance for healthier gums and fresher breath.' },
  { icon: 'check', title: 'Checkups & fillings', desc: 'Routine examinations, X-rays, fillings and family dental care in one place.' },
];

const reviews = [
  { name: 'Thatikonda Suhitha', text: 'Great services. Doctors are patient and considerate. Services are affordable compared to other clinics.' },
  { name: 'Sanjeeva Reddy', text: 'RCT by Dr. Rajashekar Reddy with patience, good treatment and affordable cost.' },
  { name: 'Mihir', text: 'Reasonably priced and painless. RCT capping completed in two visits including measurements.' },
  { name: 'Rambabu Latchireddi', text: 'Front tooth post and core treatment done. Ceramic cap provided and fully satisfied.' },
];

const gallery = [
  { img: '/gallery/gallery-1.svg', title: 'Clinic entrance', alt: 'Entrance of Sri B.G Reddy Dental Clinic' },
  { img: '/gallery/gallery-2.svg', title: 'Treatment room', alt: 'Dental treatment room at the clinic' },
  { img: '/gallery/gallery-3.svg', title: 'Dental equipment', alt: 'Dental equipment used at the clinic' },
  { img: '/gallery/gallery-4.svg', title: 'Sterilization care', alt: 'Sterilization and hygiene area' },
  { img: '/gallery/gallery-5.svg', title: 'Reception', alt: 'Clinic reception area' },
  { img: '/gallery/gallery-6.svg', title: 'Smile care', alt: 'Dental smile care setup' },
];

const faqs = [
  ['How do I book an appointment?', 'Use the WhatsApp booking button or call the clinic. Share the patient name, mobile number and main dental concern so the team can confirm a suitable slot.'],
  ['Can I visit for tooth pain or an emergency?', 'Call the clinic directly and explain the symptoms. The team can guide you on the earliest suitable consultation.'],
  ['What treatments are available?', 'The clinic provides dental checkups, fillings, cleaning, root canal treatment, crowns, braces, extraction, implants and denture support.'],
  ['Where is the clinic located?', 'Sri B.G Reddy Dental Clinic is at BGR Arcade, Gandi Maisamma X Road, D.P. Pally Village, Hyderabad, Telangana 500043.'],
  ['What should I bring for my visit?', 'Bring any previous prescriptions, dental X-rays, medical history details and a list of medicines currently being taken.'],
];

function Icon({ name, size = 24 }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    braces: <><path d="M8 4c-2.6 1-4 3.7-3.6 7.1.4 3.8 2.3 8.4 4.6 8.4 1.3 0 1.7-2.4 3-2.4s1.7 2.4 3 2.4c2.3 0 4.2-4.6 4.6-8.4C20 7.7 18.6 5 16 4c-1.6-.6-2.7.5-4 .5S9.6 3.4 8 4Z"/><path d="M6.3 10.5h11.4M8 9v3M12 9v3M16 9v3"/></>,
    root: <><path d="M8 4c-2.8 1.1-4.1 4.1-3.4 7.5.7 3.2 2.4 8 4.5 8 1.1 0 1.5-3.1 2.9-3.1s1.8 3.1 2.9 3.1c2.1 0 3.8-4.8 4.5-8C20.1 8.1 18.8 5.1 16 4c-1.5-.6-2.5.5-4 .5S9.5 3.4 8 4Z"/><path d="M12 7v6m0 0-2 2m2-2 2 2"/></>,
    crown: <><path d="m5 8 3 3 4-6 4 6 3-3-1.5 10h-11L5 8Z"/><path d="M7 21h10"/></>,
    implant: <><path d="M9 3h6l1 4-2 3v8l-2 3-2-3v-8L8 7l1-4Z"/><path d="M9 6h6m-5 7h4m-4 3h4"/></>,
    extract: <><path d="M8 4c-2.7 1-4 3.8-3.4 7.3.6 3.5 2.3 8.2 4.5 8.2 1.1 0 1.6-2.9 2.9-2.9s1.8 2.9 2.9 2.9c2.2 0 3.9-4.7 4.5-8.2C20 7.8 18.7 5 16 4c-1.5-.6-2.5.5-4 .5S9.5 3.4 8 4Z"/><path d="m8.5 8 7 7m0-7-7 7"/></>,
    clean: <><path d="M12 3c3.7 4.2 5.5 7.1 5.5 9.5a5.5 5.5 0 1 1-11 0C6.5 10.1 8.3 7.2 12 3Z"/><path d="M9.5 13.5c.6 1.2 1.5 1.8 2.8 1.8"/></>,
    check: <><path d="M8 4c-2.7 1-4 3.8-3.4 7.3.6 3.5 2.3 8.2 4.5 8.2 1.1 0 1.6-2.9 2.9-2.9s1.8 2.9 2.9 2.9c2.2 0 3.9-4.7 4.5-8.2C20 7.8 18.7 5 16 4c-1.5-.6-2.5.5-4 .5S9.5 3.4 8 4Z"/><path d="m8.5 11.5 2.2 2.2 4.8-5"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    explain: <><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8m-8 3h5"/></>,
    equipment: <><path d="M7 3h10v5H7zM9 8v5a3 3 0 0 0 6 0V8M6 21h12M12 16v5"/></>,
    family: <><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c.4-4 2.2-6 5-6s4.6 2 5 6M11 20c.3-3.3 2-5 5-5 2.7 0 4.4 1.7 5 5"/></>,
    map: <><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></>,
    phone: <><path d="M6.6 3h3l1.5 4-2 1.6a14 14 0 0 0 6.3 6.3l1.6-2 4 1.5v3c0 1.7-1.3 3-3 3C9.7 20.4 3.6 14.3 3.6 6a3 3 0 0 1 3-3Z"/></>,
    whatsapp: <><path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z"/><path d="M9 8.5c.7 2.8 2.2 4.3 5 5"/></>,
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...common}>{paths[name] || paths.check}</svg>;
}

function ClinicLogo({ large = false }) {
  return <img className={large ? 'site-logo large' : 'site-logo'} src="/assets/logo-icon.png" alt="Sri B.G Reddy Dental Clinic logo" width={large ? 72 : 46} height={large ? 72 : 46} />;
}

function Header({ onOpenPortal }) {
  const [open, setOpen] = useState(false);
  const nav = [
    ['treatments', 'Treatments'],
    ['doctor', 'Doctor'],
    ['clinic', 'Clinic'],
    ['reviews', 'Reviews'],
    ['contact', 'Contact'],
  ];
  const go = (id) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  return (
    <header className="site-header">
      <div className="site-nav container">
        <button className="site-brand" type="button" onClick={() => go('home')} aria-label="Go to homepage">
          <ClinicLogo />
          <span><strong>BG Reddy</strong><small>Dental Clinic</small></span>
        </button>

        <nav className={open ? 'site-menu open' : 'site-menu'} aria-label="Main navigation">
          {nav.map(([id, label]) => <button key={id} type="button" onClick={() => go(id)}>{label}</button>)}
          <button className="owner-link mobile-owner" type="button" onClick={onOpenPortal}>Owner portal</button>
        </nav>

        <div className="nav-actions">
          <button className="owner-link desktop-owner" type="button" onClick={onOpenPortal}>Owner portal</button>
          <a className="nav-book" href={whatsappUrl} target="_blank" rel="noreferrer">Book appointment</a>
          <button className="menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open}>{open ? '×' : '☰'}</button>
        </div>
      </div>
    </header>
  );
}

function ToothVisual() {
  return (
    <div className="hero-visual-card" aria-label="Dental care illustration">
      <div className="visual-glow" />
      <svg className="tooth-illustration" viewBox="0 0 360 360" role="img" aria-label="Illustration of a healthy tooth">
        <defs>
          <linearGradient id="toothFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#dff1ff" />
          </linearGradient>
          <linearGradient id="toothStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0b6fd3" />
            <stop offset="1" stopColor="#14a7b8" />
          </linearGradient>
          <filter id="toothShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#0b2d64" floodOpacity="0.18" />
          </filter>
        </defs>
        <circle cx="180" cy="180" r="142" fill="#edf7ff" />
        <circle cx="180" cy="180" r="112" fill="#ffffff" opacity="0.72" />
        <path d="M120 76c-34 17-48 56-37 100 10 41 28 112 59 112 18 0 21-51 38-51s20 51 38 51c31 0 49-71 59-112 11-44-3-83-37-100-23-12-39 8-60 8s-37-20-60-8Z" fill="url(#toothFill)" stroke="url(#toothStroke)" strokeWidth="8" filter="url(#toothShadow)" />
        <path d="M126 116c20 13 88 13 108 0" fill="none" stroke="#9fd0f5" strokeWidth="7" strokeLinecap="round" />
        <path d="m148 166 22 22 44-51" fill="none" stroke="#0e9f6e" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="visual-note top"><span><Icon name="shield" size={18} /></span><div><strong>Quality-first care</strong><small>Clean clinical workflow</small></div></div>
      <div className="visual-note bottom"><span><Icon name="explain" size={18} /></span><div><strong>Clear explanations</strong><small>Understand each next step</small></div></div>
    </div>
  );
}

function Hero() {
  return (
    <section id="home" className="hero-section">
      <div className="container hero-grid">
        <div className="hero-copy">
          <a className="rating-pill" href={mapsUrl} target="_blank" rel="noreferrer"><span>★★★★★</span><strong>4.9 rating</strong><small>308 Google reviews</small></a>
          <p className="eyebrow">Trusted dental care in Gandimaisamma</p>
          <h1>Comfortable dental care with clear, honest guidance.</h1>
          <p className="hero-lead">From tooth pain and root canal treatment to braces, crowns and family checkups—get careful treatment planning, modern equipment and a calm clinic experience.</p>
          <div className="hero-actions">
            <a className="button primary" href={whatsappUrl} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={20} /> Book on WhatsApp</a>
            <a className="button secondary" href={`tel:${phoneDigits}`}><Icon name="phone" size={20} /> Call {phone}</a>
          </div>
          <div className="treatment-chips" aria-label="Popular treatments"><span>Tooth pain</span><span>Root canal</span><span>Braces</span><span>Crowns</span></div>
          <div className="hero-assurance"><div><Icon name="shield" size={20} /><span><strong>Hygiene focused</strong><small>Clean clinical workflow</small></span></div><div><Icon name="explain" size={20} /><span><strong>Patient-first</strong><small>Simple treatment explanations</small></span></div></div>
        </div>
        <ToothVisual />
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="trust-section" aria-label="Clinic trust indicators">
      <div className="container trust-grid">
        <a href={mapsUrl} target="_blank" rel="noreferrer"><strong>4.9</strong><span>Google rating</span></a>
        <a href={mapsUrl} target="_blank" rel="noreferrer"><strong>308</strong><span>Patient reviews</span></a>
        <div><strong>Modern</strong><span>Dental equipment</span></div>
        <div><strong>Local</strong><span>Gandimaisamma care</span></div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, text, centered = false }) {
  return <div className={centered ? 'section-heading centered' : 'section-heading'}><span>{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}

function Treatments() {
  return (
    <section id="treatments" className="section treatments-section">
      <div className="container">
        <SectionHeading eyebrow="Treatments" title="Complete dental care for everyday needs." text="Get practical treatment options explained clearly, with a focus on comfort, function and long-term oral health." />
        <div className="treatment-grid">
          {treatments.map((item) => <article className="treatment-card" key={item.title}><div className="treatment-icon"><Icon name={item.icon} size={27} /></div><h3>{item.title}</h3><p>{item.desc}</p><a href={whatsappUrl} target="_blank" rel="noreferrer">Ask about treatment <Icon name="arrow" size={16} /></a></article>)}
        </div>
      </div>
    </section>
  );
}

function DoctorSection() {
  return (
    <section id="doctor" className="section doctor-section">
      <div className="container doctor-grid">
        <div className="doctor-visual">
          <img src="/gallery/gallery-2.svg" alt="Treatment room at Sri B.G Reddy Dental Clinic" loading="lazy" decoding="async" />
          <div className="doctor-name-card"><ClinicLogo /><div><small>Doctor-led care</small><strong>Dr. Rajashekar Reddy</strong><span>Sri B.G Reddy Dental Clinic</span></div></div>
        </div>
        <div className="doctor-copy">
          <SectionHeading eyebrow="Meet the dentist" title="Care that starts with listening." text="Dr. Rajashekar Reddy leads the clinic with a simple approach: understand the patient’s concern, explain the available options and plan treatment carefully." />
          <div className="principle-list">
            <div><span><Icon name="explain" size={22} /></span><div><strong>Clear treatment discussion</strong><p>Questions are encouraged so patients understand the reason, process and next step.</p></div></div>
            <div><span><Icon name="equipment" size={22} /></span><div><strong>Quality-focused planning</strong><p>Modern clinical tools and suitable materials support precise, dependable care.</p></div></div>
            <div><span><Icon name="family" size={22} /></span><div><strong>Comfort for every age</strong><p>A calm environment for adults, older patients and family dental visits.</p></div></div>
          </div>
          <div className="inline-actions"><a className="button primary" href={whatsappUrl} target="_blank" rel="noreferrer">Book a consultation</a><a className="text-link" href={mapsUrl} target="_blank" rel="noreferrer">See clinic location <Icon name="arrow" size={16} /></a></div>
        </div>
      </div>
    </section>
  );
}

function QualitySection() {
  const points = [
    ['shield', 'Hygiene and sterilization', 'A clean clinical flow with careful instrument handling and an organized treatment environment.'],
    ['equipment', 'Modern dental equipment', 'Equipment selected to support diagnosis, treatment planning and patient comfort.'],
    ['explain', 'Simple explanations', 'Treatment choices, costs and follow-up steps discussed in understandable language.'],
    ['check', 'Continuity of care', 'Records, prescriptions, X-rays and follow-up plans kept together for easier future visits.'],
  ];
  return (
    <section id="clinic" className="section quality-section">
      <div className="container">
        <SectionHeading eyebrow="Why choose us" title="A clinic experience built around trust." text="The goal is not only to treat a tooth—it is to make every visit clear, comfortable and well organized." centered />
        <div className="quality-grid">{points.map(([icon, title, desc]) => <article key={title}><span><Icon name={icon} size={25} /></span><h3>{title}</h3><p>{desc}</p></article>)}</div>
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section id="gallery" className="section gallery-section">
      <div className="container">
        <SectionHeading eyebrow="Inside the clinic" title="A clean space for focused dental care." text="Explore the clinic environment, equipment and patient-care areas before your visit." />
        <div className="gallery-grid">{gallery.map((item, index) => <figure key={item.title} className={index === 0 ? 'feature' : ''}><img src={item.img} alt={item.alt} width="900" height="650" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" /><figcaption>{item.title}</figcaption></figure>)}</div>
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section id="reviews" className="section reviews-section">
      <div className="container">
        <div className="review-heading-row"><SectionHeading eyebrow="Patient reviews" title="Trusted for calm, clear treatment." text="Feedback from patients who visited Sri B.G Reddy Dental Clinic." /><a className="button secondary" href={mapsUrl} target="_blank" rel="noreferrer">View on Google <Icon name="arrow" size={17} /></a></div>
        <div className="review-grid">{reviews.map((review) => <article className="review-card" key={review.name}><div className="review-stars" aria-label="5 star review">★★★★★</div><p>“{review.text}”</p><div><span>{review.name.slice(0, 1)}</span><strong>{review.name}<small>Google review</small></strong></div></article>)}</div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="section faq-section">
      <div className="container faq-grid">
        <SectionHeading eyebrow="Helpful information" title="Before your visit." text="Quick answers to common appointment and treatment questions." />
        <div className="faq-list">{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', treatment: '', concern: '' });

  function submit(event) {
    event.preventDefault();
    const message = `Hello Sri B.G Reddy Dental Clinic, I would like to book an appointment.\n\nPatient name: ${form.name}\nMobile: ${form.phone}\nTreatment: ${form.treatment || 'Not selected'}\nConcern: ${form.concern || 'Not mentioned'}`;
    setSent(true);
    window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <section id="contact" className="section contact-section">
      <div className="container contact-shell">
        <div className="contact-copy">
          <span className="eyebrow light">Book an appointment</span>
          <h2>Tell us what is troubling you.</h2>
          <p>Share the patient details and dental concern. WhatsApp will open with a ready-to-send appointment request.</p>
          <div className="contact-cards">
            <a href={`tel:${phoneDigits}`}><span><Icon name="phone" size={20} /></span><div><small>Call clinic</small><strong>{phone}</strong></div></a>
            <a href={mapsUrl} target="_blank" rel="noreferrer"><span><Icon name="map" size={20} /></span><div><small>Clinic address</small><strong>BGR Arcade, Gandi Maisamma X Road</strong></div></a>
          </div>
        </div>
        <form className="appointment-form" onSubmit={submit}>
          <div className="form-row"><label>Patient name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" required /></label><label>Mobile number<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} inputMode="tel" autoComplete="tel" required /></label></div>
          <label>Treatment concern<select value={form.treatment} onChange={(event) => setForm({ ...form, treatment: event.target.value })} required><option value="" disabled>Select a treatment</option><option>Dental checkup</option><option>Tooth pain / root canal</option><option>Braces / alignment</option><option>Crown / cap</option><option>Extraction</option><option>Implant / denture</option><option>Cleaning / gum care</option><option>Other</option></select></label>
          <label>Tell us the concern<textarea rows="4" value={form.concern} onChange={(event) => setForm({ ...form, concern: event.target.value })} placeholder="Example: tooth pain for two days, swelling, broken tooth…" /></label>
          <button className="button primary full" type="submit"><Icon name="whatsapp" size={20} /> Request appointment on WhatsApp</button>
          {sent && <p className="form-success" role="status">WhatsApp opened with your appointment details.</p>}
        </form>
      </div>
    </section>
  );
}

function Footer({ onOpenPortal }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand"><ClinicLogo large /><div><strong>Sri B.G Reddy Dental Clinic</strong><p>Patient-first dental care in Gandimaisamma, Hyderabad.</p></div></div>
        <div><h3>Visit the clinic</h3><p>BGR Arcade, 3-93-4/D, Gandi Maisamma X Road, D.P. Pally Village, Hyderabad, Telangana 500043</p><a href={mapsUrl} target="_blank" rel="noreferrer">Open Google Maps <Icon name="arrow" size={15} /></a></div>
        <div><h3>Contact</h3><a href={`tel:${phoneDigits}`}>{phone}</a><a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp appointment</a><button type="button" onClick={onOpenPortal}>Clinic owner portal</button></div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} Sri B.G Reddy Dental Clinic</span><span>Dental care with clarity and trust.</span></div>
    </footer>
  );
}

function MobileActions() {
  return <div className="mobile-actions" aria-label="Quick clinic actions"><a href={`tel:${phoneDigits}`}><Icon name="phone" size={19} /><span>Call</span></a><a className="primary" href={whatsappUrl} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={19} /><span>Book</span></a><a href={mapsUrl} target="_blank" rel="noreferrer"><Icon name="map" size={19} /><span>Directions</span></a></div>;
}

function FastApp() {
  function openPortal() {
    window.location.hash = 'dms';
    window.location.reload();
  }

  return (
    <>
      <Header onOpenPortal={openPortal} />
      <main><Hero /><TrustStrip /><Treatments /><DoctorSection /><QualitySection /><Gallery /><Reviews /><Faq /><Contact /></main>
      <Footer onOpenPortal={openPortal} />
      <MobileActions />
    </>
  );
}

createRoot(document.getElementById('root')).render(<FastApp />);
