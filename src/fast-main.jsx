import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const phone = '+91 98493 26242';
const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=Sri%20B.G%20Reddy%20Dental%20Clinic&query_place_id=ChIJu7OqUvuOyzsRp7eapGfA-6I';

const reviews = [
  { name: 'Thatikonda Suhitha', text: 'Great services. Doctors are patient and considerate. Services are affordable compared to other clinics.' },
  { name: 'Sanjeeva Reddy', text: 'RCT by Dr. Rajashekar Reddy with patience, good treatment and affordable cost.' },
  { name: 'Mihir', text: 'Reasonably priced and painless. RCT capping completed in two visits including measurements.' },
  { name: 'Rambabu Latchireddi', text: 'Front tooth post and core treatment done. Ceramic cap provided and fully satisfied.' }
];

const gallery = [
  { img: '/gallery/gallery-1.svg', title: 'Clinic entrance' },
  { img: '/gallery/gallery-2.svg', title: 'Treatment room' },
  { img: '/gallery/gallery-3.svg', title: 'Dental equipment' },
  { img: '/gallery/gallery-4.svg', title: 'Sterilization care' },
  { img: '/gallery/gallery-5.svg', title: 'Reception' },
  { img: '/gallery/gallery-6.svg', title: 'Smile care' }
];

const serviceHighlights = [
  { title: 'Smile Alignment', desc: 'Braces and orthodontic correction for crowding, gaps, bite issues and long-term smile balance.', icon: '😁' },
  { title: 'Root Canal Relief', desc: 'Calm, precise RCT care for tooth pain with clear explanation and quality capping options.', icon: '🦷' },
  { title: 'Crowns & Bridges', desc: 'Ceramic caps, crowns and bridges planned for strength, clean appearance and chewing comfort.', icon: '✨' },
  { title: 'Gentle Extraction', desc: 'Tooth removal handled with careful guidance, patient comfort and simple after-care instructions.', icon: '🛡️' },
  { title: 'Implants & Dentures', desc: 'Missing-tooth replacement planning with modern implant and denture support.', icon: '🔩' },
  { title: 'Gum Care & Cleaning', desc: 'Scaling, polishing and oral hygiene support for fresh breath and healthy gums.', icon: '💧' },
  { title: 'Checkups & Fillings', desc: 'Routine exams, X-rays, fillings and practical treatment advice for every family member.', icon: '✅' }
];

const qualityPoints = [
  'Modern equipment and digital-ready records',
  'Sterilized instruments and clean clinical flow',
  'Clear planning for RCT, crowns, braces and extraction',
  'Private owner login for clinic records and reports'
];

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src^="${src.split('?')[0]}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = resolve;
    script.onerror = resolve;
    document.body.appendChild(script);
  });
}

function ClinicLogo({ large = false }) {
  const size = large ? 72 : 48;
  return (
    <img
      className={`logo-img real-clinic-logo${large ? ' large' : ''}`}
      src="/assets/logo-icon.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      decoding="async"
      loading="eager"
    />
  );
}

function MolarFallback() {
  return (
    <div className="tooth-model" aria-hidden="true">
      <div className="tooth-shadow"></div>
      <div className="tooth-backdrop"></div>
      <div className="molar-crown">
        <span className="molar-cusp cusp-one"></span>
        <span className="molar-cusp cusp-two"></span>
        <span className="molar-cusp cusp-three"></span>
        <span className="molar-cusp cusp-four"></span>
        <span className="molar-groove groove-one"></span>
        <span className="molar-groove groove-two"></span>
        <span className="molar-groove groove-three"></span>
        <span className="molar-gloss"></span>
        <span className="molar-blue-mark"></span>
      </div>
      <div className="molar-roots">
        <span className="molar-root root-left"></span>
        <span className="molar-root root-center"></span>
        <span className="molar-root root-right"></span>
      </div>
    </div>
  );
}

