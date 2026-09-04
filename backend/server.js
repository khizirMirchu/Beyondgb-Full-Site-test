const express = require("express");
const path = require("path");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const app = express();
const db = require("./database");
const {
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  getAdminFromRequest,
  requireAdmin
} = require("./auth");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
const ROOT = path.join(__dirname, "..");

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use((req, res, next) => {
  // Protect authenticated state-changing admin requests from cross-site form submissions.
  if (req.path.startsWith("/api/admin/") && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && req.path !== "/api/admin/login") {
    const origin = req.headers.origin;
    if (origin) {
      const expected = `${req.protocol}://${req.get("host")}`;
      if (origin !== expected) return res.status(403).json({ success: false, message: "Invalid request origin." });
    }
  }
  next();
});


const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many enquiries. Please try again later." }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again later." }
});

// Never expose backend source files, database files, or .env through static hosting.
app.use((req, res, next) => {
  if (req.path === "/backend" || req.path.startsWith("/backend/")) {
    return res.status(404).send("Not found");
  }
  next();
});

// STEP 19: public published tour detail.
app.get("/api/tours/:slug", (req, res) => {
  try {
    const tour = db.prepare(`
      SELECT id, title, slug, destination AS location, duration, price, price_amount, price_currency, price_note, description, image,
             included, excluded, active AS published
      FROM tours
      WHERE slug = ? AND active = 1
      LIMIT 1
    `).get(req.params.slug);

    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found." });
    }

    res.json({ success: true, tour });
  } catch (error) {
    console.error("Public tour detail error:", error);
    res.status(500).json({ success: false, message: "Unable to load tour." });
  }
});


app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "BeyondGB backend is working!" });
});

app.get("/api/database-test", requireAdmin, (_req, res) => {
  try {
    const result = db.prepare("SELECT COUNT(*) AS count FROM enquiries").get();
    res.json({ success: true, database: "connected", enquiries: result.count });
  } catch (error) {
    console.error("Database test error:", error);
    res.status(500).json({ success: false, message: "Database test failed." });
  }
});

// Public enquiry endpoint.
app.post("/api/enquiries", enquiryLimiter, (req, res) => {
  try {
    const { name, email, phone, service, destination, date, travelers, budget, message, website, tour_id, accommodation, transport } = req.body;

    if (website) return res.status(400).json({ success: false, message: "Spam submission detected." });
    if (!name || !email || !phone || !service) return res.status(400).json({ success: false, message: "Please fill in all required fields." });
    if (typeof name !== "string" || name.length > 100) return res.status(400).json({ success: false, message: "Name is too long." });
    if (typeof email !== "string" || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    if (typeof phone !== "string" || phone.length > 30) return res.status(400).json({ success: false, message: "Phone number is too long." });
    if (typeof service !== "string" || service.length > 50) return res.status(400).json({ success: false, message: "Invalid service." });
    if (destination && (typeof destination !== "string" || destination.length > 100)) return res.status(400).json({ success: false, message: "Destination is too long." });
    if (message && (typeof message !== "string" || message.length > 2000)) return res.status(400).json({ success: false, message: "Message is too long." });
    if (accommodation && (typeof accommodation !== "string" || accommodation.length > 80)) return res.status(400).json({ success: false, message: "Accommodation preference is too long." });
    if (transport && (typeof transport !== "string" || transport.length > 80)) return res.status(400).json({ success: false, message: "Transport preference is too long." });

    let travelerCount = null;
    if (travelers !== undefined && travelers !== null && travelers !== "") {
      travelerCount = Number(travelers);
      if (!Number.isInteger(travelerCount) || travelerCount < 1 || travelerCount > 100) {
        return res.status(400).json({ success: false, message: "Please enter a valid number of travelers." });
      }
    }

    const insert = db.prepare(`
      INSERT INTO enquiries (name, email, whatsapp, service, destination, travel_date, travelers, budget, message, status, updated_at, tour_id, accommodation, transport)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', CURRENT_TIMESTAMP, ?, ?, ?)
    `);
    const result = insert.run(name.trim(), email.trim(), phone.trim(), service.trim(), destination || "", date || "", travelerCount, budget || "", message || "", Number.isInteger(Number(tour_id)) ? Number(tour_id) : null, accommodation || "", transport || "");

    console.log("New enquiry received:", result.lastInsertRowid);
    res.json({ success: true, message: "Your enquiry has been received.", enquiryId: result.lastInsertRowid });
  } catch (error) {
    console.error("Enquiry error:", error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
});

// Public tour listing: only active tours are exposed to the public website.
app.get("/api/tours", (_req, res) => {
  try {
    const tours = db.prepare(`
      SELECT id, title, slug, destination, description, price, duration, difficulty, image,
        (SELECT date FROM availability a WHERE a.tour_id = tours.id AND date >= date('now') ORDER BY date ASC, id ASC LIMIT 1) AS next_available_date,
        (SELECT status FROM availability a WHERE a.tour_id = tours.id AND date >= date('now') ORDER BY date ASC, id ASC LIMIT 1) AS next_available_status,
        (SELECT seats FROM availability a WHERE a.tour_id = tours.id AND date >= date('now') ORDER BY date ASC, id ASC LIMIT 1) AS next_available_seats
      FROM tours
      WHERE active = 1
      ORDER BY created_at DESC, id DESC
    `).all();
    res.json({ success: true, tours });
  } catch (error) {
    console.error("Public tours error:", error);
    res.status(500).json({ success: false, message: "Unable to load tours." });
  }
});

// Public destination listing: only active destinations are exposed.
app.get("/api/destinations", (_req, res) => {
  try {
    const destinations = db.prepare(`
      SELECT id, name, slug, description, image, region AS location, best_season, highlights, price_amount, price_currency
      FROM destinations
      WHERE active = 1
      ORDER BY created_at ASC, id ASC
    `).all();
    res.json({ success: true, destinations });
  } catch (error) {
    console.error("Public destinations error:", error);
    res.status(500).json({ success: false, message: "Unable to load destinations." });
  }
});

// Public single-destination endpoint.
app.get("/api/destinations/:slug", (req, res) => {
  try {
    const destination = db.prepare(`
      SELECT id, name, slug, description, image, region AS location, best_season, highlights, price_amount, price_currency
      FROM destinations
      WHERE slug = ? AND active = 1
      LIMIT 1
    `).get(req.params.slug);
    if (!destination) {
      return res.status(404).json({ success: false, message: "Destination not found." });
    }
    res.json({ success: true, destination });
  } catch (error) {
    console.error("Public destination error:", error);
    res.status(500).json({ success: false, message: "Unable to load destination." });
  }
});



// Step 21: public videos are intentionally separate from the image gallery.
app.get("/api/gallery/videos", (req, res) => {
  try {
    const videos = db.prepare(`
      SELECT id, title, category, description, featured, published, video_url, image
      FROM gallery
      WHERE published = 1 AND media_type = 'video'
      ORDER BY featured DESC, created_at DESC, id DESC
    `).all();
    res.json({ success: true, videos });
  } catch (error) {
    console.error("Public videos error:", error);
    res.status(500).json({ success: false, message: "Unable to load videos." });
  }
});


// Step 23: Homepage dynamic content endpoint.
// IMPORTANT: the CMS uses active for destinations/tours/gallery and published for testimonials.
// Keep the public API normalized so the frontend never has to know the database column names.
app.get("/api/homepage", (_req, res) => {
  try {
    const tours = db.prepare(`
      SELECT id, title, slug, destination AS location, duration, price, description, image, active AS published
      FROM tours
      WHERE active = 1
      ORDER BY created_at DESC, id DESC
      LIMIT 6
    `).all();

    const destinations = db.prepare(`
      SELECT id, name, slug, description, image, region AS location, best_season, highlights, price_amount, price_currency
      FROM destinations
      WHERE active = 1
      ORDER BY created_at DESC, id DESC
      LIMIT 6
    `).all();

    const testimonials = db.prepare(`
      SELECT id, customer_name AS name, location, review AS message, rating, published, created_at
      FROM testimonials
      WHERE published = 1
      UNION ALL
      SELECT id, customer_name AS name, destination AS location, review AS message, rating, published, created_at
      FROM customer_reviews
      WHERE published = 1
      ORDER BY created_at DESC, id DESC
      LIMIT 6
    `).all();

    const gallery = db.prepare(`
      SELECT id, title, image, category, caption AS description, featured, active AS published, media_type, video_url
      FROM gallery
      WHERE active = 1 AND (media_type IS NULL OR media_type = 'image')
      ORDER BY featured DESC, created_at DESC, id DESC
      LIMIT 8
    `).all();

    res.json({ success: true, tours, destinations, testimonials, gallery });
  } catch (error) {
    console.error("Homepage dynamic content error:", error);
    res.status(500).json({ success: false, message: "Unable to load homepage content." });
  }
});


// Step 24: public journal endpoint.
app.get("/api/journal", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, title, slug, excerpt, content, image, category, author, published, created_at
      FROM journal
      WHERE published = 1
      ORDER BY id DESC LIMIT 30
    `).all();
    res.json({success:true, posts:rows});
  } catch (error) {
    // Some older builds call the table "blog"; support it without breaking existing data.
    try {
      const rows = db.prepare(`
        SELECT id, title, slug, excerpt, content, image, category, author, published, created_at
        FROM blog WHERE published = 1 ORDER BY id DESC LIMIT 30
      `).all();
      res.json({success:true, posts:rows});
    } catch (fallbackError) {
      console.error("Journal endpoint error:", error);
      res.status(500).json({success:false,message:"Journal is not configured yet."});
    }
  }
});


// Step 25: public FAQ endpoint.
app.get("/api/faq", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, question, answer, category, published
      FROM faq WHERE published = 1 ORDER BY id ASC
    `).all();
    res.json({success:true, faqs:rows});
  } catch (error) {
    try {
      const rows = db.prepare(`
        SELECT id, question, answer, category, published
        FROM faqs WHERE published = 1 ORDER BY id ASC
      `).all();
      res.json({success:true, faqs:rows});
    } catch (fallbackError) {
      console.error("FAQ endpoint error:", error);
      res.status(500).json({success:false,message:"FAQ is not configured yet."});
    }
  }
});

