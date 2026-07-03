import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import './styles.css';
import {
  dmsApi,
  formatDateTime,
  formatMoney,
  clinicName,
  clinicPhone,
  clinicEmail,
  clinicAddress,
  isDmsConfigured,
  isOwnerRole,
  roleLabel,
  whatsappUrl,
} from './dmsClient.js';
import { supabase } from "./lib/supabase";

const phone = '+91 98493 26242';
const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=Sri%20B.G%20Reddy%20Dental%20Clinic&query_place_id=ChIJu7OqUvuOyzsRp7eapGfA-6I';

const reviews = [
  { name: 'Thatikonda Suhitha', text: 'Great services. Doctors are really patient and considerate. Services are affordable compared to other clinics.' },
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
  { title: 'Smile Alignment', desc: 'Braces and orthodontic correction for crowding, gaps, bite issues and confident long-term smile balance.', icon: '\u{1F601}' },
  { title: 'Root Canal Relief', desc: 'Calm, precise RCT care for tooth pain with clear explanation, comfort-first visits and quality capping options.', icon: '\u{1F9B7}' },
  { title: 'Crowns & Bridges', desc: 'Ceramic caps, crowns and bridges planned for strength, clean appearance and everyday chewing comfort.', icon: '\u2728' },
  { title: 'Gentle Extraction', desc: 'Tooth removal handled with careful guidance, patient comfort and simple after-care instructions.', icon: '\u{1F6E1}\uFE0F' },
  { title: 'Implants & Dentures', desc: 'Missing-tooth replacement planning with modern implant and denture support for a natural-feeling bite.', icon: '\u{1F529}' },
  { title: 'Gum Care & Cleaning', desc: 'Scaling, polishing and oral hygiene support for fresh breath, healthy gums and preventive family care.', icon: '\u{1F4A7}' },
  { title: 'Checkups & Fillings', desc: 'Routine exams, X-rays, fillings and practical treatment advice for every member of the family.', icon: '\u2705' }
];

const qualityPoints = [
  'Modern equipment and digital-ready records',
  'Sterilized instruments and clean clinical flow',
  'Clear planning for RCT, crowns, braces and extraction',
  'Private owner login for clinic records and reports'
];

function clinicConnectionLabel() {
  return isDmsConfigured ? 'Secure clinic connection ready' : 'Clinic connection unavailable';
}

function IconLogo({ dark = false }) {
  return <img className="logo-img" src={dark ? '/assets/logo-black.png' : '/assets/logo-icon.png'} alt="BG Reddy Dental Clinic logo" />;
}

function MolarFallback() {
  return (
    <div className="tooth-model">
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

function MolarModel() {
  const mountRef = React.useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let frameId = 0;
    let resizeObserver;
    let active = true;
    let model = null;
    const disposables = [];

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0.06, 0.18, 5.7);
    camera.lookAt(0, 0.08, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0xffffff, 0);
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
    const hemisphereLight = new THREE.HemisphereLight(0xeaf7ff, 0xc9e6fa, 1.1);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.65);
    const rimLight = new THREE.DirectionalLight(0x4eb2ff, 1.7);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.85);

    keyLight.position.set(3.5, 4.4, 4.2);
    rimLight.position.set(-4.2, 1.4, -2.4);
    fillLight.position.set(-1.8, -1.5, 3.4);
    scene.add(ambientLight, hemisphereLight, keyLight, rimLight, fillLight);

    const floorShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 64),
      new THREE.MeshBasicMaterial({
        color: 0x0877df,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      })
    );
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.position.set(0.02, -1.24, 0.08);
    floorShadow.scale.set(1.25, 0.3, 1);
    scene.add(floorShadow);
    disposables.push(floorShadow.geometry, floorShadow.material);

    function resize() {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      '/assets/dent-molaire-hero.glb',
      (gltf) => {
        if (!active) return;

        model = gltf.scene;
        model.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.geometry) disposables.push(child.geometry);
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          const polishedMaterials = materials.filter(Boolean).map((material) => {
            const polished = new THREE.MeshPhysicalMaterial({
              color: 0xfbfdff,
              roughness: 0.22,
              metalness: 0,
              clearcoat: 0.72,
              clearcoatRoughness: 0.16,
              ior: 1.46,
              specularIntensity: 0.72,
              specularColor: 0xffffff,
              side: material.side,
            });

            if (material.normalMap) {
              polished.normalMap = material.normalMap;
              polished.normalScale = material.normalScale?.clone?.() || new THREE.Vector2(1, 1);
              polished.normalScale.multiplyScalar(0.28);
            }

            polished.envMapIntensity = 0.38;
            polished.needsUpdate = true;
            disposables.push(material, polished);
            return polished;
          });

          if (polishedMaterials.length) {
            child.material = Array.isArray(child.material) ? polishedMaterials : polishedMaterials[0];
          }
        });

        const bounds = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bounds.getSize(size);
        bounds.getCenter(center);

        const maxSide = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.02 / maxSide;
        model.position.sub(center);
        model.scale.setScalar(scale);
        model.rotation.set(-0.08, -0.42, 0.02);
        model.position.x = 0.02;
        model.position.y = -0.08;
        scene.add(model);
        setLoaded(true);
      },
      undefined,
      () => {
        if (!active) return;
        setFailed(true);
      }
    );

    function render(time) {
      if (model) {
        const slowTurn = Math.sin(time * 0.00016);
        const slowLift = Math.sin(time * 0.00026);

        model.rotation.y = -0.42 + slowTurn * 0.34;
        model.rotation.x = -0.08 + Math.sin(time * 0.00011) * 0.045;
        model.position.y = -0.08 + slowLift * 0.055;
        floorShadow.scale.x = 1.25 + slowLift * 0.06;
        floorShadow.material.opacity = 0.1 + Math.cos(time * 0.00026) * 0.025;
      }

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    }

    frameId = window.requestAnimationFrame(render);

    return () => {
      active = false;
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      if (model) scene.remove(model);
      scene.remove(floorShadow);
      disposables.forEach((item) => item?.dispose?.());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className={`molar-model-wrap ${loaded ? 'is-loaded' : ''} ${failed ? 'is-failed' : ''}`} aria-hidden="true">
      <div className="molar-canvas" ref={mountRef}></div>
      <div className="molar-model-fallback"><MolarFallback /></div>
    </div>
  );
}