function RotatingMolar() {
  const mountRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    let cancelled = false;
    let started = false;
    let frameId = 0;
    let renderer;
    let model;
    let scene;
    let camera;
    let resizeObserver;

    const disposeObject = (object) => {
      object?.traverse?.((child) => {
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) child.material.forEach((material) => material?.dispose?.());
        else child.material?.dispose?.();
      });
    };

    const start = async () => {
      if (started || cancelled) return;
      started = true;

      await new Promise((resolve) => {
        if ('requestIdleCallback' in window) window.requestIdleCallback(resolve, { timeout: 1800 });
        else window.setTimeout(resolve, 700);
      });

      if (cancelled || !mount.isConnected) return;

      try {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

        if (cancelled || !mount.isConnected) return;

        const width = Math.max(280, mount.clientWidth || 420);
        const height = Math.max(280, mount.clientHeight || 420);

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
        renderer.setSize(width, height, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        mount.innerHTML = '';
        mount.appendChild(renderer.domElement);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
        camera.position.set(0, 0.1, 4.2);

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
        keyLight.position.set(2.6, 3.2, 4.6);
        scene.add(keyLight);
        scene.add(new THREE.AmbientLight(0xdff4ff, 1.35));

        const loader = new GLTFLoader();
        loader.load('/assets/dent-molaire-hero.glb?v=100kb', (gltf) => {
          if (cancelled) return;

          model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              child.frustumCulled = true;
              child.material = new THREE.MeshStandardMaterial({
                color: 0xf7fcff,
                roughness: 0.25,
                metalness: 0.02,
                emissive: 0x08223c,
                emissiveIntensity: 0.015
              });
            }
          });

          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxAxis = Math.max(size.x, size.y, size.z) || 1;
          model.position.sub(center);
          model.scale.setScalar(2.35 / maxAxis);
          model.rotation.x = -0.08;
          scene.add(model);
          setLoaded(true);

          const render = () => {
            if (cancelled) return;
            if (!document.hidden && model) model.rotation.y += 0.008;
            renderer.render(scene, camera);
            frameId = window.requestAnimationFrame(render);
          };

          render();
        }, undefined, () => {
          setLoaded(false);
        });

        resizeObserver = new ResizeObserver(() => {
          if (!renderer || !camera || !mount.clientWidth || !mount.clientHeight) return;
          const nextWidth = Math.max(280, mount.clientWidth);
          const nextHeight = Math.max(280, mount.clientHeight);
          renderer.setSize(nextWidth, nextHeight, false);
          camera.aspect = nextWidth / nextHeight;
          camera.updateProjectionMatrix();
        });
        resizeObserver.observe(mount);
      } catch {
        setLoaded(false);
      }
    };

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            start();
          }
        }, { rootMargin: '220px 0px' })
      : null;

    if (observer) observer.observe(mount);
    else start();

    return () => {
      cancelled = true;
      observer?.disconnect();
      resizeObserver?.disconnect?.();
      if (frameId) window.cancelAnimationFrame(frameId);
      disposeObject(model);
      renderer?.dispose?.();
      if (mount) mount.innerHTML = '';
    };
  }, []);

  return (
    <div className={`molar-model-wrap fast-rotating-molar ${loaded ? 'is-loaded' : 'is-failed'}`}>
      <div ref={mountRef} className="molar-canvas rotating-molar-canvas" aria-hidden="true"></div>
      <div className="molar-model-fallback"><MolarFallback /></div>
    </div>
  );
}

function Header({ onOpenPortal }) {
  const [open, setOpen] = useState(false);
  const nav = ['services', 'quality', 'gallery', 'reviews', 'appointment'];
  const go = (id) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="topbar">
      <div className="nav-shell">
        <button className="brand" onClick={() => go('home')} aria-label="Sri B.G Reddy Dental Clinic home">
          <ClinicLogo />
          <span><b>BG Reddy</b><small>Dental Clinic</small></span>
        </button>

        <nav className={open ? 'nav-menu show' : 'nav-menu'} aria-label="Main navigation">
          {nav.map((n) => <button key={n} type="button" onClick={() => go(n)}>{n}</button>)}
          <button type="button" onClick={onOpenPortal}>Clinic Login</button>
        </nav>

        <button className="desktop-call" type="button" onClick={onOpenPortal}>Clinic Login</button>
        <button className="hamb" type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? '×' : '☰'}</button>
      </div>
    </header>
  );
}

function Hero({ onOpenPortal }) {
  return (
    <section id="home" className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="pill">4.9 Google rating | 308 reviews</div>
          <h1>Modern dental care with a clinical 3D edge.</h1>
          <p className="lead">Sri B.G Reddy Dental Clinic brings precise treatment planning, clean clinical systems and patient-first dental care to Gandimaisamma.</p>
          <div className="hero-actions">
            <a className="btn primary" href={`tel:${phone}`}>Call Clinic</a>
            <a className="btn ghost" href="#appointment">Book Appointment</a>
            <button className="btn dark" type="button" onClick={onOpenPortal}>Owner Login</button>
          </div>
          <div className="quick-grid" aria-label="Popular treatments">
            <span>Braces</span><span>RCT</span><span>Capping</span><span>Extraction</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Rotating 3D dental molar visual">
          <div className="dental-stage fast-dental-stage">
            <div className="stage-grid"></div>
            <RotatingMolar />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Clinic trust indicators">
      <div><b>308</b><span>Google reviews</span></div>
      <div><b>4.9</b><span>Overall rating</span></div>
      <div><b>500043</b><span>Gandimaisamma</span></div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className="section">
      <div className="section-title"><span>Services</span><h2>Focused care for healthy, confident smiles.</h2><p>Everyday family dentistry, restorative treatment and smile correction presented with a clean clinical experience.</p></div>
      <div className="cards services-grid">
        {serviceHighlights.map((s) => <article className="service-card" key={s.title}><div className="emoji" aria-hidden="true">{s.icon}</div><h3>{s.title}</h3><p>{s.desc}</p></article>)}
      </div>
    </section>
  );
}