// Public testimonials: only published reviews are exposed.
app.get("/api/testimonials", (_req, res) => {
  try {
    const adminTestimonials = db.prepare(`
      SELECT id, customer_name, location, review, rating, photo, created_at
      FROM testimonials
      WHERE published = 1
      ORDER BY created_at DESC, id DESC
    `).all().map(x => ({...x, source: "admin"}));
    const customerReviews = db.prepare(`
      SELECT id, customer_name, destination AS location, review, rating, NULL AS photo, created_at
      FROM customer_reviews
      WHERE published = 1
      ORDER BY created_at DESC, id DESC
    `).all().map(x => ({...x, source: "customer"}));
    const testimonials = [...adminTestimonials, ...customerReviews]
      .sort((a,b) => String(b.created_at||"").localeCompare(String(a.created_at||"")) || Number(b.id||0)-Number(a.id||0));
    res.json({ success: true, testimonials });
  } catch (error) {
    console.error("Public testimonials error:", error);
    res.status(500).json({ success: false, message: "Unable to load testimonials." });
  }
});

// Steps 61–62: free map services. Nominatim is used for place search/geocoding and
// OSRM for road routing. Both are proxied server-side so browser pages never need an API key.
const mapGeocodeLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const mapRouteLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.get("/api/map/geocode", mapGeocodeLimiter, async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 180) : "";
    if (!q) return res.status(400).json({ success: false, message: "A place search is required." });
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=pk&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, { headers: { "User-Agent": "BeyondGB/1.0 map search" } });
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
    const data = await response.json();
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ success: true, results: Array.isArray(data) ? data.map(x => ({ lat: Number(x.lat), lon: Number(x.lon), name: x.display_name, type: x.type })) : [] });
  } catch (error) {
    console.error("Map geocode error:", error);
    res.status(502).json({ success: false, message: "Map search is temporarily unavailable." });
  }
});

