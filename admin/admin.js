(() => {
  "use strict";


  // Ensure the Testimonials tab/panel exists even if an older cached admin HTML is loaded.
  function ensureTestimonialsUI() {
    const tabs = document.querySelector(".tabs");
    if (tabs && !tabs.querySelector('[data-tab="testimonialsTab"]')) {
      const button = document.createElement("button");
      button.className = "tab";
      button.type = "button";
      button.dataset.tab = "testimonialsTab";
      button.textContent = "Testimonials";
      button.addEventListener("click", () => openTab("testimonialsTab"));
      tabs.appendChild(button);
    }

    if (!document.getElementById("testimonialsTab")) {
      const panel = document.createElement("section");
      panel.id = "testimonialsTab";
      panel.className = "tab-panel hidden";
      panel.innerHTML = `
        <section class="card">
          <div class="section-head">
            <div><h2>Testimonials</h2><p class="muted">Manage customer reviews shown on the BeyondGB website.</p></div>
            <button id="addTestimonialButton" class="primary" type="button">+ Add testimonial</button>
          </div>
          <div id="testimonialMessage" class="message"></div>
          <form id="testimonialForm" class="tour-form hidden">
            <input id="testimonialId" type="hidden">
            <div class="form-grid">
              <label>Customer name<input id="testimonialName" maxlength="120" required></label>
              <label>Location<input id="testimonialLocation" maxlength="120"></label>
              <label>Rating<select id="testimonialRating"><option value="5">★★★★★ — 5/5</option><option value="4">★★★★☆ — 4/5</option><option value="3">★★★☆☆ — 3/5</option><option value="2">★★☆☆☆ — 2/5</option><option value="1">★☆☆☆☆ — 1/5</option></select></label>
              <label>Photo path / URL<input id="testimonialPhoto" maxlength="500"></label>
            </div>
            <label>Review<textarea id="testimonialReview" maxlength="2000" rows="6" required></textarea></label>
            <label class="checkbox-label"><input id="testimonialPublished" type="checkbox" checked> Published / visible on website</label>
            <div class="form-actions"><button class="primary" type="submit">Save testimonial</button><button id="cancelTestimonialButton" class="ghost" type="button">Cancel</button></div>
          </form>
          <div id="testimonialList" class="testimonial-admin-list"></div>
        </section>`;
      (document.querySelector("main") || document.body).appendChild(panel);
    }
  }

  // Ensure the Destinations tab/panel exists even if an older cached admin HTML is loaded.
  function ensureDestinationsUI() {
    const tabs = document.querySelector(".tabs");
    if (tabs && !tabs.querySelector('[data-tab="destinationsTab"]')) {
      const button = document.createElement("button");
      button.className = "tab";
      button.type = "button";
      button.dataset.tab = "destinationsTab";
      button.textContent = "Destinations";
      button.addEventListener("click", () => openTab("destinationsTab"));
      tabs.appendChild(button);
    }

    if (!document.getElementById("destinationsTab")) {
      const panel = document.createElement("section");
      panel.id = "destinationsTab";
      panel.className = "tab-panel hidden";
      panel.innerHTML = `
        <section class="card">
          <div class="section-head">
            <div>
              <h2>Destinations</h2>
              <p class="muted">Manage the destinations shown on the BeyondGB website.</p>
            </div>
            <button id="addDestinationButton" class="primary" type="button">+ Add destination</button>
          </div>
          <div id="destinationMessage" class="message"></div>
          <form id="destinationForm" class="tour-form hidden">
            <input id="destinationId" type="hidden">
            <div class="form-grid">
              <label>Destination name<input id="destinationName" maxlength="150" required></label>
              <label>Slug<input id="destinationSlug" maxlength="150"></label>
              <label>Image path / URL<input id="destinationImage" maxlength="500" placeholder="assets/images/hunza.jpg"></label>
            </div>
            <label>Description<textarea id="destinationDescription" maxlength="3000" rows="5"></textarea></label>
            <label class="checkbox-label"><input id="destinationActive" type="checkbox" checked> Active / visible on website</label>
            <div class="form-actions">
              <button class="primary" type="submit">Save destination</button>
              <button id="cancelDestinationButton" class="ghost" type="button">Cancel</button>
            </div>
          </form>
          <div id="destinationList" class="tour-list"></div>
        </section>`;
      const main = document.querySelector("main") || document.body;
      main.appendChild(panel);
    }
  }

  ensureTestimonialsUI();
  ensureDestinationsUI();


  const $ = (id) => document.getElementById(id);

  // Shared HTML escaping for values rendered into Admin UI.
  // Keep this local to the admin bundle so settings/tour loading never
  // depends on another script defining escapeHtml first.
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"\\']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }
  const loginView = $("loginView");
  const dashboardView = $("dashboardView");
  const loginForm = $("loginForm");
  const loginMessage = $("loginMessage");
  const loginButton = loginForm ? loginForm.querySelector("button[type=submit]") : null;

  if (!loginView || !dashboardView || !loginForm || !loginMessage) {
    document.body.innerHTML = '<main style="max-width:720px;margin:60px auto;padding:24px;font-family:system-ui"><h1>BeyondGB Admin</h1><p>The admin login page could not initialize. Please refresh the page.</p></main>';
    return;
  }

  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", ...options });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      const error = new Error(data.message || "Request failed.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function showLogin(message = "") {
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    loginMessage.textContent = message;
  }

  function showDashboard(admin) {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    $("adminName").textContent = admin.username;
    openTab("overviewTab");
    loadDashboard();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = loginForm;
    const button = loginButton;
    button.disabled = true;
    loginMessage.textContent = "Signing in...";
    try {
      const data = await api("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: $("username").value, password: $("password").value })
      });
      form.reset();
      showDashboard(data.admin);
    } catch (error) {
      loginMessage.textContent = error.message;
    } finally { button.disabled = false; }
  });

  $("logoutButton").addEventListener("click", async () => {
    try { await api("/api/admin/logout", { method: "POST" }); } finally { showLogin(); }
  });

  function openTab(tabId) {
    document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("hidden", panel.id !== tabId));
    if (tabId === "enquiriesTab") loadEnquiries();
    if (tabId === "toursTab") { loadTours().then(() => { adminTours = tours.slice(); window.__adminTours = adminTours; populateCalculatorTourSelect(); return loadAvailability(); }); }
    if (tabId === "galleryTab") loadGallery();
    if (tabId === "testimonialsTab") loadTestimonials();
    if (tabId === "destinationsTab") loadDestinations();
    if (tabId === "settingsTab") loadSettings();
    if (tabId === "journalTab") loadJournal();
    if (tabId === "faqTab") loadFaq();
  }

  // Expose the core tab switcher so later CMS modules can safely extend it.
  // Without this, dynamically-added modules cannot open their tabs.
  window.openTab = openTab;

  document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => openTab(button.dataset.tab)));
  document.querySelectorAll("[data-open-tab]").forEach((button) => button.addEventListener("click", () => openTab(button.dataset.openTab)));

  $("statusFilter").addEventListener("change", loadEnquiries);
  $("searchInput").addEventListener("input", loadEnquiries);

  const settingFields = {
    company_name: "settingCompanyName", company_description: "settingCompanyDescription", whatsapp: "settingWhatsapp",
    phone: "settingPhone", email: "settingEmail", address: "settingAddress", opening_hours: "settingOpeningHours",
    facebook: "settingFacebook", instagram: "settingInstagram", youtube: "settingYoutube", tiktok: "settingTiktok",
    logo: "settingLogo", seo_title: "settingSeoTitle", seo_description: "settingSeoDescription",
    calculator_standard_accommodation: "settingCalcStandardAccommodation", calculator_comfort_accommodation: "settingCalcComfortAccommodation", calculator_premium_accommodation: "settingCalcPremiumAccommodation",
    calculator_shared_transport: "settingCalcSharedTransport", calculator_private_transport: "settingCalcPrivateTransport", calculator_luxury_transport: "settingCalcLuxuryTransport", calculator_activity: "settingCalcActivity", calculator_tour_pricing: null
  };

  let adminTourPricing = [];
  let adminTours = [];
  let selectedPricingTourId = "";

  function pricingRowFor(tourId) {
    return adminTourPricing.find(r => Number(r.tour_id) === Number(tourId)) || null;
  }

  function populateCalculatorTourSelect() {
    const select = $("settingCalcTour"); if (!select) return;
    select.innerHTML = '<option value="">General calculator rates</option>' +
      adminTours.map(t => `<option value="${t.id}">${escapeHtml(t.title)}</option>`).join("");
    select.value = selectedPricingTourId || "";
  }

  function readCurrentCalculatorFields() {
    return {
      price: Number($("settingCalcTourBasePrice")?.value) || 0,
      standard_accommodation: Number($("settingCalcStandardAccommodation")?.value) || 0,
      comfort_accommodation: Number($("settingCalcComfortAccommodation")?.value) || 0,
      premium_accommodation: Number($("settingCalcPremiumAccommodation")?.value) || 0,
      shared_transport: Number($("settingCalcSharedTransport")?.value) || 0,
      private_transport: Number($("settingCalcPrivateTransport")?.value) || 0,
      luxury_transport: Number($("settingCalcLuxuryTransport")?.value) || 0,
      activity: Number($("settingCalcActivity")?.value) || 0
    };
  }

  function writeCalculatorFields(values = {}, isTour = false) {
    $("settingCalcTourBasePrice").value = Number(values.price) || 0;
    $("settingCalcStandardAccommodation").value = Number(values.standard_accommodation) || 0;
    $("settingCalcComfortAccommodation").value = Number(values.comfort_accommodation) || 0;
    $("settingCalcPremiumAccommodation").value = Number(values.premium_accommodation) || 0;
    $("settingCalcSharedTransport").value = Number(values.shared_transport) || 0;
    $("settingCalcPrivateTransport").value = Number(values.private_transport) || 0;
    $("settingCalcLuxuryTransport").value = Number(values.luxury_transport) || 0;
    $("settingCalcActivity").value = Number(values.activity) || 0;
    const base = $("settingCalcTourBasePrice")?.closest("label");
    if (base) base.style.display = isTour ? "" : "none";
  }

  function switchCalculatorTour(tourId, generalSettings = null) {
    selectedPricingTourId = String(tourId || "");
    populateCalculatorTourSelect();
    if (!selectedPricingTourId) {
      writeCalculatorFields({
        price: 0,
        standard_accommodation: generalSettings?.calculator_standard_accommodation,
        comfort_accommodation: generalSettings?.calculator_comfort_accommodation,
        premium_accommodation: generalSettings?.calculator_premium_accommodation,
        shared_transport: generalSettings?.calculator_shared_transport,
        private_transport: generalSettings?.calculator_private_transport,
        luxury_transport: generalSettings?.calculator_luxury_transport,
        activity: generalSettings?.calculator_activity
      }, false);
      return;
    }
    const row = pricingRowFor(selectedPricingTourId) || {};
    const tour = adminTours.find(t => Number(t.id) === Number(selectedPricingTourId));
    writeCalculatorFields({
      price: row.price || tour?.price_amount || 0,
      standard_accommodation: row.standard_accommodation,
      comfort_accommodation: row.comfort_accommodation,
      premium_accommodation: row.premium_accommodation,
      shared_transport: row.shared_transport,
      private_transport: row.private_transport,
      luxury_transport: row.luxury_transport,
      activity: row.activity
    }, true);
  }

  function fillSettings(settings = {}) {
    Object.entries(settingFields).forEach(([key, id]) => {
      if (id && $(id)) $(id).value = settings[key] || "";
    });
    try { adminTourPricing = settings.calculator_tour_pricing ? JSON.parse(settings.calculator_tour_pricing) : []; } catch (_) { adminTourPricing = []; }
    populateCalculatorTourSelect();
    switchCalculatorTour("", settings);
  }

  function settingsPayload() {
    if (selectedPricingTourId) {
      const values = readCurrentCalculatorFields();
      const existingIndex = adminTourPricing.findIndex(r => Number(r.tour_id) === Number(selectedPricingTourId));
      const row = { tour_id: String(selectedPricingTourId), ...values };
      if (existingIndex >= 0) adminTourPricing[existingIndex] = row;
      else adminTourPricing.push(row);
    }
    const payload = Object.fromEntries(Object.entries(settingFields).filter(([,id]) => id).map(([key, id]) => [key, $(id)?.value.trim() || ""]));
    payload.calculator_tour_pricing = JSON.stringify(adminTourPricing.filter(r => r.tour_id));
    return payload;
  }

  async function loadAdminToursForPricing() {
    // Reuse the same protected Admin > Tours data that powers the Tours tab.
    // This guarantees the calculator sees the tours already created by Admin,
    // including hidden/inactive tours, instead of depending on the public list.
    try {
      const data = await api("/api/admin/tours");
      adminTours = Array.isArray(data.tours) ? data.tours : [];
      window.__adminTours = adminTours;
      populateCalculatorTourSelect();
      return;
    } catch (_) {}

    // If the request above is unavailable in an older build, use the Tours tab's
    // already-loaded array before falling back to the public endpoint.
    try {
      if (Array.isArray(tours) && tours.length) {
        adminTours = tours.slice();
        window.__adminTours = adminTours;
        populateCalculatorTourSelect();
        return;
      }
    } catch (_) {}

    try {
      const response = await fetch("/api/tours", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json();
      if (response.ok && Array.isArray(data.tours)) adminTours = data.tours;
    } catch (_) {}
    window.__adminTours = adminTours;
    populateCalculatorTourSelect();
  }

  $("settingCalcTour")?.addEventListener("change", e => switchCalculatorTour(e.target.value, null));

  async function loadSettings() {
    try {
      // Ensure the dropdown is populated from the Admin Tours list every time
      // Settings is opened.
      await loadAdminToursForPricing();
      const data = await api("/api/admin/settings");
      fillSettings(data.settings || {});
    } catch (error) {
      if (error.status === 401) showLogin("Your session has expired. Please sign in again.");
      else if ($("settingsMessage")) $("settingsMessage").textContent = error.message;
    }
  }

  if ($("settingsForm")) {
    $("settingsForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = $("settingsMessage");
      const submit = $("settingsForm").querySelector('button[type="submit"]');
      submit.disabled = true;
      message.textContent = "Saving...";
      try {
        const data = await api("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settingsPayload())
        });
        fillSettings(data.settings || {});
        message.textContent = "Settings saved.";
        setTimeout(() => { message.textContent = ""; }, 2200);
      } catch (error) {
        message.textContent = error.message;
      } finally { submit.disabled = false; }
    });
  }

  async function loadDashboard() {
    try {
      const me = await api("/api/admin/me");
      $("adminName").textContent = me.admin.username;
      const stats = await api("/api/admin/stats");
      renderStats(stats.stats);
    } catch (error) {
      if (error.status === 401) showLogin("Your session has expired. Please sign in again.");
    }
  }

  function renderStats(stats) {
    const labels = [["total","Total"],["new","New"],["contacted","Contacted"],["confirmed","Confirmed"],["completed","Completed"]];
    $("stats").innerHTML = labels.map(([key,label]) => `<div class="stat"><strong>${Number(stats[key] || 0)}</strong><span>${label}</span></div>`).join("");
  }

  async function loadEnquiries() {
    try {
      const status = $("statusFilter").value;
      const search = $("searchInput").value.trim();
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const query = params.toString();
      const data = await api(`/api/admin/enquiries${query ? `?${query}` : ""}`);
      renderEnquiries(data.enquiries);
    } catch (error) {
      if (error.status === 401) showLogin("Your session has expired. Please sign in again.");
    }
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
  }

  function renderEnquiries(enquiries) {
    if (!enquiries.length) { $("enquiryList").innerHTML = '<div class="empty">No enquiries found.</div>'; return; }
    $("enquiryList").innerHTML = enquiries.map((e) => `
      <article class="enquiry" data-id="${e.id}">
        <div class="enquiry-head"><div><h3>${esc(e.name)}</h3><div class="muted">${esc(e.service)} · ${esc(e.destination || "No destination")}</div></div><span class="badge">${esc(e.status)}</span></div>
        <div class="meta">
          <div><strong>Email</strong>${esc(e.email)}</div><div><strong>Phone / WhatsApp</strong>${esc(e.whatsapp)}</div><div><strong>Travel date</strong>${esc(e.travel_date || "Not specified")}</div>
          <div><strong>Travelers</strong>${esc(e.travelers || "Not specified")}</div><div><strong>Budget</strong>${esc(e.budget || "Not specified")}</div><div><strong>Accommodation</strong>${esc(e.accommodation || "Any / Not specified")}</div><div><strong>Transport</strong>${esc(e.transport || "Any / Not specified")}</div><div><strong>Received</strong>${esc(e.created_at)}</div>
        </div>
        <p><strong>Message:</strong> ${esc(e.message || "No message")}</p>${e.tour_title ? `<p class="muted"><strong>Journey:</strong> ${esc(e.tour_title)}</p>` : ""}
        <div class="enquiry-actions">
          <select class="status-change" aria-label="Change status">
            ${["new","contacted","confirmed","completed"].map(s => `<option value="${s}" ${s===e.status?"selected":""}>${s[0].toUpperCase()+s.slice(1)}</option>`).join("")}
          </select>
          <button class="ghost save-enquiry-details" type="button">Save details</button>
          <button class="danger delete-enquiry" type="button">Delete</button>
        </div>
        <div class="enquiry-crm-grid">
          <label>Follow-up date<input class="follow-up-date" type="date" value="${esc(e.follow_up_date || "")}"></label>
          <label>Internal notes<textarea class="enquiry-notes" rows="2" maxlength="2000" placeholder="Private admin notes…">${esc(e.notes || "")}</textarea></label>
        </div>
      </article>`).join("");

    document.querySelectorAll(".status-change").forEach((select) => select.addEventListener("change", async (event) => {
      const id = event.target.closest(".enquiry").dataset.id;
      try { await api(`/api/admin/enquiries/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status:event.target.value}) }); await loadDashboard(); await loadEnquiries(); }
      catch (error) { alert(error.message); }
    }));

    document.querySelectorAll(".save-enquiry-details").forEach((button) => button.addEventListener("click", async (event) => {
      const card = event.target.closest(".enquiry");
      const status = card.querySelector(".status-change").value;
      const notes = card.querySelector(".enquiry-notes").value;
      const follow_up_date = card.querySelector(".follow-up-date").value;
      try {
        await api(`/api/admin/enquiries/${card.dataset.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status, notes, follow_up_date}) });
        button.textContent = "Saved";
        setTimeout(() => { button.textContent = "Save details"; }, 1200);
      } catch (error) { alert(error.message); }
    }));

    document.querySelectorAll(".delete-enquiry").forEach((button) => button.addEventListener("click", async (event) => {
      const card = event.target.closest(".enquiry");
      if (!confirm("Delete this enquiry permanently?")) return;
      try { await api(`/api/admin/enquiries/${card.dataset.id}`, { method:"DELETE" }); await loadDashboard(); await loadEnquiries(); }
      catch (error) { alert(error.message); }
    }));
  }

  // Tours & packages management.
  let tours = [];

  function resetTourForm() {
    $("tourForm").reset();
    $("tourId").value = "";
    $("tourActive").checked = true;
    $("tourForm").classList.add("hidden");
    $("addTourButton").textContent = "+ Add tour";
  }

  function fillTourForm(tour) {
    $("tourId").value = tour.id;
    $("tourTitle").value = tour.title || "";
    $("tourDestination").value = tour.destination || "";
    $("tourPrice").value = tour.price || "";
    $("tourPriceAmount").value = tour.price_amount ?? "";
    $("tourPriceCurrency").value = tour.price_currency || "PKR";
    $("tourPriceNote").value = tour.price_note || "";
    $("tourDuration").value = tour.duration || "";
    $("tourDifficulty").value = tour.difficulty || "";
    $("tourImage").value = tour.image || "";
    $("tourDescription").value = tour.description || "";
    $("tourActive").checked = Number(tour.active) === 1;
    $("tourForm").classList.remove("hidden");
    $("addTourButton").textContent = "Add another tour";
    $("tourTitle").focus();
  }

  function tourPayload() {
    return {
      title: $("tourTitle").value.trim(),
      destination: $("tourDestination").value.trim(),
      price: $("tourPrice").value.trim(),
      price_amount: $("tourPriceAmount").value === "" ? null : Number($("tourPriceAmount").value),
      price_currency: $("tourPriceCurrency").value.trim() || "PKR",
      price_note: $("tourPriceNote").value.trim(),
      duration: $("tourDuration").value.trim(),
      difficulty: $("tourDifficulty").value.trim(),
      image: $("tourImage").value.trim(),
      included: $("tourIncluded") ? $("tourIncluded").value.trim() : "",
      excluded: $("tourExcluded") ? $("tourExcluded").value.trim() : "",
      description: $("tourDescription").value.trim(),
      active: $("tourActive").checked
    };
  }

  $("addTourButton").addEventListener("click", () => {
    if ($("tourForm").classList.contains("hidden")) {
      resetTourForm();
      $("tourForm").classList.remove("hidden");
      $("addTourButton").textContent = "Add another tour";
      $("tourTitle").focus();
    } else {
      resetTourForm();
      $("tourForm").classList.remove("hidden");
      $("tourTitle").focus();
    }
  });

  $("cancelTourButton").addEventListener("click", resetTourForm);

  $("tourForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("tourId").value;
    const message = $("tourMessage");
    const submit = $("tourForm").querySelector('button[type="submit"]');
    submit.disabled = true;
    message.textContent = "Saving...";
    try {
      const data = await api(id ? `/api/admin/tours/${id}` : "/api/admin/tours", {
        method: id ? "PATCH" : "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(tourPayload())
      });
      message.textContent = id ? "Tour updated." : "Tour added.";
      renderToursFromSingleUpdate(data.tour);
      resetTourForm();
      await loadTours();
      setTimeout(() => { message.textContent = ""; }, 1800);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  function renderToursFromSingleUpdate(tour) {
    tours = tours.filter((item) => item.id !== tour.id);
    tours.unshift(tour);
  }

  async function loadTours() {
    try {
      const data = await api("/api/admin/tours");
      tours = data.tours || [];
      renderTours();
      if (window.refreshJourneyExtras) window.refreshJourneyExtras();
    } catch (error) {
      if (error.status === 401) showLogin("Your session has expired. Please sign in again.");
      else $("tourList").innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    }
  }

  function renderTours() {
    if (!tours.length) {
      $("tourList").innerHTML = '<div class="empty">No tours yet. Click “+ Add tour” to create your first package.</div>';
      return;
    }
    $("tourList").innerHTML = tours.map((tour) => `
      <article class="tour-card ${Number(tour.active) ? "" : "inactive"}" data-id="${tour.id}">
        <div class="tour-card-main">
          <div>
            <div class="tour-card-title"><h3>${esc(tour.title)}</h3><span class="badge">${Number(tour.active) ? "Active" : "Hidden"}</span></div>
            <p class="muted">${esc(tour.destination || "No destination")} · ${esc(tour.duration || "No duration")} · ${esc(tour.difficulty || "Difficulty not set")}</p>
            <p>${esc(tour.description || "No description added.")}</p>
            <strong>${esc(tour.price || "Price not set")}</strong>
            ${tour.image ? `<div class="tour-image-path">Image: ${esc(tour.image)}</div>` : ""}
          </div>
          <div class="tour-actions">
            <button class="ghost edit-tour" type="button">Edit</button>
            <button class="danger delete-tour" type="button">Delete</button>
          </div>
        </div>
      </article>`).join("");

    document.querySelectorAll(".edit-tour").forEach((button) => button.addEventListener("click", (event) => {
      const id = Number(event.target.closest(".tour-card").dataset.id);
      const tour = tours.find((item) => item.id === id);
      if (tour) fillTourForm(tour);
    }));

    document.querySelectorAll(".delete-tour").forEach((button) => button.addEventListener("click", async (event) => {
      const id = Number(event.target.closest(".tour-card").dataset.id);
      const tour = tours.find((item) => item.id === id);
      if (!tour || !confirm(`Delete "${tour.title}" permanently?`)) return;
      try {
        await api(`/api/admin/tours/${id}`, { method: "DELETE" });
        await loadTours();
      } catch (error) {
        alert(error.message);
      }
    }));
  }


  // Step 42 — availability stays inside the original 39-40 Tours tab.
  let availability = [];
  function refreshAvailabilityTours(){ const el=$("availabilityTour"); if(el) el.innerHTML=tours.map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join(""); }
  async function loadAvailability(){ try{ const data=await api("/api/admin/availability"); availability=data.availability||[]; refreshAvailabilityTours(); renderAvailability(); }catch(e){ const el=$("availabilityList"); if(el) el.innerHTML=`<div class="empty">${esc(e.message)}</div>`; } }
  function renderAvailability(){ const root=$("availabilityList"); if(!root)return; if(!availability.length){root.innerHTML='<div class="empty">No availability dates yet. Click “+ Add date”.</div>';return;} root.innerHTML=availability.map(a=>`<article class="tour-card availability-card" data-id="${a.id}"><div class="tour-card-main"><div><div class="tour-card-title"><h3>${esc(a.tour_title||"Journey")}</h3><span class="badge">${esc(a.status)}</span></div><p class="muted">${esc(a.date)} · ${a.seats==null?"Seats not specified":esc(a.seats)+" seats"}</p>${a.notes?`<p class="availability-note">${esc(a.notes)}</p>`:""}</div><div class="tour-actions"><button class="ghost edit-availability" type="button">Edit</button><button class="danger delete-availability" type="button">Delete</button></div></div></article>`).join(""); document.querySelectorAll(".edit-availability").forEach(b=>b.addEventListener("click",e=>{const a=availability.find(x=>x.id===Number(e.target.closest("[data-id]").dataset.id));if(!a)return;$("availabilityId").value=a.id;refreshAvailabilityTours();$("availabilityTour").value=a.tour_id;$("availabilityDate").value=a.date;$("availabilitySeats").value=a.seats??"";$("availabilityStatus").value=a.status;$("availabilityNotes").value=a.notes||"";$("availabilityForm").classList.remove("hidden");})); document.querySelectorAll(".delete-availability").forEach(b=>b.addEventListener("click",async e=>{const id=Number(e.target.closest("[data-id]").dataset.id);if(!confirm("Delete this availability date?"))return;await api(`/api/admin/availability/${id}`,{method:"DELETE"});await loadAvailability();})); }
  $("addAvailabilityButton")?.addEventListener("click",()=>{refreshAvailabilityTours();$("availabilityId").value="";$("availabilityForm").reset?.();refreshAvailabilityTours();$("availabilityForm").classList.remove("hidden");});
  $("cancelAvailabilityButton")?.addEventListener("click",()=>$("availabilityForm").classList.add("hidden"));
  $("availabilityForm")?.addEventListener("submit",async e=>{e.preventDefault();const id=$("availabilityId").value;const body={tour_id:Number($("availabilityTour").value),date:$("availabilityDate").value,seats:$("availabilitySeats").value===""?null:Number($("availabilitySeats").value),status:$("availabilityStatus").value,notes:$("availabilityNotes").value.trim()};try{await api(id?`/api/admin/availability/${id}`:"/api/admin/availability",{method:id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});$("availabilityMessage").textContent=id?"Availability updated.":"Availability added.";$("availabilityForm").classList.add("hidden");await loadAvailability();}catch(err){$("availabilityMessage").textContent=err.message;}});

  // Steps 49–50: journey itinerary + journey media managers. Keep inside the existing Tours tab.
  (function setupJourneyExtras(){
    const host=document.querySelector('#toursTab .card');
    if(!host || document.getElementById('journeyExtras')) return;
    const section=document.createElement('section'); section.id='journeyExtras'; section.className='card journey-extras-card';
    section.innerHTML=`
      <div class="section-head"><div><h3>Journey Itinerary</h3><p class="muted">Add a simple day-by-day plan for each journey.</p></div></div>
      <div class="form-grid">
        <label>Journey<select id="itineraryTour"></select></label><label>Day<input id="itineraryDay" type="number" min="1" max="365" value="1"></label>
        <label>Day title<input id="itineraryTitle" maxlength="150" placeholder="Arrival in Hunza"></label>
      </div>
      <label>Details<textarea id="itineraryDetails" maxlength="3000" rows="3" placeholder="What happens on this day…"></textarea></label>
      <div class="form-actions"><button id="saveItinerary" class="primary" type="button">Add day</button></div>
      <div id="itineraryList" class="tour-list"></div>
      <div class="section-head journey-media-head"><div><h3>Journey Photos</h3><p class="muted">Add extra photos that appear on the public journey page.</p></div></div>
      <div class="form-grid"><label>Journey<select id="mediaTour"></select></label><label>Image path / URL<input id="mediaImage" maxlength="500" placeholder="assets/images/tour-photo.jpg"></label><label>Caption<input id="mediaCaption" maxlength="300" placeholder="Alt-style short caption"></label></div>
      <div class="form-actions"><button id="saveTourMedia" class="primary" type="button">Add photo</button></div>
      <div id="tourMediaList" class="tour-list"></div>`;
    host.appendChild(section);
    const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    const fillSelect=(id)=>{const el=$(id);if(el)el.innerHTML=tours.map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('');};
    async function loadItinerary(){const id=Number($('itineraryTour').value);if(!id)return;try{const d=await api(`/api/admin/itinerary/${id}`);$('itineraryList').innerHTML=(d.itinerary||[]).map(x=>`<article class="tour-card" data-itinerary-id="${x.id}"><div class="tour-card-main"><div><div class="tour-card-title"><h3>Day ${x.day}: ${esc(x.title)}</h3></div>${x.details?`<p class="journey-extra-text">${esc(x.details)}</p>`:''}</div><div class="tour-actions"><button class="ghost edit-itinerary" type="button" data-id="${x.id}">Edit</button><button class="danger delete-itinerary" type="button" data-id="${x.id}">Delete</button></div></div></article>`).join('')||'<div class="empty">No itinerary days yet.</div>';}catch(e){$('itineraryList').innerHTML=`<div class="empty">${esc(e.message)}</div>`;}}
    async function loadMedia(){const id=Number($('mediaTour').value);if(!id)return;try{const d=await api(`/api/admin/tour-media/${id}`);$('tourMediaList').innerHTML=(d.media||[]).map(x=>`<article class="tour-card" data-media-id="${x.id}"><div class="tour-card-main"><div><div class="tour-card-title"><h3>${esc(x.caption||'Journey photo')}</h3></div><p class="journey-extra-text">${esc(x.image)}</p></div><div class="tour-actions"><button class="ghost edit-media" type="button" data-id="${x.id}">Edit</button><button class="danger delete-media" type="button" data-id="${x.id}">Delete</button></div></div></article>`).join('')||'<div class="empty">No extra photos yet.</div>';}catch(e){$('tourMediaList').innerHTML=`<div class="empty">${esc(e.message)}</div>`;}}
    function sync(){fillSelect('itineraryTour');fillSelect('mediaTour');loadItinerary();loadMedia();}
    window.refreshJourneyExtras=sync;
    $('itineraryTour').addEventListener('change',loadItinerary); $('mediaTour').addEventListener('change',loadMedia);
    $('saveItinerary').addEventListener('click',async function(){const editId=this.dataset.editId;const body={day:Number($('itineraryDay').value),title:$('itineraryTitle').value.trim(),details:$('itineraryDetails').value.trim()};try{await api(editId?`/api/admin/itinerary/${editId}`:'/api/admin/itinerary',{method:editId?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editId?body:{tour_id:Number($('itineraryTour').value),...body})});delete this.dataset.editId;this.textContent='Add day';$('itineraryTitle').value='';$('itineraryDetails').value='';loadItinerary();}catch(e){alert(e.message);}});
    $('saveTourMedia').addEventListener('click',async function(){const editId=this.dataset.editId;const body={image:$('mediaImage').value.trim(),caption:$('mediaCaption').value.trim()};try{await api(editId?`/api/admin/tour-media/${editId}`:'/api/admin/tour-media',{method:editId?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editId?body:{tour_id:Number($('mediaTour').value),...body})});delete this.dataset.editId;this.textContent='Add photo';$('mediaImage').value='';$('mediaCaption').value='';loadMedia();}catch(e){alert(e.message);}});
    sync();
  })();

  // Gallery management.
  const adminImageUrl = value => {
    const x = String(value || "").trim();
    if (!x) return "";
    if (/^(https?:)?\/\//i.test(x) || x.startsWith("data:")) return x.startsWith("//") ? `${location.protocol}${x}` : x;
    if (x.startsWith("/")) return x;
    if (x.startsWith("../") || x.startsWith("./")) return x;
    if (x.startsWith("assets/") || x.startsWith("images/")) return `../${x}`;
    return x;
  };

  let galleryItems = [];

  function resetGalleryForm() {
    $("galleryForm").reset();
    $("galleryId").value = "";
    $("galleryActive").checked = true;
    $("galleryFeatured").checked = false;
    $("galleryForm").classList.add("hidden");
    $("addGalleryButton").textContent = "+ Add photo";
  }

  function fillGalleryForm(item) {
    $("galleryId").value = item.id;
    $("galleryTitle").value = item.title || "";
    $("galleryCategory").value = item.category || "";
    $("galleryImage").value = item.image || "";
    $("galleryCaption").value = item.caption || "";
    $("galleryFeatured").checked = Number(item.featured) === 1;
    $("galleryActive").checked = Number(item.active) === 1;
    $("galleryForm").classList.remove("hidden");
    $("addGalleryButton").textContent = "Add another photo";
    $("galleryTitle").focus();
  }

  function galleryPayload() {
    return {
      title: $("galleryTitle").value.trim(),
      category: $("galleryCategory").value.trim(),
      image: $("galleryImage").value.trim(),
      media_type: $("galleryMediaType") ? $("galleryMediaType").value : "image",
      video_url: $("galleryVideoUrl") ? $("galleryVideoUrl").value.trim() : "",
      caption: $("galleryCaption").value.trim(),
      featured: $("galleryFeatured").checked,
      active: $("galleryActive").checked
    };
  }

  $("addGalleryButton").addEventListener("click", () => {
    resetGalleryForm();
    $("galleryForm").classList.remove("hidden");
    $("galleryTitle").focus();
  });

  $("cancelGalleryButton").addEventListener("click", resetGalleryForm);

  $("galleryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("galleryId").value;
    const message = $("galleryMessage");
    const submit = $("galleryForm").querySelector('button[type="submit"]');
    submit.disabled = true;
    message.textContent = "Saving...";
    try {
      const data = await api(id ? `/api/admin/gallery/${id}` : "/api/admin/gallery", {
        method: id ? "PATCH" : "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(galleryPayload())
      });
      message.textContent = id ? "Photo updated." : "Photo added.";
      resetGalleryForm();
      await loadGallery();
      setTimeout(() => { message.textContent = ""; }, 1800);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  async function loadGallery() {
    try {
      const data = await api("/api/admin/gallery");
      galleryItems = data.gallery || [];
      renderGalleryAdmin();
    } catch (error) {
      if (error.status === 401) showLogin("Your session has expired. Please sign in again.");
      else $("galleryList").innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    }
  }

  function renderGalleryAdmin() {
    if (!galleryItems.length) {
      $("galleryList").innerHTML = '<div class="empty">No gallery photos yet. Click “+ Add photo” to create the first one.</div>';
      return;
    }

    $("galleryList").innerHTML = galleryItems.map((item) => `
      <article class="gallery-admin-card ${Number(item.active) ? "" : "inactive"}" data-id="${item.id}">
        <div class="gallery-admin-preview">
          <img src="${esc(adminImageUrl(item.image))}" alt="${esc(item.title || "Gallery image")}" loading="lazy"
               onerror="this.style.opacity=.25">
        </div>
        <div class="gallery-admin-main">
          <div class="tour-card-title">
            <h3>${esc(item.title || "Untitled photo")}</h3>
            <span class="badge">${Number(item.active) ? "Active" : "Hidden"}</span>
            ${Number(item.featured) ? '<span class="badge featured-badge">Featured</span>' : ""}
          </div>
          <p class="muted">${esc(item.category || "No category")}</p>
          <p>${esc(item.caption || "No caption added.")}</p>
          <div class="tour-image-path">${esc(item.image)}</div>
        </div>
        <div class="tour-actions">
          <button class="ghost edit-gallery" type="button">Edit</button>
          <button class="danger delete-gallery" type="button">Delete</button>
        </div>
      </article>`).join("");

    document.querySelectorAll(".edit-gallery").forEach((button) => button.addEventListener("click", (event) => {
      const id = Number(event.target.closest(".gallery-admin-card").dataset.id);
      const item = galleryItems.find((entry) => entry.id === id);
      if (item) fillGalleryForm(item);
    }));

    document.querySelectorAll(".delete-gallery").forEach((button) => button.addEventListener("click", async (event) => {
      const id = Number(event.target.closest(".gallery-admin-card").dataset.id);
      const item = galleryItems.find((entry) => entry.id === id);
      if (!item || !confirm(`Delete "${item.title || "this photo"}" permanently?`)) return;
      try {
        await api(`/api/admin/gallery/${id}`, { method: "DELETE" });
        await loadGallery();
      } catch (error) {
        alert(error.message);
      }
    }));
  }



  // Testimonials management.
  let testimonials = [];

  function resetTestimonialForm() {
    $("testimonialForm").reset();
    $("testimonialId").value = "";
    $("testimonialRating").value = "5";
    $("testimonialPublished").checked = true;
    $("testimonialForm").classList.add("hidden");
    $("addTestimonialButton").textContent = "+ Add testimonial";
  }

  function fillTestimonialForm(item) {
    $("testimonialId").value = item.id;
    $("testimonialName").value = item.customer_name || "";
    $("testimonialLocation").value = item.location || "";
    $("testimonialRating").value = String(item.rating || 5);
    $("testimonialPhoto").value = item.photo || "";
    $("testimonialReview").value = item.review || "";
    $("testimonialPublished").checked = Number(item.published) === 1;
    $("testimonialForm").classList.remove("hidden");
    $("addTestimonialButton").textContent = "Add another testimonial";
    $("testimonialName").focus();
  }

  function testimonialPayload() {
    return {
      customer_name: $("testimonialName").value.trim(),
      location: $("testimonialLocation").value.trim(),
      rating: Number($("testimonialRating").value),
      photo: $("testimonialPhoto").value.trim(),
      review: $("testimonialReview").value.trim(),
      published: $("testimonialPublished").checked
    };
  }

  $("addTestimonialButton").addEventListener("click", () => {
    resetTestimonialForm();
    $("testimonialForm").classList.remove("hidden");
    $("testimonialName").focus();
  });

  $("cancelTestimonialButton").addEventListener("click", resetTestimonialForm);

  $("testimonialForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("testimonialId").value;
    const message = $("testimonialMessage");
    const submit = $("testimonialForm").querySelector('button[type="submit"]');
    submit.disabled = true;
    message.textContent = "Saving...";

    try {
      await api(id ? `/api/admin/testimonials/${id}` : "/api/admin/testimonials", {
        method: id ? "PATCH" : "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(testimonialPayload())
      });
      message.textContent = id ? "Testimonial updated." : "Testimonial added.";
      resetTestimonialForm();
      await loadTestimonials();
      setTimeout(() => { message.textContent = ""; }, 1800);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  async function loadTestimonials() {
    try {
      const data = await api("/api/admin/testimonials");
      testimonials = data.testimonials || [];
      renderTestimonials();
    } catch (error) {
      if (error.status === 401) showLogin("Your session has expired. Please sign in again.");
      else if ($("testimonialList")) $("testimonialList").innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    }
  }

  function renderTestimonials() {
    if (!testimonials.length) {
      $("testimonialList").innerHTML = '<div class="empty">No testimonials yet. Click “+ Add testimonial” to create the first one.</div>';
      return;
    }

    $("testimonialList").innerHTML = testimonials.map((item) => {
      const stars = "★".repeat(Math.max(1, Math.min(5, Number(item.rating) || 5)));
      const customerReview = item.source === "customer_review";
      return `
        <article class="testimonial-admin-card ${Number(item.published) ? "" : "inactive"}" data-id="${item.id}" data-source="${customerReview ? "customer_review" : "testimonial"}">
          <div class="testimonial-admin-main">
            <div class="tour-card-title">
              <h3>${esc(item.customer_name)}</h3>
              <span class="badge">${Number(item.published) ? "Published" : (customerReview ? "Pending" : "Hidden")}</span>
            </div>
            <div class="testimonial-admin-stars">${stars}</div>
            <div class="testimonial-admin-review expandable-text ${String(item.review||"").length>240?"is-collapsed":""}"><p class="expandable-text-body">${esc(item.review)}</p>${String(item.review||"").length>240?`<button type="button" class="see-more-btn admin-testimonial-see-more">See more</button>`:""}</div>
            ${item.location ? `<div class="tour-image-path">Location: ${esc(item.location)}</div>` : ""}
            ${customerReview ? `<div class="muted" style="margin-top:8px">Submitted by a website visitor</div>` : ""}
          </div>
          <div class="tour-actions">
            ${customerReview ? `<button class="ghost toggle-customer-review" type="button" data-review-id="${item.id}">${Number(item.published) ? "Hide" : "Approve"}</button><button class="danger delete-customer-review" type="button" data-review-id="${item.id}">Delete</button>` : `<button class="ghost edit-testimonial" type="button">Edit</button><button class="danger delete-testimonial" type="button">Delete</button>`}
          </div>
        </article>`;
    }).join("");

    document.querySelectorAll(".edit-testimonial").forEach((button) => button.addEventListener("click", (event) => {
      const card = event.target.closest(".testimonial-admin-card");
      const id = Number(card.dataset.id);
      const item = testimonials.find((entry) => entry.source !== "customer_review" && entry.id === id);
      if (item) fillTestimonialForm(item);
    }));

    document.querySelectorAll(".admin-testimonial-see-more").forEach((button) => button.addEventListener("click", () => {
      const box = button.closest(".expandable-text");
      const collapsed = box.classList.toggle("is-collapsed");
      button.textContent = collapsed ? "See more" : "See less";
    }));

    document.querySelectorAll(".toggle-customer-review").forEach((button) => button.addEventListener("click", async (event) => {
      const id = Number(event.currentTarget.dataset.reviewId);
      const item = testimonials.find((entry) => entry.source === "customer_review" && entry.id === id);
      if (!item) return;
      try {
        await api(`/api/admin/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !Number(item.published) }) });
        await loadTestimonials();
      } catch (error) { alert(error.message); }
    }));

    document.querySelectorAll(".delete-customer-review").forEach((button) => button.addEventListener("click", async (event) => {
      const id = Number(event.currentTarget.dataset.reviewId);
      const item = testimonials.find((entry) => entry.source === "customer_review" && entry.id === id);
      if (!item || !confirm(`Delete the review from "${item.customer_name}" permanently?`)) return;
      try {
        await api(`/api/admin/reviews/${id}`, { method: "DELETE" });
        await loadTestimonials();
      } catch (error) { alert(error.message); }
    }));

    document.querySelectorAll(".delete-testimonial").forEach((button) => button.addEventListener("click", async (event) => {
      const id = Number(event.target.closest(".testimonial-admin-card").dataset.id);
      const item = testimonials.find((entry) => entry.source !== "customer_review" && entry.id === id);
      if (!item || !confirm(`Delete the testimonial from "${item.customer_name}" permanently?`)) return;
      try {
        await api(`/api/admin/testimonials/${id}`, { method: "DELETE" });
        await loadTestimonials();
      } catch (error) { alert(error.message); }
    }));
  }

  // Destinations management.
  let destinations = [];

  function resetDestinationForm() {
    $("destinationForm").reset();
    $("destinationId").value = "";
    $("destinationActive").checked = true;
    $("destinationForm").classList.add("hidden");
    $("addDestinationButton").textContent = "+ Add destination";
  }

  function fillDestinationForm(item) {
    $("destinationId").value = item.id;
    $("destinationName").value = item.name || "";
    $("destinationSlug").value = item.slug || "";
    $("destinationRegion").value = item.region || "";
    $("destinationBestSeason").value = item.best_season || "";
    $("destinationPriceAmount").value = item.price_amount ?? "";
    $("destinationImage").value = item.image || "";
    $("destinationDescription").value = item.description || "";
    $("destinationHighlights").value = item.highlights || "";
    $("destinationActive").checked = Number(item.active) === 1;
    $("destinationForm").classList.remove("hidden");
    $("addDestinationButton").textContent = "Add another destination";
    $("destinationName").focus();
  }

  function destinationPayload() {
    return {
      name: $("destinationName").value.trim(),
      slug: $("destinationSlug").value.trim(),
      region: $("destinationRegion").value.trim(),
      best_season: $("destinationBestSeason").value.trim(),
      price_amount: $("destinationPriceAmount").value.trim(),
      price_currency: "PKR",
      image: $("destinationImage").value.trim(),
      description: $("destinationDescription").value.trim(),
      highlights: $("destinationHighlights").value.trim(),
      active: $("destinationActive").checked
    };
  }

  $("addDestinationButton").addEventListener("click", () => {
    resetDestinationForm();
    $("destinationForm").classList.remove("hidden");
    $("destinationName").focus();
  });

  $("cancelDestinationButton").addEventListener("click", resetDestinationForm);

  $("destinationForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("destinationId").value;
    const message = $("destinationMessage");
    const submit = $("destinationForm").querySelector('button[type="submit"]');
    submit.disabled = true;
    message.textContent = "Saving...";
    try {
      const data = await api(id ? `/api/admin/destinations/${id}` : "/api/admin/destinations", {
        method: id ? "PATCH" : "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(destinationPayload())
      });
      message.textContent = id ? "Destination updated." : "Destination added.";
      resetDestinationForm();
      await loadDestinations();
      setTimeout(() => { message.textContent = ""; }, 1800);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  async function loadDestinations() {
    try {
      const data = await api("/api/admin/destinations");
      destinations = data.destinations || [];
      renderDestinations();
    } catch (error) {
      if (error.status === 401) showLogin("Your session has expired. Please sign in again.");
      else $("destinationList").innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    }
  }

  function renderDestinations() {
    if (!destinations.length) {
      $("destinationList").innerHTML = '<div class="empty">No destinations yet. Click “+ Add destination” to create your first one.</div>';
      return;
    }

    $("destinationList").innerHTML = destinations.map((item) => `
      <article class="tour-card ${Number(item.active) ? "" : "inactive"}" data-id="${item.id}">
        <div class="tour-card-main">
          ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" style="width:110px;height:80px;object-fit:cover;border-radius:10px;" onerror="this.style.opacity=.25">` : ""}
          <div style="flex:1">
            <div class="tour-card-title"><h3>${esc(item.name)}</h3><span class="badge">${Number(item.active) ? "Active" : "Hidden"}</span></div>
            <p>${esc(item.description || "No description added.")}</p>
            ${item.slug ? `<div class="tour-image-path">Slug: ${esc(item.slug)}</div>` : ""}
            ${item.region ? `<div class="tour-image-path">Region: ${esc(item.region)}</div>` : ""}
            ${item.best_season ? `<div class="tour-image-path">Best season: ${esc(item.best_season)}</div>` : ""}
            ${item.image ? `<div class="tour-image-path">Image: ${esc(item.image)}</div>` : ""}
          </div>
          <div class="tour-actions">
            <button class="ghost edit-destination" type="button">Edit</button>
            <button class="danger delete-destination" type="button">Delete</button>
          </div>
        </div>
      </article>`).join("");

    document.querySelectorAll(".edit-destination").forEach((button) => button.addEventListener("click", (event) => {
      const id = Number(event.target.closest(".tour-card").dataset.id);
      const item = destinations.find((entry) => entry.id === id);
      if (item) fillDestinationForm(item);
    }));

    document.querySelectorAll(".delete-destination").forEach((button) => button.addEventListener("click", async (event) => {
      const id = Number(event.target.closest(".tour-card").dataset.id);
      const item = destinations.find((entry) => entry.id === id);
      if (!item || !confirm(`Delete "${item.name}" permanently?`)) return;
      try {
        await api(`/api/admin/destinations/${id}`, { method: "DELETE" });
        await loadDestinations();
      } catch (error) {
        alert(error.message);
      }
    }));
  }

  api("/api/admin/me").then((data) => showDashboard(data.admin)).catch(() => showLogin());

  // Expose shared admin helpers for CMS modules loaded outside this IIFE.
  window.api = api;
  window.showLogin = showLogin;
})();

/* Step 21 — separate video gallery controls */
document.addEventListener("DOMContentLoaded", () => {
  const type = document.getElementById("galleryMediaType");
  const wrap = document.getElementById("galleryVideoUrlWrap");
  const toggle = () => {
    if (!type || !wrap) return;
    wrap.style.display = type.value === "video" ? "" : "none";
  };
  type?.addEventListener("change", toggle);
  toggle();
});

// Step 33: Journal and FAQ CMS panels.
(function ensureContentManagement(){
  const $ = (id) => document.getElementById(id);
  function esc(v){ return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  async function loadJournal(){ try { const d=await window.api('/api/admin/journal'); $('journalList').innerHTML=(d.articles||[]).map(a=>`<article class="card"><strong>${esc(a.title)}</strong><p class="muted">${esc(a.category||'Uncategorized')} · ${a.published?'Published':'Draft'}</p><p>${esc(a.excerpt||a.content||'').slice(0,220)}</p><button class="ghost" data-edit-journal="${a.id}">Edit</button> <button class="ghost" data-delete-journal="${a.id}">Delete</button></article>`).join('')||'<p class="muted">No articles yet.</p>'; } catch(e){ if(e.status===401) window.showLogin('Your session has expired. Please sign in again.'); } }
  async function loadFaq(){ try { const d=await window.api('/api/admin/faq'); $('faqList').innerHTML=(d.faq||[]).map(a=>`<article class="card"><strong>${esc(a.question)}</strong><p class="muted">${esc(a.category||'Uncategorized')} · ${a.published?'Published':'Hidden'}</p><p>${esc(a.answer).slice(0,220)}</p><button class="ghost" data-edit-faq="${a.id}">Edit</button> <button class="ghost" data-delete-faq="${a.id}">Delete</button></article>`).join('')||'<p class="muted">No FAQ entries yet.</p>'; } catch(e){ if(e.status===401) window.showLogin('Your session has expired. Please sign in again.'); } }
  function resetJournal(){ $('journalForm').reset(); $('journalId').value=''; $('journalPublished').checked=true; $('journalForm').classList.add('hidden'); }
  function resetFaq(){ $('faqForm').reset(); $('faqId').value=''; $('faqPublished').checked=true; $('faqForm').classList.add('hidden'); }
  $('addJournalButton')?.addEventListener('click',()=>{resetJournal();$('journalForm').classList.remove('hidden');});
  $('cancelJournalButton')?.addEventListener('click',resetJournal);
  $('addFaqButton')?.addEventListener('click',()=>{resetFaq();$('faqForm').classList.remove('hidden');});
  $('cancelFaqButton')?.addEventListener('click',resetFaq);
  $('journalForm')?.addEventListener('submit',async e=>{e.preventDefault();const id=$('journalId').value;const body={title:$('journalTitle').value,category:$('journalCategory').value,author:$('journalAuthor').value,image:$('journalImage').value,excerpt:$('journalExcerpt').value,content:$('journalContent').value,published:$('journalPublished').checked};try{await window.api(id?`/api/admin/journal/${id}`:'/api/admin/journal',{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});resetJournal();loadJournal();$('journalMessage').textContent='Saved.';}catch(e){$('journalMessage').textContent=e.message;}});
  $('faqForm')?.addEventListener('submit',async e=>{e.preventDefault();const id=$('faqId').value;const body={question:$('faqQuestion').value,category:$('faqCategory').value,answer:$('faqAnswer').value,published:$('faqPublished').checked};try{await window.api(id?`/api/admin/faq/${id}`:'/api/admin/faq',{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});resetFaq();loadFaq();$('faqMessage').textContent='Saved.';}catch(e){$('faqMessage').textContent=e.message;}});
  document.addEventListener('click',async e=>{const je=e.target.closest('[data-edit-journal]');if(je){const d=await window.api('/api/admin/journal');const a=(d.articles||[]).find(x=>x.id==je.dataset.editJournal);if(a){$('journalId').value=a.id;$('journalTitle').value=a.title;$('journalCategory').value=a.category||'';$('journalAuthor').value=a.author||'';$('journalImage').value=a.image||'';$('journalExcerpt').value=a.excerpt||'';$('journalContent').value=a.content||'';$('journalPublished').checked=!!a.published;$('journalForm').classList.remove('hidden');}}const jd=e.target.closest('[data-delete-journal]');if(jd&&confirm('Delete this article?')){await window.api('/api/admin/journal/'+jd.dataset.deleteJournal,{method:'DELETE'});loadJournal();}const fe=e.target.closest('[data-edit-faq]');if(fe){const d=await window.api('/api/admin/faq');const a=(d.faq||[]).find(x=>x.id==fe.dataset.editFaq);if(a){$('faqId').value=a.id;$('faqQuestion').value=a.question;$('faqCategory').value=a.category||'';$('faqAnswer').value=a.answer;$('faqPublished').checked=!!a.published;$('faqForm').classList.remove('hidden');}}const fd=e.target.closest('[data-delete-faq]');if(fd&&confirm('Delete this FAQ?')){await window.api('/api/admin/faq/'+fd.dataset.deleteFaq,{method:'DELETE'});loadFaq();}});
  const oldOpen=window.openTab;
  window.openTab=function(tabId){ if(typeof oldOpen==='function') oldOpen(tabId); if(tabId==='journalTab') loadJournal(); if(tabId==='faqTab') loadFaq(); };
})();

/* Step 53–54: Customer Reviews + Analytics. These panels extend the existing 39–40 shell without changing its layout. */
(function ensureSteps5354(){
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function addTab(id,label){const tabs=document.querySelector('.tabs');if(tabs&&!tabs.querySelector(`[data-tab="${id}"]`)){const b=document.createElement('button');b.className='tab';b.type='button';b.dataset.tab=id;b.textContent=label;b.addEventListener('click',()=>window.openTab&&window.openTab(id));tabs.appendChild(b);}}
  function addPanel(id,html){if($(id))return;const p=document.createElement('section');p.id=id;p.className='tab-panel hidden';p.innerHTML=html;(document.querySelector('main')||document.body).appendChild(p);}
  addTab('analyticsTab','Analytics');
  addPanel('analyticsTab',`<section class="card"><div class="section-head"><div><h2>Business Analytics</h2><p class="muted">A lightweight overview based on your existing BeyondGB data.</p></div><button id="refreshAnalytics" class="ghost" type="button">Refresh</button></div><div id="analyticsTotals" class="stats"></div><div class="analytics-grid"><section class="card"><h3>Enquiry status</h3><div id="analyticsStatuses" class="tour-list"></div></section><section class="card"><h3>Popular enquiry destinations</h3><div id="analyticsDestinations" class="tour-list"></div></section><section class="card"><h3>Upcoming journey dates</h3><div id="analyticsUpcoming" class="tour-list"></div></section></div></section>`);
  async function loadReviews(){try{const d=await window.api('/api/admin/reviews');const list=$('reviewList');if(!list)return;list.innerHTML=(d.reviews||[]).map(r=>`<article class="tour-card ${r.published?'':'inactive'}" data-review-id="${r.id}"><div class="tour-card-main"><div style="min-width:0;flex:1"><div class="tour-card-title"><h3>${esc(r.customer_name)}</h3><span class="badge">${r.published?'Published':'Pending'}</span></div><p class="muted">${'★'.repeat(Number(r.rating)||0)}${'☆'.repeat(5-(Number(r.rating)||0))}${r.tour_title?' · '+esc(r.tour_title):''}</p><div class="expandable-text is-collapsed"><p class="expandable-text-body">${esc(r.review)}</p>${String(r.review||'').length>240?'<button type="button" class="see-more-btn" data-see-more>See more</button>':''}</div></div><div class="tour-actions"><button class="ghost" type="button" data-review-toggle="${r.id}">${r.published?'Hide':'Approve'}</button><button class="danger" type="button" data-review-delete="${r.id}">Delete</button></div></div></article>`).join('')||'<div class="empty">No customer reviews yet.</div>';}
  catch(e){if(e.status===401)window.showLogin('Your session has expired. Please sign in again.');}}
  async function loadAnalytics(){try{const d=await window.api('/api/admin/analytics');$('analyticsTotals').innerHTML=[['tours','Journeys'],['destinations','Destinations'],['enquiries','Enquiries'],['reviews','Reviews'],['published_reviews','Published reviews'],['journal','Journal articles']].map(([k,l])=>`<div class="stat"><strong>${Number(d.totals?.[k]||0)}</strong><span>${l}</span></div>`).join('');$('analyticsStatuses').innerHTML=(d.enquiry_status||[]).map(x=>`<div class="analytics-row"><span>${esc(x.status||'Unknown')}</span><strong>${Number(x.count)}</strong></div>`).join('')||'<p class="muted">No enquiry data.</p>';$('analyticsDestinations').innerHTML=(d.popular_destinations||[]).map(x=>`<div class="analytics-row"><span>${esc(x.destination)}</span><strong>${Number(x.count)}</strong></div>`).join('')||'<p class="muted">No destination enquiry data.</p>';$('analyticsUpcoming').innerHTML=(d.upcoming||[]).map(x=>`<div class="analytics-row"><span>${esc(x.date)} · ${esc(x.title||'Journey')}</span><strong>${esc(x.status)}${x.seats!==null&&x.seats!==undefined?' · '+Number(x.seats)+' seats':''}</strong></div>`).join('')||'<p class="muted">No upcoming dates.</p>';}catch(e){if(e.status===401)window.showLogin('Your session has expired. Please sign in again.');}}
  document.addEventListener('click',async e=>{const more=e.target.closest('[data-see-more]');if(more){const box=more.closest('.expandable-text');const collapsed=box.classList.toggle('is-collapsed');more.textContent=collapsed?'See more':'See less';return;}const toggle=e.target.closest('[data-review-toggle]');if(toggle){try{const d=await window.api('/api/admin/reviews');const r=(d.reviews||[]).find(x=>x.id==toggle.dataset.reviewToggle);if(r){await window.api('/api/admin/reviews/'+r.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({published:!r.published})});await loadReviews();}}catch(err){alert(err.message);}}const del=e.target.closest('[data-review-delete]');if(del&&confirm('Delete this review permanently?')){try{await window.api('/api/admin/reviews/'+del.dataset.reviewDelete,{method:'DELETE'});await loadReviews();}catch(err){alert(err.message);}}});
  $('refreshAnalytics')?.addEventListener('click',loadAnalytics);
  const oldOpen=window.openTab; window.openTab=function(tabId){if(typeof oldOpen==='function')oldOpen(tabId);if(tabId==='reviewsTab')loadReviews();if(tabId==='analyticsTab')loadAnalytics();};
})();