function Header({ portalOpen, onOpenPortal, onLogout, profile }) {
  const [open, setOpen] = useState(false);
  const nav = ['services', 'quality', 'gallery', 'reviews', 'appointment'];
  const go = (id) => { setOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <header className="topbar">
      <div className="nav-shell">
        <button className="brand" onClick={() => portalOpen ? onOpenPortal(false) : go('home')} aria-label="Home">
          <IconLogo />
          <span><b>BG Reddy</b><small>Dental Clinic</small></span>
        </button>

        {!portalOpen && (
          <nav className={open ? 'nav-menu show' : 'nav-menu'}>
            {nav.map((n) => <button key={n} onClick={() => go(n)}>{n}</button>)}
            <button onClick={() => { setOpen(false); onOpenPortal(true); }}>{profile ? 'Owner Dashboard' : 'Clinic Login'}</button>
          </nav>
        )}

        {portalOpen ? (
          <button className="desktop-call" onClick={onLogout}>{profile ? 'Logout' : 'Website'}</button>
        ) : (
          <button className="desktop-call" onClick={() => onOpenPortal(true)}>{profile ? 'Owner Dashboard' : 'Clinic Login'}</button>
        )}

        {!portalOpen && <button className="hamb" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? '\u00d7' : '\u2630'}</button>}
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
            <button className="btn dark" onClick={onOpenPortal}>Owner Login</button>
          </div>
          <div className="quick-grid">
            <span>Braces</span><span>RCT</span><span>Capping</span><span>Extraction</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="3D dental clinic visual">
          <div className="dental-stage">
            <div className="stage-grid"></div>
            <div className="orbit-ring orbit-ring-one"></div>
            <div className="orbit-ring orbit-ring-two"></div>
            <div className="orbit-ring orbit-ring-three"></div>
            <MolarModel />
            <div className="stage-shine"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="trust-strip">
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
        {serviceHighlights.map((s) => <article className="service-card" key={s.title}><div className="emoji">{s.icon}</div><h3>{s.title}</h3><p>{s.desc}</p></article>)}
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
          <p>Dr. Rajashekar Reddy has invested in modern dental equipment and a neat clinical setup. The website now reflects that strength with a sharper, more dimensional dental presentation.</p>
          <div className="quality-list">
            {qualityPoints.map((point) => <p key={point}>{point}</p>)}
          </div>
        </div>
        <div className="device-card">
          <div className="device-top"><span></span><span></span><span></span></div>
          <div className="device-body">
            <IconLogo />
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
      <div className="section-title"><span>Gallery</span><h2>A sharper clinic showcase for patients.</h2><p>Prepared for real clinic, equipment and treatment room photos while keeping the current gallery flow intact.</p></div>
      <div className="gallery-scroll">
        {gallery.map((g) => <figure key={g.title}><img src={g.img} alt={g.title} /><figcaption>{g.title}</figcaption></figure>)}
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section id="reviews" className="section reviews-section">
      <div className="section-title"><span>Reviews</span><h2>Patients trust the calm, clear treatment experience.</h2></div>
      <div className="review-grid">
        {reviews.map((r) => <article className="review" key={r.name}><div className="stars">★★★★★</div><p>"{r.text}"</p><b>{r.name}</b><small>Google review</small></article>)}
      </div>
    </section>
  );
}

function Appointment() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', treatment: '', concern: '' });

  function requestAppointment(event) {
    event.preventDefault();
    const message = `Hello Sri B.G Reddy Dental Clinic, I want to book an appointment.%0A%0AName: ${form.name}%0AMobile: ${form.phone}%0ATreatment: ${form.treatment || 'Not selected'}%0AConcern: ${form.concern || 'Not mentioned'}`;
    setSent(true);
    window.open(`https://wa.me/919849326242?text=${message}`, '_blank', 'noopener,noreferrer');
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
          <input placeholder="Patient name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Mobile number" inputMode="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} required>
            <option value="" disabled>Select treatment</option>
            <option>Dental checkup</option><option>Braces / orthodontics</option><option>RCT / tooth pain</option><option>Capping / crown</option><option>Extraction</option><option>Implants / dentures</option><option>Other</option>
          </select>
          <textarea placeholder="Tell us the concern" rows="3" value={form.concern} onChange={(e) => setForm({ ...form, concern: e.target.value })}></textarea>
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
      <div><IconLogo /><b>Sri B.G Reddy Dental Clinic</b><p>Modern dental care in Gandimaisamma.</p></div>
      <a href={mapsUrl} target="_blank" rel="noreferrer">Open Google Maps</a>
    </footer>
  );
}

function MobileBar({ onOpenPortal }) {
  return <div className="mobile-bar"><a href={`tel:${phone}`}>Call</a><a href="#appointment">Book</a><button onClick={onOpenPortal}>Login</button></div>;
}

function PublicWebsite({ onOpenPortal }) {
  return <main><Hero onOpenPortal={onOpenPortal} /><TrustStrip /><Services /><Quality /><Gallery /><Reviews /><Appointment /></main>;
}

function LoginPanel({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await dmsApi.login(email, password);
      const profile = await dmsApi.getProfile();

      if (!profile) {
        throw new Error('No clinic profile found for this login. Create the clinic/profile first.');
      }

      if (!isOwnerRole(profile.role)) {
        throw new Error(`This clinic portal is for owner/head doctor only. Current role: ${roleLabel(profile.role)}.`);
      }

      const clinic = await dmsApi.getClinic(profile.clinic_id);
      onLoginSuccess({ profile, clinic });
    } catch (err) {
      dmsApi.clearSession();
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="portal-login-wrap">
      <section className="portal-login-card">
        <div className="login-brand">
          <IconLogo dark />
          <h2>Owner Login</h2>
          <p>Private clinic login for authorized owner access.</p>
          <div className="login-feature-grid">
            <span>Patients</span>
            <span>Appointments</span>
            <span>Payments</span>
            <span>Gallery Audit</span>
            <span>Visit Audit</span>
            <span>Reports</span>
            <span>Staff</span>
            <span>Clinic</span>
          </div>
        </div>
        <form className="login-box" onSubmit={submit}>
          <div className={isDmsConfigured ? "success-box" : "error-box"}>{clinicConnectionLabel()}</div>
          {!isDmsConfigured && <div className="error-box">Clinic connection is not available in this build. Stop the server and run npm run dev again after adding the required environment values.</div>}
          <input placeholder="Owner email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn primary" disabled={loading || !isDmsConfigured}>{loading ? 'Checking credentials...' : 'Login to owner portal'}</button>
          {error && <p className="error-text">{error}</p>}
          <div className="role-pills"><span>Owner</span><span>Head Doctor</span><span>Full Control</span></div>
        </form>
      </section>
    </main>
  );
}