app.get("/api/map/route", mapRouteLimiter, async (req, res) => {
  try {
    const coords = typeof req.query.coords === "string" ? req.query.coords.trim() : "";
    if (!/^[-\\d.]+,[-\\d.]+(?:;[-\\d.]+,[-\\d.]+)+$/.test(coords)) {
      return res.status(400).json({ success: false, message: "At least two valid coordinates are required." });
    }
    const url = `https://router.project-osrm.org/route/v1/driving/${coords.replaceAll(';', ';')}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(url, { headers: { "User-Agent": "BeyondGB/1.0 routing" } });
    if (!response.ok) throw new Error(`Router returned ${response.status}`);
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) return res.json({ success: true, route: null });
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ success: true, route: { distance: route.distance, duration: route.duration, geometry: route.geometry, legs: route.legs || [] } });
  } catch (error) {
    console.error("Map route error:", error);
    res.status(502).json({ success: false, message: "Road routing is temporarily unavailable." });
  }
});

// Admin authentication.
app.post("/api/admin/login", loginLimiter, (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const admin = db.prepare("SELECT id, username, password_hash FROM admins WHERE username = ?").get(username);

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ success: false, message: "Invalid username or password." });
  }

  db.prepare("DELETE FROM admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP").run();
  const token = createSession(admin.id);
  setSessionCookie(res, token);
  res.json({ success: true, admin: { id: admin.id, username: admin.username } });
});

app.get("/api/admin/me", (req, res) => {
  const admin = getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ success: false, message: "Not authenticated." });
  res.json({ success: true, admin: { id: admin.id, username: admin.username } });
});

app.post("/api/admin/logout", (req, res) => {
  const admin = getAdminFromRequest(req);
  if (admin) destroySession(admin.token);
  clearSessionCookie(res);
  res.json({ success: true });
});

// Protected admin dashboard data.
// Step 26: public site settings. Sensitive values are never stored here; only website-facing settings are returned.
// Steps 61–62: public calculator configuration. Only non-sensitive pricing values are exposed.
app.get("/api/pricing-config", (_req, res) => {
  try {
    const keys = [
      "calculator_standard_accommodation", "calculator_comfort_accommodation", "calculator_premium_accommodation",
      "calculator_shared_transport", "calculator_private_transport", "calculator_luxury_transport", "calculator_activity", "calculator_tour_pricing"
    ];
    const rows = db.prepare(`SELECT key, value FROM site_settings WHERE key IN (${keys.map(() => "?").join(",")})`).all(...keys);
    const settings = Object.fromEntries(rows.map(r => [r.key, r.key === "calculator_tour_pricing" ? (r.value || "[]") : (Number(r.value) || 0)]));
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Pricing config error:", error);
    res.status(500).json({ success: false, message: "Unable to load calculator pricing." });
  }
});

app.get("/api/settings", (_req, res) => {
  try {
    const rows = db.prepare("SELECT key, value FROM site_settings").all();
    const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Public settings error:", error);
    res.status(500).json({ success: false, message: "Unable to load site settings." });
  }
});

function cleanSetting(key, value) {
  const limits = {
    company_name: 150, company_description: 500, whatsapp: 40, phone: 40, email: 150,
    address: 250, opening_hours: 250, facebook: 500, instagram: 500, youtube: 500, tiktok: 500,
    logo: 500, seo_title: 180, seo_description: 320,
    calculator_standard_accommodation: 20, calculator_comfort_accommodation: 20, calculator_premium_accommodation: 20,
    calculator_shared_transport: 20, calculator_private_transport: 20, calculator_luxury_transport: 20, calculator_activity: 20, calculator_tour_pricing: 12000
  };
  if (!Object.prototype.hasOwnProperty.call(limits, key)) return null;
  if (typeof value !== "string") return null;
  return value.trim().slice(0, limits[key]);
}

app.get("/api/admin/settings", requireAdmin, (_req, res) => {
  try {
    const rows = db.prepare("SELECT key, value, updated_at FROM site_settings ORDER BY key").all();
    const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Admin settings error:", error);
    res.status(500).json({ success: false, message: "Unable to load settings." });
  }
});

app.patch("/api/admin/settings", requireAdmin, (req, res) => {
  try {
    const incoming = req.body && typeof req.body === "object" ? req.body : {};
    const update = db.prepare(`
      INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
    `);
    const changed = {};
    for (const [key, rawValue] of Object.entries(incoming)) {
      const value = cleanSetting(key, rawValue);
      if (value === null) continue;
      update.run(key, value);
      changed[key] = value;
    }
    const rows = db.prepare("SELECT key, value FROM site_settings").all();
    const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
    res.json({ success: true, settings, changed });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ success: false, message: "Unable to save settings." });
  }
});

// Step 53: public published customer reviews.
app.get("/api/reviews", (req, res) => {
  try {
    const tourId = req.query.tour_id ? Number(req.query.tour_id) : null;
    const destination = typeof req.query.destination === "string" ? req.query.destination.trim().slice(0, 100) : "";
    let rows;
    if (Number.isInteger(tourId) && tourId > 0) {
      rows = db.prepare(`SELECT id, customer_name, rating, review, created_at FROM customer_reviews WHERE published = 1 AND tour_id = ? ORDER BY created_at DESC, id DESC`).all(tourId);
    } else if (destination) {
      rows = db.prepare(`SELECT id, customer_name, rating, review, created_at FROM customer_reviews WHERE published = 1 AND destination = ? ORDER BY created_at DESC, id DESC`).all(destination);
    } else {
      rows = db.prepare(`SELECT id, customer_name, rating, review, created_at FROM customer_reviews WHERE published = 1 ORDER BY created_at DESC, id DESC LIMIT 20`).all();
    }
    res.json({ success: true, reviews: rows });
  } catch (error) {
    console.error("Public reviews error:", error);
    res.status(500).json({ success: false, message: "Unable to load reviews." });
  }
});

// Step 53: public review submission. Reviews are hidden until approved by admin.
app.post("/api/reviews", enquiryLimiter, (req, res) => {
  try {
    const { tour_id, destination, customer_name, rating, review, website } = req.body || {};
    if (website) return res.status(400).json({ success: false, message: "Spam submission detected." });
    const name = typeof customer_name === "string" ? customer_name.trim() : "";
    const text = typeof review === "string" ? review.trim() : "";
    const dest = typeof destination === "string" ? destination.trim().slice(0,100) : "";
    const score = Number(rating);
    const tid = tour_id === undefined || tour_id === null || tour_id === "" ? null : Number(tour_id);
    if (!name || name.length > 120 || !text || text.length > 2000) return res.status(400).json({ success: false, message: "Please provide a valid name and review." });
    if (!Number.isInteger(score) || score < 1 || score > 5) return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    if (tid !== null && (!Number.isInteger(tid) || tid < 1 || !db.prepare("SELECT id FROM tours WHERE id=? AND active=1").get(tid))) return res.status(400).json({ success: false, message: "Invalid journey." });
    const result = db.prepare(`INSERT INTO customer_reviews (tour_id, destination, customer_name, rating, review, published) VALUES (?, ?, ?, ?, ?, 0)`).run(tid, dest, name, score, text);
    res.status(201).json({ success: true, message: "Thank you. Your review has been submitted for approval.", reviewId: result.lastInsertRowid });
  } catch (error) {
    console.error("Review submission error:", error);
    res.status(500).json({ success: false, message: "Unable to submit review." });
  }
});

// Step 53: admin customer review moderation.
app.get("/api/admin/reviews", requireAdmin, (_req, res) => {
  try {
    const reviews = db.prepare(`SELECT r.*, t.title AS tour_title FROM customer_reviews r LEFT JOIN tours t ON t.id = r.tour_id ORDER BY r.published ASC, r.created_at DESC, r.id DESC`).all();
    res.json({ success: true, reviews });
  } catch (error) { res.status(500).json({ success: false, message: "Unable to load reviews." }); }
});
app.patch("/api/admin/reviews/:id", requireAdmin, (req, res) => {
  try {
    const id=Number(req.params.id); const row=db.prepare("SELECT id FROM customer_reviews WHERE id=?").get(id);
    if(!row) return res.status(404).json({success:false,message:"Review not found."});
    if(typeof req.body.published !== "undefined") db.prepare("UPDATE customer_reviews SET published=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(req.body.published?1:0,id);
    res.json({success:true,review:db.prepare("SELECT * FROM customer_reviews WHERE id=?").get(id)});
  } catch(error){res.status(500).json({success:false,message:"Unable to update review."});}
});
app.delete("/api/admin/reviews/:id", requireAdmin, (req,res)=>{try{const id=Number(req.params.id);const r=db.prepare("DELETE FROM customer_reviews WHERE id=?").run(id);if(!r.changes)return res.status(404).json({success:false,message:"Review not found."});res.json({success:true});}catch(error){res.status(500).json({success:false,message:"Unable to delete review."});}});

// Step 54: lightweight business analytics from existing database data.
app.get("/api/admin/analytics", requireAdmin, (_req,res)=>{
  try {
    const count=table=>db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
    const status=db.prepare(`SELECT status, COUNT(*) AS count FROM enquiries GROUP BY status ORDER BY count DESC`).all();
    const destinations=db.prepare(`SELECT destination, COUNT(*) AS count FROM enquiries WHERE destination IS NOT NULL AND TRIM(destination)<>'' GROUP BY destination ORDER BY count DESC LIMIT 8`).all();
    const upcoming=db.prepare(`SELECT a.date,a.status,a.seats,t.title FROM availability a LEFT JOIN tours t ON t.id=a.tour_id WHERE a.date>=date('now') ORDER BY a.date ASC LIMIT 8`).all();
    res.json({success:true, totals:{tours:count('tours'),destinations:count('destinations'),enquiries:count('enquiries'),reviews:count('customer_reviews'),published_reviews:db.prepare("SELECT COUNT(*) AS count FROM customer_reviews WHERE published=1").get().count,journal:count('journal')}, enquiry_status:status, popular_destinations:destinations, upcoming});
  }catch(error){console.error("Analytics error:",error);res.status(500).json({success:false,message:"Unable to load analytics."});}
});

app.get("/api/admin/stats", requireAdmin, (_req, res) => {
  const total = db.prepare("SELECT COUNT(*) AS count FROM enquiries").get().count;
  const newCount = db.prepare("SELECT COUNT(*) AS count FROM enquiries WHERE status = 'new'").get().count;
  const contacted = db.prepare("SELECT COUNT(*) AS count FROM enquiries WHERE status = 'contacted'").get().count;
  const confirmed = db.prepare("SELECT COUNT(*) AS count FROM enquiries WHERE status = 'confirmed'").get().count;
  const completed = db.prepare("SELECT COUNT(*) AS count FROM enquiries WHERE status = 'completed'").get().count;
  res.json({ success: true, stats: { total, new: newCount, contacted, confirmed, completed } });
});

app.get("/api/admin/enquiries", requireAdmin, (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
  const allowed = new Set(["new", "contacted", "confirmed", "completed"]);
  const conditions = [];
  const values = [];
  if (allowed.has(status)) {
    conditions.push("status = ?");
    values.push(status);
  }
  if (search) {
    conditions.push("(name LIKE ? OR email LIKE ? OR whatsapp LIKE ? OR destination LIKE ? OR service LIKE ?)");
    const term = `%${search}%`;
    values.push(term, term, term, term, term);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT e.*, t.title AS tour_title FROM enquiries e LEFT JOIN tours t ON t.id = e.tour_id${where.replace("status", "e.status").replace("name LIKE", "e.name LIKE").replace("email LIKE", "e.email LIKE").replace("whatsapp LIKE", "e.whatsapp LIKE").replace("destination LIKE", "e.destination LIKE").replace("service LIKE", "e.service LIKE")} ORDER BY e.created_at DESC, e.id DESC`).all(...values);
  res.json({ success: true, enquiries: rows });
});

