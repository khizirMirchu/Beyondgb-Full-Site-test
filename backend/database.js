const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const dbPath = process.env.BEYONDGB_DB_PATH
  ? path.resolve(process.env.BEYONDGB_DB_PATH)
  : path.join(__dirname, "beyondgb.db");
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    service TEXT NOT NULL,
    destination TEXT,
    travel_date TEXT,
    travelers INTEGER,
    budget TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    follow_up_date TEXT
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS destinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    destination TEXT,
    description TEXT,
    price TEXT,
    duration TEXT,
    difficulty TEXT,
    image TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    image TEXT NOT NULL,
    category TEXT,
    caption TEXT,
    featured INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    review TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    photo TEXT,
    published INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tour_id INTEGER,
    date TEXT NOT NULL,
    seats INTEGER,
    status TEXT NOT NULL DEFAULT 'available',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS tour_itinerary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tour_id INTEGER NOT NULL,
    day INTEGER NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tour_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tour_id INTEGER NOT NULL,
    image TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
  );

`);

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((item) => item.name === column);
}

// Migrate the existing enquiries database without deleting existing customer records.
if (!hasColumn("enquiries", "budget")) db.exec("ALTER TABLE enquiries ADD COLUMN budget TEXT");
if (!hasColumn("enquiries", "status")) db.exec("ALTER TABLE enquiries ADD COLUMN status TEXT NOT NULL DEFAULT 'new'");
if (!hasColumn("enquiries", "updated_at")) db.exec("ALTER TABLE enquiries ADD COLUMN updated_at DATETIME");
if (!hasColumn("enquiries", "notes")) db.exec("ALTER TABLE enquiries ADD COLUMN notes TEXT");
if (!hasColumn("enquiries", "follow_up_date")) db.exec("ALTER TABLE enquiries ADD COLUMN follow_up_date TEXT");
if (!hasColumn("enquiries", "tour_id")) db.exec("ALTER TABLE enquiries ADD COLUMN tour_id INTEGER");
if (!hasColumn("enquiries", "accommodation")) db.exec("ALTER TABLE enquiries ADD COLUMN accommodation TEXT");
if (!hasColumn("enquiries", "transport")) db.exec("ALTER TABLE enquiries ADD COLUMN transport TEXT");
if (!hasColumn("destinations", "region")) db.exec("ALTER TABLE destinations ADD COLUMN region TEXT");
if (!hasColumn("destinations", "best_season")) db.exec("ALTER TABLE destinations ADD COLUMN best_season TEXT");
if (!hasColumn("destinations", "highlights")) db.exec("ALTER TABLE destinations ADD COLUMN highlights TEXT");
if (!hasColumn("destinations", "price_amount")) db.exec("ALTER TABLE destinations ADD COLUMN price_amount REAL");
if (!hasColumn("destinations", "price_currency")) db.exec("ALTER TABLE destinations ADD COLUMN price_currency TEXT DEFAULT 'PKR'");
if (!hasColumn("testimonials", "location")) db.exec("ALTER TABLE testimonials ADD COLUMN location TEXT");
if (!hasColumn("tours", "price_amount")) db.exec("ALTER TABLE tours ADD COLUMN price_amount REAL");
if (!hasColumn("tours", "price_currency")) db.exec("ALTER TABLE tours ADD COLUMN price_currency TEXT DEFAULT 'PKR'");
if (!hasColumn("tours", "price_note")) db.exec("ALTER TABLE tours ADD COLUMN price_note TEXT");


db.prepare("UPDATE enquiries SET status = 'new' WHERE status IS NULL OR status = ''").run();
db.prepare("UPDATE enquiries SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL").run();

// Steps 24–25: public Journal and FAQ storage.
// These tables are created only when missing, so existing project data is preserved.
db.exec(`
  CREATE TABLE IF NOT EXISTS journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT,
    image TEXT,
    category TEXT,
    author TEXT,
    published INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS faq (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    published INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Step 53: customer review submissions with admin moderation.
db.exec(`
  CREATE TABLE IF NOT EXISTS customer_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tour_id INTEGER,
    destination TEXT,
    customer_name TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    review TEXT NOT NULL,
    published INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE SET NULL
  );
`);

// Step 26: central site settings. Key/value storage preserves existing project data.
db.exec(`
  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const defaultSettings = {
  company_name: "BeyondGB",
  company_description: "Travel, tours and mountain experiences across Gilgit-Baltistan, designed around you.",
  whatsapp: "923415771154",
  phone: "+92 341 5771154",
  email: "",
  address: "Gilgit-Baltistan, Pakistan",
  opening_hours: "",
  facebook: "",
  instagram: "",
  youtube: "",
  tiktok: "",
  logo: "assets/logo/logo.jpg",
  seo_title: "BeyondGB | Gilgit-Baltistan Tours, Travel & Experiences",
  seo_description: "BeyondGB helps travelers explore Gilgit-Baltistan with customized tours, trekking, transport, hotel booking, bike tours and village experiences.",
  calculator_standard_accommodation: "0",
  calculator_comfort_accommodation: "0",
  calculator_premium_accommodation: "0",
  calculator_shared_transport: "0",
  calculator_private_transport: "0",
  calculator_luxury_transport: "0",
  calculator_activity: "0"
};
const addSetting = db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)");
Object.entries(defaultSettings).forEach(([key, value]) => addSetting.run(key, value));

// Seed only empty tables. Never replace or delete existing Journal/FAQ data.
if (db.prepare("SELECT COUNT(*) AS count FROM journal").get().count === 0) {
  const addJournal = db.prepare(`
    INSERT INTO journal (title, slug, excerpt, content, category, author, published)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  addJournal.run(
    "Best time to visit Hunza",
    "best-time-hunza",
    "A practical guide to seasons, weather and what each period offers.",
    "A practical guide to seasons, weather and what each period offers.",
    "Travel Guide",
    "BeyondGB"
  );
  addJournal.run(
    "Skardu first-timer guide",
    "skardu-guide",
    "What to consider when planning your first Skardu journey.",
    "What to consider when planning your first Skardu journey.",
    "Travel Guide",
    "BeyondGB"
  );
  addJournal.run(
    "Preparing for a mountain trek",
    "deosai-guide",
    "Equipment, altitude, fitness and practical preparation.",
    "Equipment, altitude, fitness and practical preparation.",
    "Trekking",
    "BeyondGB"
  );
}

if (db.prepare("SELECT COUNT(*) AS count FROM faq").get().count === 0) {
  const addFaq = db.prepare(`
    INSERT INTO faq (question, answer, category, published)
    VALUES (?, ?, ?, 1)
  `);
  [
    ["Do you take online payments?", "No. The website does not ask for card or payment details. Pricing and payment arrangements are discussed privately.", "Payments"],
    ["Can I customize a tour?", "Yes. Customized planning is a core part of BeyondGB.", "Tours"],
    ["Do you work with international travelers?", "Yes. Travelers from around the world can contact BeyondGB.", "Planning"],
    ["How does the enquiry form work?", "You submit your basic trip details. The enquiry is stored by the website and can be reviewed from the admin dashboard.", "Planning"],
    ["Can I use WhatsApp instead?", "Yes. WhatsApp is available for direct trip discussions.", "Contact"],
    ["Are prices fixed on the website?", "No. The website can show starting information, while final quotations can be handled privately.", "Payments"]
  ].forEach(([question, answer, category]) => addFaq.run(question, answer, category));
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
  CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON admin_sessions(token_hash);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON admin_sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_tours_active ON tours(active);
  CREATE INDEX IF NOT EXISTS idx_destinations_active ON destinations(active);
  CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(date);
  CREATE INDEX IF NOT EXISTS idx_itinerary_tour_day ON tour_itinerary(tour_id, day, id);
  CREATE INDEX IF NOT EXISTS idx_tour_media_tour_order ON tour_media(tour_id, sort_order, id);
`);

// Remove expired sessions periodically whenever the database module loads.
db.prepare("DELETE FROM admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP").run();

console.log("BeyondGB database is ready.");

// STEP 19: optional tour detail fields. Existing database/data is preserved.
try {
  if (typeof hasColumn === "function") {
    if (!hasColumn("tours", "included")) db.exec("ALTER TABLE tours ADD COLUMN included TEXT");
    if (!hasColumn("tours", "excluded")) db.exec("ALTER TABLE tours ADD COLUMN excluded TEXT");
  }
} catch (migrationError) {
  console.warn("Tour migration:", migrationError.message);
}
module.exports = db;


if (!hasColumn("gallery", "media_type")) db.exec("ALTER TABLE gallery ADD COLUMN media_type TEXT DEFAULT 'image'");
if (!hasColumn("gallery", "video_url")) db.exec("ALTER TABLE gallery ADD COLUMN video_url TEXT");