function Quality() {
  return (
    <section id="quality" className="section blue-section">
      <div className="quality-wrap">
        <div>
          <span className="kicker">Quality-first clinic</span>
          <h2>Designed around precision, hygiene and trust.</h2>
          <p>Dr. Rajashekar Reddy has invested in modern dental equipment and a neat clinical setup.</p>
          <div className="quality-list">
            {qualityPoints.map((point) => <p key={point}>{point}</p>)}
          </div>
        </div>
        <div className="device-card">
          <div className="device-top"><span></span><span></span><span></span></div>
          <div className="device-body">
            <ClinicLogo large />
            <h3>Clean clinic systems</h3>
            <p>A calm setup built for focused diagnosis, treatment planning and comfortable visits.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section id="gallery" className="section">
      <div className="section-title"><span>Photos</span><h2>A look inside the clinic experience.</h2><p>Clinic, equipment and patient-care spaces presented in a simple fast gallery.</p></div>
      <div className="gallery-scroll">
        {gallery.map((g, index) => (
          <figure key={g.title}>
            <img src={g.img} alt={g.title} width="900" height="650" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" />
            <figcaption>{g.title}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section id="reviews" className="section reviews-section">
      <div className="section-title"><span>Reviews</span><h2>Patients trust the calm, clear treatment experience.</h2></div>
      <div className="review-grid">
        {reviews.map((r) => <article className="review" key={r.name}><div className="stars" aria-label="5 star rating">★★★★★</div><p>“{r.text}”</p><b>{r.name}</b><small>Google review</small></article>)}
      </div>
    </section>
  );
}

function Appointment() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', treatment: '', concern: '' });

  function requestAppointment(event) {
    event.preventDefault();
    const message = `Hello Sri B.G Reddy Dental Clinic, I want to book an appointment.\n\nName: ${form.name}\nMobile: ${form.phone}\nTreatment: ${form.treatment || 'Not selected'}\nConcern: ${form.concern || 'Not mentioned'}`;
    setSent(true);
    window.open(`https://wa.me/919849326242?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <section id="appointment" className="section appointment-section">
      <div className="appointment-card">
        <div className="appointment-copy">
          <span className="kicker">Book appointment</span>
          <h2>Book your next dental visit.</h2>
          <p>Send the clinic your concern on WhatsApp and the team can confirm the right appointment slot.</p>
          <div className="contact-row">Phone: {phone}</div>
          <div className="contact-row">Address: BGR Arcade, Gandi Maisamma X Rd, Hyderabad 500043</div>
        </div>
        <form className="form" onSubmit={requestAppointment}>
          <label><span className="sr-only">Patient name</span><input aria-label="Patient name" placeholder="Patient name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label><span className="sr-only">Mobile number</span><input aria-label="Mobile number" placeholder="Mobile number" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label><span className="sr-only">Treatment</span><select aria-label="Treatment" value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} required>
            <option value="" disabled>Select treatment</option>
            <option>Dental checkup</option><option>Braces / orthodontics</option><option>RCT / tooth pain</option><option>Capping / crown</option><option>Extraction</option><option>Implants / dentures</option><option>Other</option>
          </select></label>
          <label><span className="sr-only">Concern</span><textarea aria-label="Concern" placeholder="Tell us the concern" rows="3" value={form.concern} onChange={(e) => setForm({ ...form, concern: e.target.value })}></textarea></label>
          <button className="btn primary" type="submit">Request on WhatsApp</button>
          {sent && <p className="success">WhatsApp opened with appointment details.</p>}
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div><ClinicLogo large /><b>Sri B.G Reddy Dental Clinic</b><p>Modern dental care in Gandimaisamma.</p></div>
      <a href={mapsUrl} target="_blank" rel="noreferrer">Open Google Maps</a>
    </footer>
  );
}

function MobileBar({ onOpenPortal }) {
  return <div className="mobile-bar"><a href={`tel:${phone}`}>Call</a><a href="#appointment">Book</a><button type="button" onClick={onOpenPortal}>Login</button></div>;
}

function FastApp() {
  const [loadingPortal, setLoadingPortal] = useState(false);

  async function openPortal() {
    if (loadingPortal) return;
    setLoadingPortal(true);
    window.location.hash = 'dms';

    const container = document.getElementById('root');
    root.unmount();
    container.innerHTML = '<main class="loading-panel full">Opening owner dashboard...</main>';

    await import('./main.jsx');
    await Promise.all([
      loadScript('/revenue-months.js?v=3'),
      loadScript('/private-file-signing.js?v=3')
    ]);
  }

  useEffect(() => {
    if (window.location.hash === '#dms') {
      openPortal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header onOpenPortal={openPortal} />
      <main className="lite-home"><Hero onOpenPortal={openPortal} /><TrustStrip /><Services /><Quality /><Gallery /><Reviews /><Appointment /></main>
      <Footer />
      <MobileBar onOpenPortal={openPortal} />
    </>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<FastApp />);