app.patch("/api/admin/enquiries/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = typeof req.body.status === "string" ? req.body.status : "";
  const notes = typeof req.body.notes === "string" ? req.body.notes.trim().slice(0, 2000) : null;
  const follow_up_date = typeof req.body.follow_up_date === "string" ? req.body.follow_up_date.slice(0, 10) : null;
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: "Invalid enquiry ID." });
  if (!["new", "contacted", "confirmed", "completed"].includes(status)) return res.status(400).json({ success: false, message: "Invalid enquiry status." });

  const result = db.prepare("UPDATE enquiries SET status = ?, notes = COALESCE(?, notes), follow_up_date = COALESCE(?, follow_up_date), updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, notes, follow_up_date, id);
  if (!result.changes) return res.status(404).json({ success: false, message: "Enquiry not found." });
  res.json({ success: true });
});

app.delete("/api/admin/enquiries/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: "Invalid enquiry ID." });
  const result = db.prepare("DELETE FROM enquiries WHERE id = ?").run(id);
  if (!result.changes) return res.status(404).json({ success: false, message: "Enquiry not found." });
  res.json({ success: true });
});



// Admin testimonial/review management.
function normalizeTestimonialPayload(body = {}) {
  const customer_name = typeof body.customer_name === "string" ? body.customer_name.trim().slice(0, 120) : "";
  const location = typeof body.location === "string" ? body.location.trim().slice(0, 120) : "";
  const review = typeof body.review === "string" ? body.review.trim().slice(0, 2000) : "";
  const photo = typeof body.photo === "string" ? body.photo.trim().slice(0, 500) : "";
  let rating = Number(body.rating);
  if (!Number.isInteger(rating)) rating = 5;
  rating = Math.max(1, Math.min(5, rating));
  const published = body.published === undefined ? 1 : (body.published ? 1 : 0);
  return { customer_name, location, review, rating, photo, published };
}

app.get("/api/admin/testimonials", requireAdmin, (_req, res) => {
  try {
    const testimonials = db.prepare(`
      SELECT id, customer_name, location, review, rating, photo, published, created_at, 'testimonial' AS source
      FROM testimonials
      UNION ALL
      SELECT id, customer_name, destination AS location, review, rating, NULL AS photo, published, created_at, 'customer_review' AS source
      FROM customer_reviews
      ORDER BY published DESC, created_at DESC, id DESC
    `).all();
    res.json({ success: true, testimonials });
  } catch (error) {
    console.error("Admin testimonials error:", error);
    res.status(500).json({ success: false, message: "Unable to load testimonials." });
  }
});

app.post("/api/admin/testimonials", requireAdmin, (req, res) => {
  try {
    const item = normalizeTestimonialPayload(req.body);
    if (!item.customer_name) return res.status(400).json({ success: false, message: "Customer name is required." });
    if (!item.review) return res.status(400).json({ success: false, message: "Review text is required." });

    const result = db.prepare(`
      INSERT INTO testimonials (customer_name, location, review, rating, photo, published, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      item.customer_name,
      item.location,
      item.review,
      item.rating,
      item.photo,
      item.published
    );

    const created = db.prepare("SELECT * FROM testimonials WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ success: true, testimonial: created });
  } catch (error) {
    console.error("Create testimonial error:", error);
    res.status(500).json({ success: false, message: "Unable to create testimonial." });
  }
});

app.patch("/api/admin/testimonials/:id", requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid testimonial ID." });
    }

    const current = db.prepare("SELECT * FROM testimonials WHERE id = ?").get(id);
    if (!current) return res.status(404).json({ success: false, message: "Testimonial not found." });

    const item = normalizeTestimonialPayload({ ...current, ...req.body });
    if (!item.customer_name) return res.status(400).json({ success: false, message: "Customer name is required." });
    if (!item.review) return res.status(400).json({ success: false, message: "Review text is required." });

    db.prepare(`
      UPDATE testimonials
      SET customer_name = ?, location = ?, review = ?, rating = ?, photo = ?, published = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      item.customer_name,
      item.location,
      item.review,
      item.rating,
      item.photo,
      item.published,
      id
    );

    const updated = db.prepare("SELECT * FROM testimonials WHERE id = ?").get(id);
    res.json({ success: true, testimonial: updated });
  } catch (error) {
    console.error("Update testimonial error:", error);
    res.status(500).json({ success: false, message: "Unable to update testimonial." });
  }
});

app.delete("/api/admin/testimonials/:id", requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid testimonial ID." });
    }

    const result = db.prepare("DELETE FROM testimonials WHERE id = ?").run(id);
    if (!result.changes) return res.status(404).json({ success: false, message: "Testimonial not found." });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete testimonial error:", error);
    res.status(500).json({ success: false, message: "Unable to delete testimonial." });
  }
});