function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\r?\n|\r/g, ' ').trim();

  if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`;

  return text;
}

function toCsv(rows = []) {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);

  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function downloadCsv(filename, rows = []) {
  if (!rows.length) {
    alert('No data available to export.');
    return;
  }

  downloadTextFile(filename, toCsv(rows), 'text/csv;charset=utf-8');
}

function downloadJson(filename, data) {
  downloadTextFile(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
}

function ownerExportDate() {
  return new Date().toISOString().slice(0, 10);
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function patientDisplayName(patient) {
  return patient?.name || patient?.patient_name || 'Patient';
}

function patientDisplayPhone(patient) {
  return patient?.phone || patient?.patient_phone || '';
}

function appointmentId(item) {
  return item?.id || item?.appointment_id;
}

function fileTypeLabel(type) {
  const labels = {
    xray: 'X-ray',
    prescription: 'Prescription',
    before_photo: 'Before Photo',
    after_photo: 'After Photo',
    report: 'Report',
    other: 'Other',
  };

  return labels[type] || type || 'File';
}

function DashboardStat({ label, value, icon }) {
  return <div className="dashboard-stat"><span className="stat-icon">{icon}</span><small>{label}</small><b>{value}</b></div>;
}

function PortalTabs({ active, onChange }) {
  const tabs = [
    ['control', 'Control Panel'],
    ['overview', 'Overview'],
    ['patients', 'Patients'],
    ['appointments', 'Appointments'],
    ['gallery', 'Gallery Audit'],
    ['visits', 'Visit Audit'],
    ['dues', 'Dues'],
    ['exports', 'Exports'],
    ['staff', 'Staff'],
    ['clinic', 'Clinic'],
  ];

  return <div className="portal-tabs">{tabs.map(([key, label]) => <button key={key} className={active === key ? 'active' : ''} onClick={() => onChange(key)}>{label}</button>)}</div>;
}

function Empty({ title, message }) {
  return <div className="empty"><b>{title}</b><p>{message}</p></div>;
}

function OwnerDashboard({ profile, clinic, onLogout }) {
  const [active, setActive] = useState('control');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [ownerProfile, setOwnerProfile] = useState(profile);
  const [state, setState] = useState({
    summary: {},
    patients: [],
    appointments: [],
    pending: [],
    followups: [],
    visits: [],
    galleryAudit: [],
    staff: [],
    invites: [],
    clinic,
  });

  async function loadAll() {
    setRefreshing(true);
    setError('');
    try {
      const [summary, patients, appointments, pending, followups, visits, galleryAudit, staff, invites] = await Promise.all([
        dmsApi.getOwnerSummary().catch(() => ({})),
        dmsApi.getPatients().catch(() => []),
        dmsApi.getAppointments('today').catch(() => []),
        dmsApi.getPendingPayments().catch(() => []),
        dmsApi.getFollowups('today').catch(() => []),
        dmsApi.getVisitAudit().catch(() => []),
        dmsApi.getGalleryAudit().catch(() => []),
        dmsApi.getStaff().catch(() => []),
        dmsApi.getInvites().catch(() => []),
      ]);
      setState((prev) => ({ ...prev, summary, patients, appointments, pending, followups, visits, galleryAudit, staff, invites }));
    } catch (err) {
      setError(err.message || 'Dashboard load failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const summary = state.summary || {};
  const todayRevenue = summary.today_revenue ?? summary.todayRevenue ?? 0;
  const pendingAmount = summary.pending_payments ?? summary.pendingPayments ?? 0;
  const waitingCount = summary.waiting_count ?? 0;
  const completedCount = summary.completed_count ?? 0;
  const todayPatients = summary.today_patient_count ?? 0;
  const clinicRecord = state.clinic || clinic;
  const clinicId = clinicRecord?.id || ownerProfile?.clinic_id || profile?.clinic_id;

  return (
    <main className="portal-shell">
      <section className="portal-hero-card">
        <div>
          <span className="kicker">Advanced Control Panel</span>
          <h1>{clinicName(clinicRecord)}</h1>
          <p>Logged in as {ownerProfile.name || ownerProfile.email} • {roleLabel(ownerProfile.role)} • {clinicConnectionLabel()}</p>
        </div>
        <div className="portal-actions">
          <button className="btn ghost" onClick={loadAll}>{refreshing ? 'Refreshing...' : 'Refresh'}</button>
          <button className="btn dark" onClick={onLogout}>Logout</button>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}
      <div className="success-box">{clinicConnectionLabel()} • If data is empty, confirm the logged-in account has owner access.</div>
      {loading ? <div className="loading-panel">Loading clinic data...</div> : (
        <>
          <PortalTabs active={active} onChange={setActive} />

          {active === 'control' && <ControlPanelTab summary={{ todayRevenue, pendingAmount, waitingCount, completedCount, todayPatients }} state={state} setActive={setActive} />}
          {active === 'overview' && <OverviewTab summary={{ todayRevenue, pendingAmount, waitingCount, completedCount, todayPatients }} state={state} setActive={setActive} />}
          {active === 'patients' && <PatientsTab />}
          {active === 'appointments' && <AppointmentsTab />}
          {active === 'gallery' && <GalleryAuditTab />}
          {active === 'visits' && <VisitAuditTab />}
          {active === 'dues' && <DuesTab />}
          {active === 'exports' && <ExportsTab />}
          {active === 'staff' && <StaffTab onReload={loadAll} staff={state.staff} invites={state.invites} />}
          {active === 'clinic' && <ClinicTab clinic={clinicRecord} ownerProfile={ownerProfile} onProfileUpdated={setOwnerProfile} onUpdated={(nextClinic) => setState((prev) => ({ ...prev, clinic: nextClinic }))} />}
        </>
      )}
    </main>
  );

  function ControlPanelTab({ summary, state, setActive }) {
    const controls = [
      { title: 'Patient Command', desc: 'Add patients, edit profiles, open full patient history and remove duplicate records.', action: 'Open patients', tab: 'patients' },
      { title: 'Schedule Board', desc: 'Create appointments, change status, mark completed or cancel records from one board.', action: 'Open schedule', tab: 'appointments' },
      { title: 'Staff Access', desc: 'Invite staff, edit roles, deactivate accounts and clean pending invite codes.', action: 'Open staff', tab: 'staff' },
      { title: 'Clinic Settings', desc: 'Edit owner profile, phone number, clinic contact details and address.', action: 'Open settings', tab: 'clinic' },
      { title: 'Audit & Files', desc: 'Review visits, clinical uploads, dues, reports and owner exports.', action: 'Open audits', tab: 'visits' },
      { title: 'Backup Center', desc: 'Download CSV and JSON exports for patients, appointments, visits, dues and staff.', action: 'Open exports', tab: 'exports' },
    ];

    return (
      <div className="control-panel-grid">
        <div className="portal-card command-hero wide-card">
          <div>
            <span className="kicker">Clinic cPanel</span>
            <h2>Everything important in one owner workspace.</h2>
            <p>Manage patients, staff, appointments, reports, settings and profile information without leaving the dashboard.</p>
          </div>
          <div className="command-stats">
            <DashboardStat label="Today Revenue" value={formatMoney(summary.todayRevenue)} icon={'\u20B9'} />
            <DashboardStat label="Pending" value={formatMoney(summary.pendingAmount)} icon={'\u26A0\uFE0F'} />
            <DashboardStat label="Patients" value={state.patients.length} icon={'\u{1F465}'} />
          </div>
        </div>
        {controls.map((item) => (
          <article className="control-card" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
            <button className="btn ghost" onClick={() => setActive(item.tab)}>{item.action}</button>
          </article>
        ))}
      </div>
    );
  }

  function OverviewTab({ summary, state, setActive }) {
    return (
      <div className="dashboard-grid">
        <DashboardStat label="Today's Revenue" value={formatMoney(summary.todayRevenue)} icon={'\u20B9'} />
        <DashboardStat label="Pending Amount" value={formatMoney(summary.pendingAmount)} icon={'\u26A0\uFE0F'} />
        <DashboardStat label="Waiting Queue" value={summary.waitingCount} icon={'\u{1FA91}'} />
        <DashboardStat label="Completed Today" value={summary.completedCount} icon={'\u2705'} />
        <DashboardStat label="Patients Today" value={summary.todayPatients} icon={'\u{1F465}'} />
        <DashboardStat label="Total Patients" value={state.patients.length} icon={'\u{1F4C1}'} />
        <DashboardStat label="Visits Recorded" value={state.visits.length} icon={'\u{1F9B7}'} />
        <DashboardStat label="Gallery Uploads" value={state.galleryAudit.length} icon={'\u{1F5BC}\uFE0F'} />
        <DashboardStat label="Staff Accounts" value={state.staff.length} icon={'\u{1F468}\u200D\u2695\uFE0F'} />

        <div className="portal-card wide-card">
          <div className="card-title"><h3>Owner control shortcuts</h3><p>Manage the key clinic areas from this dashboard.</p></div>
          <div className="shortcut-grid">
            <button onClick={() => setActive('patients')}>Patients</button>
            <button onClick={() => setActive('appointments')}>Appointments</button>
            <button onClick={() => setActive('dues')}>Due Payments</button>
            <button onClick={() => setActive('gallery')}>Gallery Audit</button>
            <button onClick={() => setActive('visits')}>Visit Audit</button>
            <button onClick={() => setActive('exports')}>Export Reports</button>
            <button onClick={() => setActive('staff')}>Staff Access</button>
            <button onClick={() => setActive('clinic')}>Clinic Details</button>
          </div>
        </div>

        <div className="portal-card">
          <div className="card-title"><h3>Today appointments</h3><p>{state.appointments.length} records</p></div>
          <MiniAppointmentList items={state.appointments.slice(0, 5)} />
        </div>

        <div className="portal-card">
          <div className="card-title"><h3>Pending dues</h3><p>{state.pending.length} patients</p></div>
          <MiniDueList items={state.pending.slice(0, 5)} />
        </div>

        <div className="portal-card">
          <div className="card-title"><h3>Recent visits</h3><p>Doctor audit</p></div>
          <MiniVisitList items={state.visits.slice(0, 5)} />
        </div>

        <div className="portal-card">
          <div className="card-title"><h3>Recent uploads</h3><p>Photo upload audit</p></div>
          <MiniGalleryList items={state.galleryAudit.slice(0, 5)} />
        </div>
      </div>
    );
  }

  function PatientsTab() {
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState(state.patients);
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [profileBundle, setProfileBundle] = useState(null);
    const [profileBusy, setProfileBusy] = useState(false);
    const emptyPatient = { id: '', patient_code: '', name: '', phone: '', age: '', gender: '' };
    const [form, setForm] = useState(emptyPatient);

    useEffect(() => {
      setRows(state.patients);
    }, [state.patients]);

    async function searchPatients(event) {
      event?.preventDefault();
      setBusy(true);
      try {
        setRows(await dmsApi.getPatients(search));
      } catch (err) {
        setError(err.message || 'Patient search failed');
      } finally {
        setBusy(false);
      }
    }

    async function reloadPatients(nextSearch = search) {
      const nextRows = await dmsApi.getPatients(nextSearch);
      setRows(nextRows);
      setState((prev) => ({ ...prev, patients: nextRows }));
      return nextRows;
    }

    function editPatient(patient) {
      setForm({
        id: patient.id,
        patient_code: patient.patient_code || '',
        name: patient.name || '',
        phone: patient.phone || '',
        age: patient.age || '',
        gender: patient.gender || '',
      });
    }

    function clearPatientForm() {
      setForm(emptyPatient);
    }

    async function savePatient(event) {
      event.preventDefault();
      setSaving(true);
      setError('');

      try {
        const savedRows = form.id
          ? await dmsApi.updatePatient(form.id, form)
          : await dmsApi.createPatient(form, clinicId);
        const saved = savedRows?.[0];
        await reloadPatients();
        clearPatientForm();
        if (saved) await openPatientProfile(saved);
      } catch (err) {
        setError(err.message || 'Patient save failed');
      } finally {
        setSaving(false);
      }
    }

    async function deletePatient(patient) {
      const ok = window.confirm(`Delete patient ${patient.name || patient.phone || 'record'}? This can fail if visits, bills or files still depend on the patient.`);
      if (!ok) return;

      setSaving(true);
      setError('');
      try {
        await dmsApi.deletePatient(patient.id);
        if (selectedPatient?.id === patient.id) {
          setSelectedPatient(null);
          setProfileBundle(null);
        }
        await reloadPatients();
      } catch (err) {
        setError(err.message || 'Patient delete failed');
      } finally {
        setSaving(false);
      }
    }

    async function openPatientProfile(patient) {
      setSelectedPatient(patient);
      setProfileBusy(true);
      setError('');
      try {
        const bundle = await dmsApi.getPatientProfile(patient.id);
        setProfileBundle(bundle || { patient, visits: [], files: [], appointments: [], invoices: [], payments: [] });
      } catch (err) {
        setProfileBundle({ patient, visits: [], files: [], appointments: [], invoices: [], payments: [] });
        setError(err.message || 'Patient profile load failed');
      } finally {
        setProfileBusy(false);
      }
    }

    async function refreshSelectedPatient() {
      if (!selectedPatient) return;
      await openPatientProfile(selectedPatient);
    }

    return (
      <div className="management-layout">
        <div className="portal-card full-card">
          <div className="card-title"><h3>{form.id ? 'Edit patient' : 'Add patient'}</h3><p>Create profiles, edit phone numbers and keep patient records clean.</p></div>
          <form className="control-form patient-form" onSubmit={savePatient}>
            <input placeholder="Patient name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Phone number" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Patient ID / code" value={form.patient_code} onChange={(e) => setForm({ ...form, patient_code: e.target.value })} />
            <input placeholder="Age" inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <div className="action-row">
              <button className="btn primary" disabled={saving}>{saving ? 'Saving...' : form.id ? 'Save patient' : 'Add patient'}</button>
              <button className="btn ghost" type="button" onClick={clearPatientForm}>Clear</button>
            </div>
          </form>
        </div>

        <div className="portal-card full-card">
          <div className="card-title"><h3>Patient directory</h3><p>Search, open profile pages, edit details or remove records.</p></div>
          <form className="portal-search" onSubmit={searchPatients}>
            <input placeholder="Search name, phone or patient ID" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn primary" disabled={busy}>{busy ? 'Searching...' : 'Search'}</button>
            <button className="btn ghost" type="button" onClick={() => downloadCsv(`patients-${ownerExportDate()}.csv`, rows)}>Export</button>
          </form>
          <div className="table-list">
            {rows.length ? rows.map((p) => (
              <div className="table-row patient-row action-table-row" key={p.id}>
                <div>
                  <b>{p.name}</b>
                  <small>{p.phone || 'No phone'} {p.patient_code ? `| ${p.patient_code}` : ''} {p.gender ? `| ${p.gender}` : ''} {p.created_at ? `| Added ${formatDateTime(p.created_at)}` : ''}</small>
                </div>
                <span>{p.age || '-'} yrs</span>
                <div className="row-actions">
                  <button type="button" onClick={() => openPatientProfile(p)}>Profile</button>
                  <button type="button" onClick={() => editPatient(p)}>Edit</button>
                  <button type="button" className="danger-action" onClick={() => deletePatient(p)}>Delete</button>
                </div>
              </div>
            )) : <Empty title="No patients" message="No patient records found." />}
          </div>
        </div>

        <PatientProfilePanel
          selectedPatient={selectedPatient}
          profileBundle={profileBundle}
          profileBusy={profileBusy}
          onEdit={editPatient}
          onRefresh={refreshSelectedPatient}
        />
      </div>
    );
  }

  function PatientProfilePanel({ selectedPatient, profileBundle, profileBusy, onEdit, onRefresh }) {
    const patient = profileBundle?.patient || selectedPatient;
    const visits = profileBundle?.visits || [];
    const files = profileBundle?.files || [];
    const appointments = profileBundle?.appointments || [];
    const invoices = profileBundle?.invoices || [];
    const payments = profileBundle?.payments || [];
    const [appointmentForm, setAppointmentForm] = useState({ appointment_time: '', status: 'scheduled', notes: '' });
    const [visitForm, setVisitForm] = useState({ visit_date: toDateTimeLocal(new Date()), chief_complaint: '', notes: '', next_appointment_date: '' });
    const [profileSaving, setProfileSaving] = useState(false);

    if (!patient) {
      return (
        <div className="portal-card full-card patient-profile-panel">
          <Empty title="No profile selected" message="Open a patient profile to see history, appointments, files, dues and quick actions." />
        </div>
      );
    }

    const dueTotal = invoices.reduce((total, invoice) => total + Number(invoice.due_amount || 0), 0);
    const paidTotal = payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);

    async function createProfileAppointment(event) {
      event.preventDefault();
      setProfileSaving(true);
      setError('');
      try {
        await dmsApi.createAppointment({ ...appointmentForm, patient_id: patient.id }, clinicId, ownerProfile.id);
        setAppointmentForm({ appointment_time: '', status: 'scheduled', notes: '' });
        await onRefresh();
        await loadAll();
      } catch (err) {
        setError(err.message || 'Appointment create failed');
      } finally {
        setProfileSaving(false);
      }
    }

    async function createProfileVisit(event) {
      event.preventDefault();
      setProfileSaving(true);
      setError('');
      try {
        await dmsApi.createVisit({ ...visitForm, patient_id: patient.id }, clinicId, ownerProfile.id);
        setVisitForm({ visit_date: toDateTimeLocal(new Date()), chief_complaint: '', notes: '', next_appointment_date: '' });
        await onRefresh();
        await loadAll();
      } catch (err) {
        setError(err.message || 'Visit create failed');
      } finally {
        setProfileSaving(false);
      }
    }

    async function removeAppointment(record) {
      const id = appointmentId(record);
      if (!id || !window.confirm('Delete this appointment?')) return;

      setProfileSaving(true);
      setError('');
      try {
        await dmsApi.deleteAppointment(id);
        await onRefresh();
        await loadAll();
      } catch (err) {
        setError(err.message || 'Appointment delete failed');
      } finally {
        setProfileSaving(false);
      }
    }

    async function markAppointment(record, status) {
      const id = appointmentId(record);
      if (!id) return;

      setProfileSaving(true);
      setError('');
      try {
        await dmsApi.updateAppointment(id, { status });
        await onRefresh();
        await loadAll();
      } catch (err) {
        setError(err.message || 'Appointment update failed');
      } finally {
        setProfileSaving(false);
      }
    }

    async function removeVisit(record) {
      if (!record.id || !window.confirm('Delete this visit note?')) return;

      setProfileSaving(true);
      setError('');
      try {
        await dmsApi.deleteVisit(record.id);
        await onRefresh();
        await loadAll();
      } catch (err) {
        setError(err.message || 'Visit delete failed');
      } finally {
        setProfileSaving(false);
      }
    }

    return (
      <div className="portal-card full-card patient-profile-panel">
        <div className="profile-heading">
          <div>
            <span className="kicker">Patient Profile</span>
            <h3>{patientDisplayName(patient)}</h3>
            <p>{patientDisplayPhone(patient) || 'No phone'} {patient.patient_code ? `| ${patient.patient_code}` : ''} {patient.gender ? `| ${patient.gender}` : ''} {patient.age ? `| ${patient.age} yrs` : ''}</p>
          </div>
          <div className="row-actions">
            <button type="button" onClick={() => onEdit(patient)}>Edit profile</button>
            <button type="button" onClick={onRefresh}>{profileBusy ? 'Loading...' : 'Refresh'}</button>
          </div>
        </div>

        <div className="profile-stat-grid">
          <DashboardStat label="Visits" value={visits.length} icon={'\u{1F9B7}'} />
          <DashboardStat label="Files" value={files.length} icon={'\u{1F5BC}\uFE0F'} />
          <DashboardStat label="Due" value={formatMoney(dueTotal)} icon={'\u26A0\uFE0F'} />
          <DashboardStat label="Paid" value={formatMoney(paidTotal)} icon={'\u20B9'} />
        </div>

        <div className="split-grid profile-actions-grid">
          <form className="control-form" onSubmit={createProfileAppointment}>
            <h4>Add appointment</h4>
            <input type="datetime-local" value={appointmentForm.appointment_time} onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_time: e.target.value })} required />
            <select value={appointmentForm.status} onChange={(e) => setAppointmentForm({ ...appointmentForm, status: e.target.value })}>
              <option value="scheduled">Scheduled</option>
              <option value="waiting">Waiting</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <textarea placeholder="Appointment notes" rows="2" value={appointmentForm.notes} onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}></textarea>
            <button className="btn primary" disabled={profileSaving}>Add appointment</button>
          </form>

          <form className="control-form" onSubmit={createProfileVisit}>
            <h4>Add visit note</h4>
            <input type="datetime-local" value={visitForm.visit_date} onChange={(e) => setVisitForm({ ...visitForm, visit_date: e.target.value })} />
            <input placeholder="Chief complaint" value={visitForm.chief_complaint} onChange={(e) => setVisitForm({ ...visitForm, chief_complaint: e.target.value })} required />
            <textarea placeholder="Doctor notes" rows="2" value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}></textarea>
            <input type="datetime-local" value={visitForm.next_appointment_date} onChange={(e) => setVisitForm({ ...visitForm, next_appointment_date: e.target.value })} />
            <button className="btn primary" disabled={profileSaving}>Add visit</button>
          </form>
        </div>

        <div className="profile-record-grid">
          <section>
            <h4>Appointments</h4>
            <ProfileAppointmentRows items={appointments} onMark={markAppointment} onDelete={removeAppointment} />
          </section>
          <section>
            <h4>Visits</h4>
            <div className="table-list">
              {visits.length ? visits.map((visit) => (
                <div className="table-row action-table-row" key={visit.id}>
                  <div><b>{visit.chief_complaint || 'Visit'}</b><small>{formatDateTime(visit.visit_date || visit.created_at)} | {visit.notes || 'No notes'}</small></div>
                  <div className="row-actions"><button type="button" className="danger-action" onClick={() => removeVisit(visit)}>Delete</button></div>
                </div>
              )) : <Empty title="No visits" message="No visit notes found for this patient." />}
            </div>
          </section>
          <section>
            <h4>Files</h4>
            <div className="table-list">
              {files.length ? files.map((file) => (
                <div className="table-row action-table-row" key={file.id}>
                  <div><b>{fileTypeLabel(file.file_type)}</b><small>{file.file_name || 'Clinical file'} | {formatDateTime(file.created_at)}</small></div>
                  {file.file_url ? <a className="mini-link" href={file.file_url} target="_blank" rel="noreferrer">View</a> : <span>No link</span>}
                </div>
              )) : <Empty title="No files" message="No clinical files found for this patient." />}
            </div>
          </section>
          <section>
            <h4>Invoices & payments</h4>
            <div className="table-list">
              {invoices.length ? invoices.map((invoice) => (
                <div className="table-row" key={invoice.id}>
                  <div><b>{invoice.invoice_type || 'Invoice'}</b><small>Total {formatMoney(invoice.total_amount)} | Paid {formatMoney(invoice.paid_amount)} | Due {formatMoney(invoice.due_amount)}</small></div>
                  <span>{invoice.status || 'open'}</span>
                </div>
              )) : <Empty title="No invoices" message="No invoices found." />}
              {payments.length ? payments.map((payment) => (
                <div className="table-row" key={payment.id}>
                  <div><b>Payment {formatMoney(payment.amount)}</b><small>{payment.payment_method || 'Method not set'} | {formatDateTime(payment.created_at)}</small></div>
                  <span>Paid</span>
                </div>
              )) : null}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function ProfileAppointmentRows({ items = [], onMark, onDelete }) {
    if (!items.length) return <Empty title="No appointments" message="No appointments found for this patient." />;

    return (
      <div className="table-list">
        {items.map((item) => (
          <div className="table-row action-table-row" key={appointmentId(item) || item.appointment_time}>
            <div>
              <b>{formatDateTime(item.appointment_time)}</b>
              <small>{item.notes || 'No notes'} | {item.status || 'scheduled'}</small>
            </div>
            <span>{item.status || 'scheduled'}</span>
            <div className="row-actions">
              <button type="button" onClick={() => onMark(item, 'completed')}>Complete</button>
              <button type="button" onClick={() => onMark(item, 'cancelled')}>Cancel</button>
              <button type="button" className="danger-action" onClick={() => onDelete(item)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function AppointmentsTab() {
    const [filter, setFilter] = useState('today');
    const [rows, setRows] = useState(state.appointments);
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ patient_id: '', appointment_time: '', status: 'scheduled', notes: '' });

    useEffect(() => {
      setRows(state.appointments);
    }, [state.appointments]);

    async function changeFilter(next) {
      setFilter(next);
      setBusy(true);
      try {
        setRows(await dmsApi.getAppointments(next));
      } catch (err) {
        setError(err.message || 'Appointments load failed');
      } finally {
        setBusy(false);
      }
    }

    async function reloadAppointments(nextFilter = filter) {
      const nextRows = await dmsApi.getAppointments(nextFilter);
      setRows(nextRows);
      setState((prev) => ({ ...prev, appointments: nextFilter === 'today' ? nextRows : prev.appointments }));
      return nextRows;
    }

    async function createAppointment(event) {
      event.preventDefault();
      setSaving(true);
      setError('');
      try {
        await dmsApi.createAppointment(form, clinicId, ownerProfile.id);
        setForm({ patient_id: '', appointment_time: '', status: 'scheduled', notes: '' });
        await reloadAppointments();
        await loadAll();
      } catch (err) {
        setError(err.message || 'Appointment create failed');
      } finally {
        setSaving(false);
      }
    }

    async function markAppointment(record, status) {
      const id = appointmentId(record);
      if (!id) return;
      setSaving(true);
      setError('');
      try {
        await dmsApi.updateAppointment(id, { status });
        await reloadAppointments();
        await loadAll();
      } catch (err) {
        setError(err.message || 'Appointment update failed');
      } finally {
        setSaving(false);
      }
    }

    async function deleteAppointment(record) {
      const id = appointmentId(record);
      if (!id || !window.confirm('Delete this appointment?')) return;
      setSaving(true);
      setError('');
      try {
        await dmsApi.deleteAppointment(id);
        await reloadAppointments();
        await loadAll();
      } catch (err) {
        setError(err.message || 'Appointment delete failed');
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="management-layout">
        <div className="portal-card full-card">
          <div className="card-title"><h3>Create appointment</h3><p>Schedule a patient, set status and add front-desk notes.</p></div>
          <form className="control-form appointment-form" onSubmit={createAppointment}>
            <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required>
              <option value="">Select patient</option>
              {state.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} {patient.phone ? `- ${patient.phone}` : ''}</option>)}
            </select>
            <input type="datetime-local" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} required />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="scheduled">Scheduled</option>
              <option value="waiting">Waiting</option>
              <option value="checked_in">Checked in</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <textarea placeholder="Appointment notes" rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}></textarea>
            <button className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Create appointment'}</button>
          </form>
        </div>

        <div className="portal-card full-card">
          <div className="card-title"><h3>Appointments & follow-ups</h3><p>Track waiting, scheduled, overdue and completed patient flow.</p></div>
          <div className="filter-pills">
            {['today', 'upcoming', 'overdue'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => changeFilter(item)}>{item}</button>)}
          </div>
          {busy ? <div className="loading-panel compact">Loading appointments...</div> : <MiniAppointmentList items={rows} large onStatusChange={markAppointment} onDelete={deleteAppointment} />}
        </div>
      </div>
    );
  }

  function DuesTab() {
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState(state.pending);
    const [busy, setBusy] = useState(false);

    async function searchDues(event) {
      event?.preventDefault();
      setBusy(true);
      try {
        setRows(await dmsApi.getPendingPayments(search));
      } catch (err) {
        setError(err.message || 'Pending dues load failed');
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="portal-card full-card">
        <div className="card-title"><h3>Due payments</h3><p>Owner can monitor pending amount and send WhatsApp reminders.</p></div>
        <form className="portal-search" onSubmit={searchDues}>
          <input placeholder="Search patient name, phone or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn primary" disabled={busy}>{busy ? 'Searching...' : 'Search'}</button>
        </form>
        <MiniDueList items={rows} large />
      </div>
    );
  }


  function GalleryAuditTab() {
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState(state.galleryAudit);
    const [busy, setBusy] = useState(false);

    async function searchGallery(event) {
      event?.preventDefault();
      setBusy(true);
      try {
        setRows(await dmsApi.getGalleryAudit(search));
      } catch (err) {
        setError(err.message || 'Gallery audit load failed');
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="portal-card full-card">
        <div className="card-title"><h3>Gallery audit</h3><p>Owner can see every uploaded X-ray, prescription, report, before/after photo, who uploaded it and which patient it belongs to.</p></div>
        <form className="portal-search" onSubmit={searchGallery}>
          <input placeholder="Search patient, phone, file type, file name or uploader" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn primary" disabled={busy}>{busy ? 'Loading...' : 'Search'}</button>
          <button className="btn ghost" type="button" onClick={() => downloadCsv(`gallery-upload-audit-${ownerExportDate()}.csv`, rows)}>Export</button>
        </form>

        {busy ? <div className="loading-panel compact">Loading gallery audit...</div> : <MiniGalleryList items={rows} large />}
      </div>
    );
  }

  function VisitAuditTab() {
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState(state.visits);
    const [busy, setBusy] = useState(false);

    async function searchVisits(event) {
      event?.preventDefault();
      setBusy(true);
      try {
        setRows(await dmsApi.getVisitAudit(search));
      } catch (err) {
        setError(err.message || 'Visit audit load failed');
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="portal-card full-card">
        <div className="card-title"><h3>Visit audit</h3><p>Every visit record with patient details, chief complaint, follow-up date and which doctor added the visit.</p></div>
        <form className="portal-search" onSubmit={searchVisits}>
          <input placeholder="Search patient, phone, doctor or complaint" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn primary" disabled={busy}>{busy ? 'Loading...' : 'Search'}</button>
          <button className="btn ghost" type="button" onClick={() => downloadCsv(`visit-audit-${ownerExportDate()}.csv`, rows)}>Export</button>
        </form>

        {busy ? <div className="loading-panel compact">Loading visit audit...</div> : <MiniVisitList items={rows} large />}
      </div>
    );
  }

  function ExportsTab() {
    const [busy, setBusy] = useState(false);

    async function exportFresh(type) {
      setBusy(true);
      setError('');

      try {
        const bundle = await dmsApi.getOwnerExportBundle();
        const date = ownerExportDate();

        if (type === 'patients') downloadCsv(`patients-${date}.csv`, bundle.patients);
        if (type === 'visits') downloadCsv(`visit-audit-${date}.csv`, bundle.visits);
        if (type === 'gallery') downloadCsv(`gallery-upload-audit-${date}.csv`, bundle.gallery);
        if (type === 'dues') downloadCsv(`pending-dues-${date}.csv`, bundle.pending);
        if (type === 'payments') downloadCsv(`payments-${date}.csv`, bundle.payments);
        if (type === 'invoices') downloadCsv(`invoices-${date}.csv`, bundle.invoices);
        if (type === 'appointments') downloadCsv(`appointments-${date}.csv`, bundle.appointments);
        if (type === 'staff') downloadCsv(`staff-${date}.csv`, bundle.staff);
        if (type === 'json') downloadJson(`bg-reddy-owner-full-audit-${date}.json`, bundle);
      } catch (err) {
        setError(err.message || 'Export failed');
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="portal-card full-card">
        <div className="card-title">
          <h3>Owner export center</h3>
          <p>Export crucial clinic details for owner review: patients, visits, doctors, photo uploaders, dues, invoices, payments, appointments and staff.</p>
        </div>

        <div className="export-grid">
          <button disabled={busy} onClick={() => exportFresh('patients')}><b>Patients CSV</b><span>Name, phone, patient ID, age, gender</span></button>
          <button disabled={busy} onClick={() => exportFresh('visits')}><b>Visit Audit CSV</b><span>Patient, complaint, doctor who added visit, follow-up</span></button>
          <button disabled={busy} onClick={() => exportFresh('gallery')}><b>Gallery Uploads CSV</b><span>File type, patient, uploaded by, upload time</span></button>
          <button disabled={busy} onClick={() => exportFresh('dues')}><b>Pending Dues CSV</b><span>Patient, pending amount, invoices</span></button>
          <button disabled={busy} onClick={() => exportFresh('payments')}><b>Payments CSV</b><span>Collected amount, method, date, patient</span></button>
          <button disabled={busy} onClick={() => exportFresh('invoices')}><b>Invoices CSV</b><span>Total, paid, due, status, type</span></button>
          <button disabled={busy} onClick={() => exportFresh('appointments')}><b>Appointments CSV</b><span>Follow-ups, status, patient, doctor</span></button>
          <button disabled={busy} onClick={() => exportFresh('staff')}><b>Staff CSV</b><span>Doctor/receptionist accounts and roles</span></button>
          <button disabled={busy} className="full-export" onClick={() => exportFresh('json')}><b>Full Owner Audit JSON</b><span>Complete backup-style export in one file</span></button>
        </div>

        {busy ? <div className="loading-panel compact">Preparing export...</div> : null}

        <div className="audit-note">
          <b>Owner audit note</b>
          <p>For clinic safety, exports include who added visits and who uploaded clinical photos whenever staff details are available.</p>
        </div>
      </div>
    );
  }


  function StaffTab({ staff, invites, onReload }) {
    const [form, setForm] = useState({ name: '', email: '', role: 'receptionist' });
    const [staffForm, setStaffForm] = useState({ id: '', name: '', email: '', phone: '', role: 'receptionist', active: true });
    const [busy, setBusy] = useState(false);

    async function inviteStaff(event) {
      event.preventDefault();
      setBusy(true);
      setError('');
      try {
        await dmsApi.createStaffInvite(form);
        setForm({ name: '', email: '', role: 'receptionist' });
        await onReload();
      } catch (err) {
        setError(err.message || 'Staff invite failed');
      } finally {
        setBusy(false);
      }
    }

    function editStaff(member) {
      setStaffForm({
        id: member.id,
        name: member.name || '',
        email: member.email || '',
        phone: member.phone || '',
        role: member.role || 'receptionist',
        active: member.active !== false,
      });
    }

    function clearStaffForm() {
      setStaffForm({ id: '', name: '', email: '', phone: '', role: 'receptionist', active: true });
    }

    async function saveStaff(event) {
      event.preventDefault();
      if (!staffForm.id) return;

      setBusy(true);
      setError('');
      try {
        await dmsApi.updateStaffProfile(staffForm.id, staffForm);
        clearStaffForm();
        await onReload();
      } catch (err) {
        setError(err.message || 'Staff update failed');
      } finally {
        setBusy(false);
      }
    }

    async function deactivateStaff(member) {
      setBusy(true);
      setError('');
      try {
        await dmsApi.updateStaffProfile(member.id, { active: false });
        await onReload();
      } catch (err) {
        setError(err.message || 'Staff deactivate failed');
      } finally {
        setBusy(false);
      }
    }

    async function deleteStaff(member) {
      const ok = window.confirm(`Delete staff profile ${member.name || member.email || 'record'}? Deactivate is safer if this account has clinical history.`);
      if (!ok) return;

      setBusy(true);
      setError('');
      try {
        await dmsApi.deleteStaffProfile(member.id);
        await onReload();
      } catch (err) {
        setError(err.message || 'Staff delete failed');
      } finally {
        setBusy(false);
      }
    }

    async function deleteInvite(invite) {
      const ok = window.confirm(`Delete invite for ${invite.email || invite.name || 'staff'}?`);
      if (!ok) return;

      setBusy(true);
      setError('');
      try {
        await dmsApi.deleteInvite(invite.id);
        await onReload();
      } catch (err) {
        setError(err.message || 'Invite delete failed');
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="management-layout">
        <div className="portal-card full-card">
          <div className="card-title"><h3>Invite staff</h3><p>Create invite codes for doctors and reception users.</p></div>
          <form className="staff-form" onSubmit={inviteStaff}>
            <input placeholder="Staff name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Staff email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="receptionist">Receptionist</option>
              <option value="working_doctor">Working Doctor</option>
              <option value="head_doctor">Head Doctor / Owner</option>
            </select>
            <button className="btn primary" disabled={busy}>{busy ? 'Creating...' : 'Create invite'}</button>
          </form>
        </div>

        <div className="portal-card full-card">
          <div className="card-title"><h3>{staffForm.id ? 'Edit staff' : 'Staff editor'}</h3><p>Edit name, phone, role and active status for selected staff.</p></div>
          <form className="control-form staff-edit-form" onSubmit={saveStaff}>
            <input placeholder="Select staff from list" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} disabled={!staffForm.id} />
            <input placeholder="Email" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} disabled={!staffForm.id} />
            <input placeholder="Phone number" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} disabled={!staffForm.id} />
            <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} disabled={!staffForm.id}>
              <option value="receptionist">Receptionist</option>
              <option value="working_doctor">Working Doctor</option>
              <option value="head_doctor">Head Doctor / Owner</option>
            </select>
            <label className="check-row"><input type="checkbox" checked={staffForm.active} onChange={(e) => setStaffForm({ ...staffForm, active: e.target.checked })} disabled={!staffForm.id} /> Active account</label>
            <div className="action-row">
              <button className="btn primary" disabled={busy || !staffForm.id}>{busy ? 'Saving...' : 'Save staff'}</button>
              <button className="btn ghost" type="button" onClick={clearStaffForm}>Clear</button>
            </div>
          </form>
        </div>

        <div className="portal-card full-card wide-card">
          <div className="split-grid">
            <div>
              <h4>Staff accounts</h4>
              <div className="table-list">
                {staff.length ? staff.map((s) => (
                  <div className="table-row action-table-row" key={s.id}>
                    <div><b>{s.name || s.email}</b><small>{s.email || 'No email'} {s.phone ? `| ${s.phone}` : ''} | {s.active === false ? 'Inactive' : 'Active'}</small></div>
                    <span>{roleLabel(s.role)}</span>
                    <div className="row-actions">
                      <button type="button" onClick={() => editStaff(s)}>Edit</button>
                      <button type="button" onClick={() => deactivateStaff(s)}>Deactivate</button>
                      <button type="button" className="danger-action" onClick={() => deleteStaff(s)}>Delete</button>
                    </div>
                  </div>
                )) : <Empty title="No staff" message="No staff found." />}
              </div>
            </div>
            <div>
              <h4>Invites</h4>
              <div className="table-list">
                {invites.length ? invites.map((i) => (
                  <div className="table-row action-table-row" key={i.id}>
                    <div><b>{i.name || i.email}</b><small>{i.email} | {i.accepted_at ? 'Accepted' : `Code: ${i.invite_code || '-'}`}</small></div>
                    <span>{roleLabel(i.role)}</span>
                    <div className="row-actions"><button type="button" className="danger-action" onClick={() => deleteInvite(i)}>Delete</button></div>
                  </div>
                )) : <Empty title="No invites" message="No pending invite found." />}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ClinicTab({ clinic, ownerProfile, onProfileUpdated, onUpdated }) {
    const [form, setForm] = useState({
      name: clinicName(clinic),
      phone: clinicPhone(clinic),
      email: clinicEmail(clinic),
      address: clinicAddress(clinic),
    });
    const [profileForm, setProfileForm] = useState({
      name: ownerProfile?.name || '',
      email: ownerProfile?.email || '',
      phone: ownerProfile?.phone || '',
    });
    const [busy, setBusy] = useState(false);
    const [profileBusy, setProfileBusy] = useState(false);

    async function saveClinic(event) {
      event.preventDefault();
      setBusy(true);
      try {
        const rows = await dmsApi.updateClinic(clinic.id, form);
        onUpdated(rows?.[0] || { ...clinic, ...form });
      } catch (err) {
        setError(err.message || 'Clinic update failed');
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="management-layout">
        <div className="portal-card full-card">
          <div className="card-title"><h3>Owner profile</h3><p>Edit the logged-in owner name, email and phone number.</p></div>
          <form className="clinic-form" onSubmit={async (event) => {
            event.preventDefault();
            setProfileBusy(true);
            setError('');
            try {
              const rows = await dmsApi.updateProfile(ownerProfile.id, profileForm);
              onProfileUpdated(rows?.[0] || { ...ownerProfile, ...profileForm });
            } catch (err) {
              setError(err.message || 'Profile update failed');
            } finally {
              setProfileBusy(false);
            }
          }}>
            <input placeholder="Owner name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
            <input placeholder="Owner email" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
            <input placeholder="Owner phone" inputMode="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
            <button className="btn primary" disabled={profileBusy}>{profileBusy ? 'Saving...' : 'Save owner profile'}</button>
          </form>
        </div>

        <div className="portal-card full-card">
          <div className="card-title"><h3>Clinic details</h3><p>Update clinic name, phone, email and address.</p></div>
          <form className="clinic-form" onSubmit={saveClinic}>
            <input placeholder="Clinic name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Clinic phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Clinic email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <textarea placeholder="Clinic address" rows="3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <button className="btn primary" disabled={busy}>{busy ? 'Saving...' : 'Save clinic details'}</button>
          </form>
        </div>
      </div>
    );
  }
}

function MiniAppointmentList({ items = [], large = false, onStatusChange, onDelete }) {
  if (!items.length) return <Empty title="No appointments" message="No appointments found for this filter." />;
  return <div className="table-list">{items.map((item) => {
    const patient = Array.isArray(item.patients) ? item.patients[0] : item.patients;
    return (
      <div className={large ? 'table-row large action-table-row' : 'table-row'} key={appointmentId(item)}>
        <div><b>{patient?.name || item.patient_name || 'Patient'}</b><small>{formatDateTime(item.appointment_time)} | {item.notes || 'No notes'}</small></div>
        <span>{item.status || 'scheduled'}</span>
        {large && (onStatusChange || onDelete) ? (
          <div className="row-actions">
            {onStatusChange ? <button type="button" onClick={() => onStatusChange(item, 'completed')}>Complete</button> : null}
            {onStatusChange ? <button type="button" onClick={() => onStatusChange(item, 'cancelled')}>Cancel</button> : null}
            {onDelete ? <button type="button" className="danger-action" onClick={() => onDelete(item)}>Delete</button> : null}
          </div>
        ) : null}
      </div>
    );
  })}</div>;
}

function MiniDueList({ items = [], large = false }) {
  if (!items.length) return <Empty title="No dues" message="No pending payments found." />;
  return <div className="table-list">{items.map((item) => {
    const message = `Hello ${item.patient_name}, this is a payment due reminder from Sri B.G Reddy Dental Clinic. Your pending amount is ${formatMoney(item.pending_amount)}. Please reply or contact reception. Thank you.`;
    const url = whatsappUrl(item.patient_phone, message);
    return <div className={large ? 'table-row large' : 'table-row'} key={item.patient_id}><div><b>{item.patient_name}</b><small>{item.patient_phone || 'No phone'} | {item.invoice_count || 0} invoice(s)</small></div><span>{formatMoney(item.pending_amount)}</span>{large && url ? <a className="mini-link" href={url} target="_blank" rel="noreferrer">WhatsApp</a> : null}</div>;
  })}</div>;
}


function MiniVisitList({ items = [], large = false }) {
  if (!items.length) return <Empty title="No visit audit records" message="No visit records found." />;

  return (
    <div className="table-list">
      {items.map((item) => (
        <div className={large ? 'table-row audit-row large' : 'table-row audit-row'} key={item.visit_id || `${item.patient_id}-${item.created_at}`}>
          <div>
            <b>{item.patient_name || 'Patient'}</b>
            <small>
              {item.patient_phone || 'No phone'}
              {item.patient_code ? ` | ${item.patient_code}` : ''}
              {item.visit_date ? ` | ${formatDateTime(item.visit_date)}` : ''}
            </small>
            <small>
              Complaint: {item.chief_complaint || 'Not recorded'}
              {item.next_appointment_date ? ` | Follow-up: ${formatDateTime(item.next_appointment_date)}` : ''}
            </small>
          </div>
          <span>{item.doctor_name || 'Doctor not recorded'}</span>
          {large ? <small className="audit-chip">Added by doctor</small> : null}
        </div>
      ))}
    </div>
  );
}

function MiniGalleryList({ items = [], large = false }) {
  if (!items.length) return <Empty title="No gallery uploads" message="No clinical photos/files found." />;

  return (
    <div className="table-list gallery-audit-list">
      {items.map((item) => (
        <div className={large ? 'table-row audit-row large' : 'table-row audit-row'} key={item.file_id || `${item.patient_id}-${item.created_at}-${item.file_name}`}>
          <div className="gallery-audit-main">
            {item.file_url ? <a className="file-thumb" href={item.file_url} target="_blank" rel="noreferrer"><img src={item.file_url} alt={item.file_name || 'Clinical file'} /></a> : <div className="file-thumb placeholder">File</div>}
            <div>
              <b>{fileTypeLabel(item.file_type)}</b>
              <small>
                {item.patient_name || 'Patient'}
                {item.patient_phone ? ` | ${item.patient_phone}` : ''}
                {item.patient_code ? ` | ${item.patient_code}` : ''}
              </small>
              <small>
                Uploaded by: {item.uploaded_by_name || 'Not recorded'}
                {item.created_at ? ` | ${formatDateTime(item.created_at)}` : ''}
              </small>
              {item.file_name ? <small>File: {item.file_name}</small> : null}
            </div>
          </div>
          <span>{item.uploaded_by_role ? roleLabel(item.uploaded_by_role) : 'Uploader'}</span>
          {large && item.file_url ? <a className="mini-link" href={item.file_url} target="_blank" rel="noreferrer">View</a> : null}
        </div>
      ))}
    </div>
  );
}


function App() {
  const [portalOpen, setPortalOpen] = useState(window.location.hash === '#dms');
  const [sessionState, setSessionState] = useState({ profile: null, clinic: null });
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function boot() {
      if (!dmsApi.token) {
        setBooting(false);
        return;
      }

      try {
        const profile = await dmsApi.getProfile();
        if (profile && isOwnerRole(profile.role)) {
          const clinic = await dmsApi.getClinic(profile.clinic_id);
          setSessionState({ profile, clinic });
        }
      } catch {
        dmsApi.clearSession();
      } finally {
        setBooting(false);
      }
    }
    boot();
  }, []);

  function openPortal(open) {
    setPortalOpen(open);
    if (open) window.location.hash = 'dms';
    else if (window.location.hash === '#dms') history.pushState('', document.title, window.location.pathname + window.location.search);
  }

  function logout() {
    dmsApi.clearSession();
    setSessionState({ profile: null, clinic: null });
    setPortalOpen(false);
  }

  return (
    <>
      <Header portalOpen={portalOpen} onOpenPortal={openPortal} onLogout={logout} profile={sessionState.profile} />
      {booting ? <main className="loading-panel full">Opening...</main> : portalOpen ? (
        sessionState.profile ? <OwnerDashboard profile={sessionState.profile} clinic={sessionState.clinic} onLogout={logout} /> : <LoginPanel onLoginSuccess={setSessionState} />
      ) : <PublicWebsite onOpenPortal={() => openPortal(true)} />}
      {!portalOpen && <Footer />}
      {!portalOpen && <MobileBar onOpenPortal={() => openPortal(true)} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);