// Admin tour/package management.
function makeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function normalizeTourPayload(body = {}) {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 150) : "";
  const destination = typeof body.destination === "string" ? body.destination.trim().slice(0, 100) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 3000) : "";
  const price = typeof body.price === "string" ? body.price.trim().slice(0, 100) : "";
  const priceAmount = body.price_amount === "" || body.price_amount === null || body.price_amount === undefined ? null : Number(body.price_amount);
  const priceCurrency = typeof body.price_currency === "string" ? body.price_currency.trim().slice(0, 10).toUpperCase() : "PKR";
  const priceNote = typeof body.price_note === "string" ? body.price_note.trim().slice(0, 80) : "";
  const duration = typeof body.duration === "string" ? body.duration.trim().slice(0, 100) : "";
  const difficulty = typeof body.difficulty === "string" ? body.difficulty.trim().slice(0, 50) : "";
  const image = typeof body.image === "string" ? body.image.trim().slice(0, 500) : "";
  const active = body.active === undefined ? 1 : (body.active ? 1 : 0);
  return { title, destination, description, price, priceAmount: Number.isFinite(priceAmount) && priceAmount >= 0 ? priceAmount : null, priceCurrency: priceCurrency || "PKR", priceNote, duration, difficulty, image, active };
}

app.get("/api/admin/tours", requireAdmin, (_req, res) => {
  const tours = db.prepare("SELECT * FROM tours ORDER BY active DESC, created_at DESC, id DESC").all();
  res.json({ success: true, tours });
});

app.post("/api/admin/tours", requireAdmin, (req, res) => {
  const tour = normalizeTourPayload(req.body);
  if (!tour.title) return res.status(400).json({ success: false, message: "Tour title is required." });

  let slug = makeSlug(req.body.slug || tour.title);
  if (!slug) return res.status(400).json({ success: false, message: "A valid tour title or slug is required." });

  const existing = db.prepare("SELECT id FROM tours WHERE slug = ?").get(slug);
  if (existing) slug = `${slug}-${Date.now().toString().slice(-6)}`;

  const result = db.prepare(`
    INSERT INTO tours (title, slug, destination, description, price, price_amount, price_currency, price_note, duration, difficulty, image, active, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(tour.title, slug, tour.destination, tour.description, tour.price, tour.priceAmount, tour.priceCurrency, tour.priceNote, tour.duration, tour.difficulty, tour.image, tour.active);

  const created = db.prepare("SELECT * FROM tours WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ success: true, tour: created });
});

app.patch("/api/admin/tours/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: "Invalid tour ID." });

  const current = db.prepare("SELECT * FROM tours WHERE id = ?").get(id);
  if (!current) return res.status(404).json({ success: false, message: "Tour not found." });

  const tour = normalizeTourPayload({ ...current, ...req.body });
  if (!tour.title) return res.status(400).json({ success: false, message: "Tour title is required." });

  let slug = makeSlug(req.body.slug !== undefined ? req.body.slug : current.slug);
  if (!slug) slug = makeSlug(tour.title);
  const conflict = db.prepare("SELECT id FROM tours WHERE slug = ? AND id <> ?").get(slug, id);
  if (conflict) return res.status(409).json({ success: false, message: "That tour slug is already in use." });

  db.prepare(`
    UPDATE tours
    SET title = ?, slug = ?, destination = ?, description = ?, price = ?, price_amount = ?, price_currency = ?, price_note = ?, duration = ?,
        difficulty = ?, image = ?, active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(tour.title, slug, tour.destination, tour.description, tour.price, tour.priceAmount, tour.priceCurrency, tour.priceNote, tour.duration, tour.difficulty, tour.image, tour.active, id);

  const updated = db.prepare("SELECT * FROM tours WHERE id = ?").get(id);
  res.json({ success: true, tour: updated });
});

app.delete("/api/admin/tours/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: "Invalid tour ID." });

  const result = db.prepare("DELETE FROM tours WHERE id = ?").run(id);
  if (!result.changes) return res.status(404).json({ success: false, message: "Tour not found." });
  res.json({ success: true });
});


// Step 42: public availability for an active journey.
app.get("/api/tours/:slug/availability", (req, res) => {
  try {
    const tour = db.prepare("SELECT id FROM tours WHERE slug = ? AND active = 1 LIMIT 1").get(req.params.slug);
    if (!tour) return res.status(404).json({ success: false, message: "Journey not found." });
    const dates = db.prepare(`
      SELECT id, date, seats, status, notes
      FROM availability
      WHERE tour_id = ? AND date >= date('now')
      ORDER BY date ASC, id ASC
      LIMIT 30
    `).all(tour.id);
    res.json({ success: true, availability: dates });
  } catch (error) {
    console.error("Public availability error:", error);
    res.status(500).json({ success: false, message: "Unable to load availability." });
  }
});

app.get("/api/admin/availability", requireAdmin, (_req, res) => {
  try {
    const rows = db.prepare(`
      SELECT a.*, t.title AS tour_title
      FROM availability a
      LEFT JOIN tours t ON t.id = a.tour_id
      ORDER BY a.date ASC, a.id ASC
    `).all();
    res.json({ success: true, availability: rows });
  } catch (error) {
    console.error("Admin availability list error:", error);
    res.status(500).json({ success: false, message: "Unable to load availability." });
  }
});

app.post("/api/admin/availability", requireAdmin, (req, res) => {
  const tourId = Number(req.body.tour_id);
  const date = typeof req.body.date === "string" ? req.body.date.trim() : "";
  const seats = req.body.seats === "" || req.body.seats === null || req.body.seats === undefined ? null : Number(req.body.seats);
  const status = ["available", "limited", "full"].includes(req.body.status) ? req.body.status : "available";
  const notes = typeof req.body.notes === "string" ? req.body.notes.trim().slice(0, 500) : "";
  if (!Number.isInteger(tourId) || tourId < 1) return res.status(400).json({ success:false, message:"Select a valid journey." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success:false, message:"Enter a valid date." });
  if (seats !== null && (!Number.isInteger(seats) || seats < 0 || seats > 100000)) return res.status(400).json({ success:false, message:"Seats must be a valid non-negative number." });
  const tour = db.prepare("SELECT id FROM tours WHERE id = ?").get(tourId);
  if (!tour) return res.status(404).json({ success:false, message:"Journey not found." });
  const result = db.prepare("INSERT INTO availability (tour_id, date, seats, status, notes, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)").run(tourId, date, seats, status, notes);
  const created = db.prepare(`SELECT a.*, t.title AS tour_title FROM availability a LEFT JOIN tours t ON t.id=a.tour_id WHERE a.id=?`).get(result.lastInsertRowid);
  res.status(201).json({ success:true, availability:created });
});

app.patch("/api/admin/availability/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare("SELECT * FROM availability WHERE id=?").get(id);
  if (!Number.isInteger(id) || id < 1 || !current) return res.status(404).json({ success:false, message:"Availability entry not found." });
  const tourId = req.body.tour_id === undefined ? current.tour_id : Number(req.body.tour_id);
  const date = req.body.date === undefined ? current.date : String(req.body.date).trim();
  const seats = req.body.seats === undefined || req.body.seats === "" || req.body.seats === null ? null : Number(req.body.seats);
  const status = req.body.status === undefined ? current.status : req.body.status;
  const notes = req.body.notes === undefined ? (current.notes || "") : String(req.body.notes).trim().slice(0,500);
  if (!Number.isInteger(tourId) || tourId < 1 || !db.prepare("SELECT id FROM tours WHERE id=?").get(tourId)) return res.status(400).json({success:false,message:"Select a valid journey."});
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["available","limited","full"].includes(status)) return res.status(400).json({success:false,message:"Invalid availability data."});
  if (seats !== null && (!Number.isInteger(seats) || seats < 0)) return res.status(400).json({success:false,message:"Invalid seat count."});
  db.prepare("UPDATE availability SET tour_id=?, date=?, seats=?, status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(tourId,date,seats,status,notes,id);
  const updated=db.prepare(`SELECT a.*, t.title AS tour_title FROM availability a LEFT JOIN tours t ON t.id=a.tour_id WHERE a.id=?`).get(id);
  res.json({success:true,availability:updated});
});

app.delete("/api/admin/availability/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({success:false,message:"Invalid availability ID."});
  const result=db.prepare("DELETE FROM availability WHERE id=?").run(id);
  if (!result.changes) return res.status(404).json({success:false,message:"Availability entry not found."});
  res.json({success:true});
});

// Steps 49–50: itinerary and media management for published journeys.
app.get("/api/tours/:slug/itinerary", (req, res) => {
  try {
    const tour = db.prepare("SELECT id FROM tours WHERE slug = ? AND active = 1 LIMIT 1").get(req.params.slug);
    if (!tour) return res.status(404).json({ success:false, message:"Tour not found." });
    const items = db.prepare("SELECT id, day, title, details FROM tour_itinerary WHERE tour_id=? ORDER BY day ASC, id ASC").all(tour.id);
    res.json({success:true, itinerary:items});
  } catch (error) { console.error("Public itinerary error:", error); res.status(500).json({success:false,message:"Unable to load itinerary."}); }
});

app.get("/api/tours/:slug/media", (req, res) => {
  try {
    const tour = db.prepare("SELECT id FROM tours WHERE slug = ? AND active = 1 LIMIT 1").get(req.params.slug);
    if (!tour) return res.status(404).json({ success:false, message:"Tour not found." });
    const media = db.prepare("SELECT id, image, caption FROM tour_media WHERE tour_id=? ORDER BY sort_order ASC, id ASC").all(tour.id);
    res.json({success:true, media});
  } catch (error) { console.error("Public tour media error:", error); res.status(500).json({success:false,message:"Unable to load tour media."}); }
});

app.get("/api/admin/itinerary/:tourId", requireAdmin, (req,res)=>{
  const tourId=Number(req.params.tourId);
  if(!Number.isInteger(tourId)||tourId<1) return res.status(400).json({success:false,message:"Invalid tour ID."});
  res.json({success:true,itinerary:db.prepare("SELECT * FROM tour_itinerary WHERE tour_id=? ORDER BY day ASC,id ASC").all(tourId)});
});

app.post("/api/admin/itinerary", requireAdmin, (req,res)=>{
  const tourId=Number(req.body.tour_id), day=Number(req.body.day);
  const title=typeof req.body.title==="string"?req.body.title.trim().slice(0,150):"";
  const details=typeof req.body.details==="string"?req.body.details.trim().slice(0,3000):"";
  if(!Number.isInteger(tourId)||tourId<1||!db.prepare("SELECT id FROM tours WHERE id=?").get(tourId)) return res.status(400).json({success:false,message:"Valid journey is required."});
  if(!Number.isInteger(day)||day<1||day>365||!title) return res.status(400).json({success:false,message:"Day and title are required."});
  const result=db.prepare("INSERT INTO tour_itinerary (tour_id,day,title,details,updated_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)").run(tourId,day,title,details);
  res.status(201).json({success:true,itinerary:db.prepare("SELECT * FROM tour_itinerary WHERE id=?").get(result.lastInsertRowid)});
});

app.patch("/api/admin/itinerary/:id", requireAdmin, (req,res)=>{
  const id=Number(req.params.id); const current=db.prepare("SELECT * FROM tour_itinerary WHERE id=?").get(id);
  if(!Number.isInteger(id)||id<1||!current) return res.status(404).json({success:false,message:"Itinerary item not found."});
  const day=Number(req.body.day), title=typeof req.body.title==="string"?req.body.title.trim().slice(0,150):"", details=typeof req.body.details==="string"?req.body.details.trim().slice(0,3000):"";
  if(!Number.isInteger(day)||day<1||day>365||!title) return res.status(400).json({success:false,message:"Day and title are required."});
  db.prepare("UPDATE tour_itinerary SET day=?,title=?,details=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(day,title,details,id);
  res.json({success:true,itinerary:db.prepare("SELECT * FROM tour_itinerary WHERE id=?").get(id)});
});

app.delete("/api/admin/itinerary/:id", requireAdmin, (req,res)=>{ const id=Number(req.params.id); const r=db.prepare("DELETE FROM tour_itinerary WHERE id=?").run(id); if(!r.changes)return res.status(404).json({success:false,message:"Itinerary item not found."}); res.json({success:true}); });

app.get("/api/admin/tour-media/:tourId", requireAdmin, (req,res)=>{ const tourId=Number(req.params.tourId); if(!Number.isInteger(tourId)||tourId<1)return res.status(400).json({success:false,message:"Invalid tour ID."}); res.json({success:true,media:db.prepare("SELECT * FROM tour_media WHERE tour_id=? ORDER BY sort_order ASC,id ASC").all(tourId)}); });

app.post("/api/admin/tour-media", requireAdmin, (req,res)=>{ const tourId=Number(req.body.tour_id), image=typeof req.body.image==="string"?req.body.image.trim().slice(0,500):"", caption=typeof req.body.caption==="string"?req.body.caption.trim().slice(0,300):""; if(!Number.isInteger(tourId)||tourId<1||!db.prepare("SELECT id FROM tours WHERE id=?").get(tourId))return res.status(400).json({success:false,message:"Valid journey is required."}); if(!image)return res.status(400).json({success:false,message:"Image path or URL is required."}); const max=db.prepare("SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM tour_media WHERE tour_id=?").get(tourId).next; const r=db.prepare("INSERT INTO tour_media (tour_id,image,caption,sort_order,updated_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)").run(tourId,image,caption,max); res.status(201).json({success:true,media:db.prepare("SELECT * FROM tour_media WHERE id=?").get(r.lastInsertRowid)}); });

app.patch("/api/admin/tour-media/:id", requireAdmin, (req,res)=>{ const id=Number(req.params.id), current=db.prepare("SELECT * FROM tour_media WHERE id=?").get(id); if(!Number.isInteger(id)||id<1||!current)return res.status(404).json({success:false,message:"Tour media not found."}); const image=typeof req.body.image==="string"?req.body.image.trim().slice(0,500):current.image, caption=typeof req.body.caption==="string"?req.body.caption.trim().slice(0,300):current.caption||""; if(!image)return res.status(400).json({success:false,message:"Image path or URL is required."}); db.prepare("UPDATE tour_media SET image=?,caption=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(image,caption,id); res.json({success:true,media:db.prepare("SELECT * FROM tour_media WHERE id=?").get(id)}); });

app.delete("/api/admin/tour-media/:id", requireAdmin, (req,res)=>{ const id=Number(req.params.id); const r=db.prepare("DELETE FROM tour_media WHERE id=?").run(id); if(!r.changes)return res.status(404).json({success:false,message:"Tour media not found."}); res.json({success:true}); });
// Public gallery listing: only active gallery items are exposed.
app.get("/api/gallery", (_req, res) => {
  try {
    const items = db.prepare(`
      SELECT id, title, image, category, caption, featured
      FROM gallery
      WHERE active = 1
      ORDER BY featured DESC, created_at DESC, id DESC
    `).all();
    res.json({ success: true, gallery: items });
  } catch (error) {
    console.error("Public gallery error:", error);
    res.status(500).json({ success: false, message: "Unable to load gallery." });
  }
});

function normalizeGalleryPayload(body = {}) {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 150) : "";
  const image = typeof body.image === "string" ? body.image.trim().slice(0, 500) : "";
  const category = typeof body.category === "string" ? body.category.trim().slice(0, 80) : "";
  const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 500) : "";
  const featured = body.featured ? 1 : 0;
  const active = body.active === undefined ? 1 : (body.active ? 1 : 0);
  return { title, image, category, caption, featured, active };
}

// Admin gallery management.
app.get("/api/admin/gallery", requireAdmin, (_req, res) => {
  const gallery = db.prepare("SELECT * FROM gallery ORDER BY active DESC, featured DESC, created_at DESC, id DESC").all();
  res.json({ success: true, gallery });
});

app.post("/api/admin/gallery", requireAdmin, (req, res) => {
  const item = normalizeGalleryPayload(req.body);
  if (!item.image) {
    return res.status(400).json({ success: false, message: "Image path or URL is required." });
  }

  const result = db.prepare(`
    INSERT INTO gallery (title, image, category, caption, featured, active, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(item.title, item.image, item.category, item.caption, item.featured, item.active);

  const created = db.prepare("SELECT * FROM gallery WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ success: true, gallery: created });
});

app.patch("/api/admin/gallery/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: "Invalid gallery item ID." });
  }

  const current = db.prepare("SELECT * FROM gallery WHERE id = ?").get(id);
  if (!current) {
    return res.status(404).json({ success: false, message: "Gallery item not found." });
  }

  const item = normalizeGalleryPayload({ ...current, ...req.body });
  if (!item.image) {
    return res.status(400).json({ success: false, message: "Image path or URL is required." });
  }

  db.prepare(`
    UPDATE gallery
    SET title = ?, image = ?, category = ?, caption = ?, featured = ?, active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(item.title, item.image, item.category, item.caption, item.featured, item.active, id);

  const updated = db.prepare("SELECT * FROM gallery WHERE id = ?").get(id);
  res.json({ success: true, gallery: updated });
});

app.delete("/api/admin/gallery/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: "Invalid gallery item ID." });
  }

  const result = db.prepare("DELETE FROM gallery WHERE id = ?").run(id);
  if (!result.changes) {
    return res.status(404).json({ success: false, message: "Gallery item not found." });
  }
  res.json({ success: true });
});


// Admin destinations management.
function normalizeDestinationPayload(body = {}) {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 150) : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().slice(0, 150) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 3000) : "";
  const image = typeof body.image === "string" ? body.image.trim().slice(0, 500) : "";
  const region = typeof body.region === "string" ? body.region.trim().slice(0, 150) : "";
  const best_season = typeof body.best_season === "string" ? body.best_season.trim().slice(0, 150) : "";
  const highlights = typeof body.highlights === "string" ? body.highlights.trim().slice(0, 2000) : "";
  const priceAmount = body.price_amount === "" || body.price_amount === null || body.price_amount === undefined ? null : Number(body.price_amount);
  const priceCurrency = typeof body.price_currency === "string" ? body.price_currency.trim().slice(0, 10).toUpperCase() : "PKR";
  const active = body.active === undefined ? 1 : (body.active ? 1 : 0);
  return { name, slug, description, image, region, best_season, highlights, priceAmount: Number.isFinite(priceAmount) && priceAmount >= 0 ? priceAmount : null, priceCurrency: priceCurrency || "PKR", active };
}

app.get("/api/admin/destinations", requireAdmin, (_req, res) => {
  const destinations = db.prepare("SELECT * FROM destinations ORDER BY active DESC, created_at DESC, id DESC").all();
  res.json({ success: true, destinations });
});

app.post("/api/admin/destinations", requireAdmin, (req, res) => {
  const destination = normalizeDestinationPayload(req.body);
  if (!destination.name) return res.status(400).json({ success: false, message: "Destination name is required." });

  let slug = makeSlug(destination.slug || destination.name);
  if (!slug) return res.status(400).json({ success: false, message: "A valid destination slug is required." });

  const existing = db.prepare("SELECT id FROM destinations WHERE slug = ?").get(slug);
  if (existing) slug = `${slug}-${Date.now().toString().slice(-6)}`;

  const result = db.prepare(`
    INSERT INTO destinations (name, slug, description, image, region, best_season, highlights, price_amount, price_currency, active, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    destination.name,
    slug,
    destination.description,
    destination.image,
    destination.region,
    destination.best_season,
    destination.highlights,
    destination.priceAmount,
    destination.priceCurrency,
    destination.active
  );

  const created = db.prepare("SELECT * FROM destinations WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ success: true, destination: created });
});

app.patch("/api/admin/destinations/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: "Invalid destination ID." });

  const current = db.prepare("SELECT * FROM destinations WHERE id = ?").get(id);
  if (!current) return res.status(404).json({ success: false, message: "Destination not found." });

  const destination = normalizeDestinationPayload({ ...current, ...req.body });
  if (!destination.name) return res.status(400).json({ success: false, message: "Destination name is required." });

  let slug = makeSlug(destination.slug || destination.name);
  const conflict = db.prepare("SELECT id FROM destinations WHERE slug = ? AND id <> ?").get(slug, id);
  if (conflict) return res.status(409).json({ success: false, message: "That destination slug is already in use." });

  db.prepare(`
    UPDATE destinations
    SET name=?, slug=?, description=?, image=?, region=?, best_season=?, highlights=?, price_amount=?, price_currency=?, active=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    destination.name,
    slug,
    destination.description,
    destination.image,
    destination.region,
    destination.best_season,
    destination.highlights,
    destination.priceAmount,
    destination.priceCurrency,
    destination.active,
    id
  );

  const updated = db.prepare("SELECT * FROM destinations WHERE id = ?").get(id);
  res.json({ success: true, destination: updated });
});

app.delete("/api/admin/destinations/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: "Invalid destination ID." });

  const result = db.prepare("DELETE FROM destinations WHERE id = ?").run(id);
  if (!result.changes) return res.status(404).json({ success: false, message: "Destination not found." });
  res.json({ success: true });
});


// Step 33: admin Journal / FAQ CMS management.
function normalizeJournal(body = {}) {
  const title = typeof body.title === "string" ? body.title.trim().slice(0,180) : "";
  const slug = makeSlug(body.slug || title);
  return { title, slug, excerpt:String(body.excerpt||"").trim().slice(0,500), content:String(body.content||"").trim().slice(0,12000), image:String(body.image||"").trim().slice(0,500), category:String(body.category||"").trim().slice(0,100), author:String(body.author||"").trim().slice(0,120), published:body.published===undefined?1:(body.published?1:0) };
}
app.get("/api/admin/journal", requireAdmin, (_req,res)=>res.json({success:true,articles:db.prepare("SELECT * FROM journal ORDER BY published DESC, created_at DESC, id DESC").all()}));
app.post("/api/admin/journal", requireAdmin, (req,res)=>{const a=normalizeJournal(req.body);if(!a.title||!a.slug||!a.content)return res.status(400).json({success:false,message:"Title and content are required."});if(db.prepare("SELECT id FROM journal WHERE slug=?").get(a.slug))return res.status(409).json({success:false,message:"That article slug is already in use."});const r=db.prepare("INSERT INTO journal(title,slug,excerpt,content,image,category,author,published,updated_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)").run(a.title,a.slug,a.excerpt,a.content,a.image,a.category,a.author,a.published);res.status(201).json({success:true,article:db.prepare("SELECT * FROM journal WHERE id=?").get(r.lastInsertRowid)});});
app.patch("/api/admin/journal/:id", requireAdmin, (req,res)=>{const id=Number(req.params.id), cur=db.prepare("SELECT * FROM journal WHERE id=?").get(id);if(!cur)return res.status(404).json({success:false,message:"Article not found."});const a=normalizeJournal({...cur,...req.body});if(!a.title||!a.slug||!a.content)return res.status(400).json({success:false,message:"Title and content are required."});const conflict=db.prepare("SELECT id FROM journal WHERE slug=? AND id<>?").get(a.slug,id);if(conflict)return res.status(409).json({success:false,message:"That article slug is already in use."});db.prepare("UPDATE journal SET title=?,slug=?,excerpt=?,content=?,image=?,category=?,author=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(a.title,a.slug,a.excerpt,a.content,a.image,a.category,a.author,a.published,id);res.json({success:true,article:db.prepare("SELECT * FROM journal WHERE id=?").get(id)});});
app.delete("/api/admin/journal/:id", requireAdmin, (req,res)=>{const r=db.prepare("DELETE FROM journal WHERE id=?").run(Number(req.params.id));if(!r.changes)return res.status(404).json({success:false,message:"Article not found."});res.json({success:true});});
app.get("/api/admin/faq", requireAdmin, (_req,res)=>res.json({success:true,faq:db.prepare("SELECT * FROM faq ORDER BY published DESC, created_at DESC, id DESC").all()}));
function normalizeFaq(body={}){return {question:String(body.question||"").trim().slice(0,500),answer:String(body.answer||"").trim().slice(0,5000),category:String(body.category||"").trim().slice(0,100),published:body.published===undefined?1:(body.published?1:0)};}
app.post("/api/admin/faq", requireAdmin,(req,res)=>{const a=normalizeFaq(req.body);if(!a.question||!a.answer)return res.status(400).json({success:false,message:"Question and answer are required."});const r=db.prepare("INSERT INTO faq(question,answer,category,published,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)").run(a.question,a.answer,a.category,a.published);res.status(201).json({success:true,faq:db.prepare("SELECT * FROM faq WHERE id=?").get(r.lastInsertRowid)});});
app.patch("/api/admin/faq/:id", requireAdmin,(req,res)=>{const id=Number(req.params.id),cur=db.prepare("SELECT * FROM faq WHERE id=?").get(id);if(!cur)return res.status(404).json({success:false,message:"FAQ not found."});const a=normalizeFaq({...cur,...req.body});if(!a.question||!a.answer)return res.status(400).json({success:false,message:"Question and answer are required."});db.prepare("UPDATE faq SET question=?,answer=?,category=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(a.question,a.answer,a.category,a.published,id);res.json({success:true,faq:db.prepare("SELECT * FROM faq WHERE id=?").get(id)});});
app.delete("/api/admin/faq/:id", requireAdmin,(req,res)=>{const r=db.prepare("DELETE FROM faq WHERE id=?").run(Number(req.params.id));if(!r.changes)return res.status(404).json({success:false,message:"FAQ not found."});res.json({success:true});});

// Admin interface must be routed explicitly before the public static middleware.
// This prevents the /admin directory from being resolved unexpectedly by static hosting.
app.get("/admin", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.sendFile(path.join(ROOT, "admin", "index.html"));
});
app.get("/admin/", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.sendFile(path.join(ROOT, "admin", "index.html"));
});

// Avoid stale HTML while the local CMS is being developed.
app.use((req, res, next) => {
  if (req.method === "GET" && req.path.endsWith(".html")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  }
  next();
});

// Step 37: production-friendly robots and dynamic sitemap.
// Keep these routes before express.static so the sitemap can include current CMS content.
const SITE_URL = (process.env.SITE_URL || "https://beyondgb.com").replace(/\/$/, "");
const xmlEscape = value => String(value || "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;"
}[ch]));

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send([
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /backend/",
    `Sitemap: ${SITE_URL}/sitemap.xml`
  ].join("\n") + "\n");
});

app.get("/sitemap.xml", (_req, res) => {
  try {
    const staticPaths = [
      "/", "/pages/about.html", "/pages/services.html", "/pages/destinations.html",
      "/pages/tours.html", "/pages/gallery.html", "/pages/videos.html", "/pages/blog.html",
      "/pages/faq.html", "/pages/contact.html", "/pages/plan.html", "/pages/privacy.html", "/pages/terms.html"
    ];
    const destinationPaths = db.prepare("SELECT slug FROM destinations WHERE active = 1 ORDER BY id").all()
      .map(row => `/pages/destination.html?slug=${encodeURIComponent(row.slug)}`);
    const tourPaths = db.prepare("SELECT slug FROM tours WHERE active = 1 ORDER BY id").all()
      .map(row => `/pages/tour.html?slug=${encodeURIComponent(row.slug)}`);
    const urls = [...new Set([...staticPaths, ...destinationPaths, ...tourPaths])];
    const body = urls.map(url => `  <url><loc>${xmlEscape(SITE_URL + url)}</loc></url>`).join("\n");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
  }
});

// Static public website. Backend files are blocked above.
app.use(express.static(ROOT, { index: "index.html" }));

app.get("/api/health", (_req, res) => {
  try {
    db.prepare("SELECT 1 AS ok").get();
    res.json({ success: true, status: "ok" });
  } catch (_) {
    res.status(503).json({ success: false, status: "unavailable" });
  }
});

// Centralized production-safe error response. Keep details in server logs only.
app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, message: "Internal server error." });
});

const server = app.listen(PORT, HOST, () => console.log(`BeyondGB is running on ${HOST}:${PORT}`));

function shutdown(signal) {
  console.log(`${signal} received. Shutting down BeyondGB...`);
  server.close(() => {
    try { db.close(); } catch (_) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
