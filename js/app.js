(() => {
  "use strict";

  const CONFIG = { whatsapp: "923415771154" };
  let SITE_WHATSAPP = CONFIG.whatsapp;
  const applySiteSettings = async () => {
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const settings = data.settings || {};
      const cleanPhone = String(settings.phone || "").trim();
      const whatsapp = String(settings.whatsapp || "").replace(/\D/g, "");
      if (whatsapp) SITE_WHATSAPP = whatsapp;
      const company = String(settings.company_name || "").trim();
      const address = String(settings.address || "").trim();
      const email = String(settings.email || "").trim();
      const logo = String(settings.logo || "").trim();
      const companyDescription = String(settings.company_description || "").trim();
      const openingHours = String(settings.opening_hours || "").trim();
      const social = [
        ["Facebook", settings.facebook], ["Instagram", settings.instagram], ["YouTube", settings.youtube], ["TikTok", settings.tiktok]
      ].filter(([, value]) => /^https?:\/\//i.test(String(value || "").trim()));

      document.querySelectorAll(".brand-text").forEach(el => { if (company) el.textContent = company.toUpperCase(); });
      document.querySelectorAll(".footer-brand p").forEach(el => { if (companyDescription) el.textContent = companyDescription; });
      document.querySelectorAll(".brand img, .footer-brand img").forEach(img => {
        if (logo) img.src = logo.startsWith("http") || logo.startsWith("/") ? logo : (location.pathname.includes("/pages/") || location.pathname.includes("/services/") || location.pathname.includes("/destinations/") ? "../" + logo : logo);
        if (company) img.alt = `${company} logo`;
      });

      if (cleanPhone) {
        document.querySelectorAll('a[href^="tel:"]').forEach(link => {
          link.href = `tel:${cleanPhone.replace(/\s+/g, "")}`;
          if (link.closest(".top-links") || link.closest(".footer-links")) link.textContent = cleanPhone;
        });
      }
      if (whatsapp) {
        document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
          const message = link.dataset.wa || "Hello BeyondGB, I’d like to plan a trip.";
          link.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
        });
      }
      if (email) {
        document.querySelectorAll('a[href^="mailto:"]').forEach(link => link.href = `mailto:${email}`);
      }
      document.querySelectorAll(".top-links").forEach(el => {
        const span = el.querySelector("span");
        if (span && address) span.textContent = address;
      });
      document.querySelectorAll(".footer-bottom span:first-child").forEach(el => {
        if (company) el.textContent = `© ${new Date().getFullYear()} ${company}. All rights reserved.`;
      });

      document.querySelectorAll(".footer-grid").forEach(footer => {
        let contact = footer.querySelector(".site-settings-contact");
        if (!contact && (email || openingHours || social.length)) {
          contact = document.createElement("div");
          contact.className = "site-settings-contact";
          contact.innerHTML = `<h4>Connect</h4><div class="footer-links"></div>`;
          footer.appendChild(contact);
        }
        if (!contact) return;
        const links = contact.querySelector(".footer-links");
        links.innerHTML = "";
        if (email) {
          const a = document.createElement("a"); a.href = `mailto:${email}`; a.textContent = email; links.appendChild(a);
        }
        if (openingHours) {
          const span = document.createElement("span"); span.textContent = openingHours; links.appendChild(span);
        }
        social.forEach(([label, value]) => {
          const a = document.createElement("a"); a.href = String(value).trim(); a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = label; links.appendChild(a);
        });
      });

      const title = String(settings.seo_title || "").trim();
      const description = String(settings.seo_description || "").trim();
      const existingTitle = document.title;
      if (title && (!existingTitle || existingTitle === "BeyondGB")) document.title = title;
      if (description) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
        if (!meta.content) meta.content = description;
      }
    } catch (error) {
      console.warn("Site settings could not be applied:", error.message);
    }
  };

  applySiteSettings();


  const whatsappUrl = (text) =>
    `https://wa.me/${SITE_WHATSAPP}?text=${encodeURIComponent(text)}`;

  // WhatsApp links used throughout the public website.
  document.querySelectorAll("[data-wa]").forEach((link) => {
    const text = link.dataset.wa;
    if (text) link.href = whatsappUrl(text);
  });

  // Consistent navigation: active-page indicator + mobile menu on every public page.
  const nav = document.querySelector(".nav");
  const navLinks = document.querySelector(".nav-links");
  if (nav && navLinks) {
    const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    navLinks.querySelectorAll("a").forEach(link => {
      try {
        const target = new URL(link.href, location.href).pathname.split("/").pop().toLowerCase();
        if (target === current || (current === "index.html" && target === "")) link.classList.add("active-page");
      } catch (_) {}
    });
    const menu = document.querySelector(".menu-btn");
    if (menu) {
      const panel = document.createElement("div");
      panel.className = "mobile-nav-panel";
      panel.setAttribute("aria-hidden", "true");
      panel.innerHTML = navLinks.innerHTML;
      nav.appendChild(panel);
      panel.querySelectorAll("a").forEach(link => {
        try {
          const target = new URL(link.href, location.href).pathname.split("/").pop().toLowerCase();
          if (target === current) link.classList.add("active-page");
        } catch (_) {}
        link.addEventListener("click", () => { panel.classList.remove("open"); nav.classList.remove("mobile-open"); menu.setAttribute("aria-expanded", "false"); });
      });
      const close = () => { panel.classList.remove("open"); nav.classList.remove("mobile-open"); menu.setAttribute("aria-expanded", "false"); panel.setAttribute("aria-hidden", "true"); };
      menu.addEventListener("click", () => {
        const open = panel.classList.toggle("open");
        nav.classList.toggle("mobile-open", open);
        menu.setAttribute("aria-expanded", String(open));
        panel.setAttribute("aria-hidden", String(!open));
      });
      document.addEventListener("click", e => { if (panel.classList.contains("open") && !nav.contains(e.target)) close(); });
    }
  }

  // Plan Your Trip: dynamic destinations + context-aware prefill.
  const params = new URLSearchParams(location.search);
  const prefillForm = document.getElementById("quoteForm");
  if (prefillForm) {
    const destinationField = prefillForm.querySelector('[name="destination"]');
    const customDestinationField = prefillForm.querySelector('[name="custom_destination"]');
    const serviceField = prefillForm.querySelector('[name="service"]');
    const messageField = prefillForm.querySelector('[name="message"]');
    const budgetField = prefillForm.querySelector('[name="budget"]');
    const tourIdField = prefillForm.querySelector('[name="tour_id"]');
    const tour = params.get("tour");
    const tourlist = params.get("tourlist");
    const destination = params.get("destination");
    const service = params.get("service");
    const escAttr = value => String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
    const pretty = value => String(value || "").replace(/[-_]+/g, " ").replace(/\b\w/g, m => m.toUpperCase());
    const setDestination = value => {
      if (!destinationField) return;
      const target = String(value || "").trim();
      const option = [...destinationField.options].find(o => o.value !== "__other__" && o.text.trim().toLowerCase() === target.toLowerCase());
      if (option) {
        destinationField.value = option.value;
        customDestinationField?.classList.add("hidden");
        if (customDestinationField) { customDestinationField.value = ""; customDestinationField.required = false; }
      } else if (target) {
        destinationField.value = "__other__";
        if (customDestinationField) { customDestinationField.value = target; customDestinationField.classList.remove("hidden"); customDestinationField.required = true; }
      }
    };
    const loadDestinations = () => fetch("/api/destinations", {cache:"no-store"}).then(r => r.ok ? r.json() : null).then(data => {
      if (!destinationField || !data?.destinations) return;
      destinationField.innerHTML = '<option value="">Select destination</option>' + data.destinations.map(d => { const n=String(d.name||""); return `<option value="${escAttr(n)}">${escAttr(n)}</option>`; }).join("") + '<option value="__other__">Other</option>';
      if (destination) setDestination(pretty(destination));
    }).catch(() => { if (destination) setDestination(pretty(destination)); });
    destinationField?.addEventListener("change", () => {
      const other = destinationField.value === "__other__";
      customDestinationField?.classList.toggle("hidden", !other);
      if (customDestinationField) { customDestinationField.required = other; if (!other) customDestinationField.value = ""; }
      if (other) customDestinationField?.focus();
    });
    const prefillTour = slug => fetch(`/api/tours/${encodeURIComponent(slug)}`, {cache:"no-store"}).then(r => r.ok ? r.json() : null).then(data => {
      const t=data?.tour; if(!t) return;
      if(tourIdField) tourIdField.value=t.id||"";
      setDestination(t.location || t.destination || "");
      if(budgetField && !budgetField.value && t.price) budgetField.value=t.price;
      if(serviceField) { const opt=[...serviceField.options].find(o=>/tour/i.test(o.text)&&!/hotel|bike|trek|village|car/i.test(o.text)); if(opt) serviceField.value=opt.value; }
      if(messageField && !messageField.value) messageField.value=[`I would like to enquire about the ${t.title} journey.`,t.duration?`Duration: ${t.duration}.`:"",t.price?`Starting price: ${t.price}.`:"",t.description?`Journey details: ${String(t.description).slice(0,1200)}`:""].filter(Boolean).join(" ");
    }).catch(()=>{});
    loadDestinations();
    if(tour) prefillTour(tour);
    if(service && serviceField) { const desired=service.replace(/^service-/i,"").replace(/[-_]+/g," ").toLowerCase(); const opt=[...serviceField.options].find(o=>o.text.toLowerCase()===desired); if(opt) serviceField.value=opt.value; }
    if(tourlist && messageField && !messageField.value) messageField.value=`I would like to enquire about these journeys: ${tourlist.split(",").filter(Boolean).map(pretty).join(", ")}.`;
    if((tour||destination) && serviceField && !serviceField.value) { const opt=[...serviceField.options].find(o=>/customized tours/i.test(o.text)); if(opt) serviceField.value=opt.value; }
    if((destination||tour) && messageField && !messageField.value && !tourlist) messageField.value=`I would like to enquire about this ${tour?"journey":"destination"}: ${pretty(tour||destination)}.`;
  }

  // Contact buttons can use current Site Settings without hard-coded numbers.
  document.querySelectorAll("[data-whatsapp-message]").forEach(link => {
    const message = link.dataset.whatsappMessage || "Hello BeyondGB, I’d like to plan a trip.";
    link.href = whatsappUrl(message);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  // Plan Your Trip enquiry form.
  const quoteForm = document.getElementById("quoteForm");
  const formMessage = document.getElementById("formMessage");
  const successModal = document.getElementById("successModal");
  const successClose = document.getElementById("successClose");

  const closeSuccessModal = () => {
    if (successModal) successModal.classList.remove("active");
  };

  if (successClose) successClose.addEventListener("click", closeSuccessModal);

  if (successModal) {
    successModal.addEventListener("click", (event) => {
      if (event.target === successModal) closeSuccessModal();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSuccessModal();
  });

  if (quoteForm) {
    quoteForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitButton = quoteForm.querySelector('button[type="submit"]');
      const formData = new FormData(quoteForm);
      const enquiry = Object.fromEntries(formData.entries());
      if (enquiry.destination === "__other__") enquiry.destination = String(enquiry.custom_destination || "").trim();
      delete enquiry.custom_destination;
      if (params.get("tour")) enquiry.service = "Tour Enquiry";
      else if (params.get("destination")) enquiry.service = "Destination Enquiry";
      else if (quoteForm.dataset.contactForm === "true") enquiry.service = "Contact Form";

      if (formMessage) {
        formMessage.className = "form-message";
        formMessage.textContent = "Sending your request...";
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending request…";
      }

      try {
        const response = await fetch("/api/enquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enquiry)
        });

        let result = {};
        try { result = await response.json(); } catch (_) {}

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to send your request. Please try again.");
        }

        quoteForm.reset();
        if (formMessage) formMessage.textContent = "";
        if (successModal) successModal.classList.add("active");
      } catch (error) {
        console.error("FORM ERROR:", error);
        if (formMessage) {
          formMessage.className = "form-message error";
          formMessage.textContent = error.message || "Unable to send your request. Please try again.";
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Send My Request →";
        }
      }
    });
  }
})();

// Step 56: register the installable BeyondGB app shell.
(() => {
  if (!('serviceWorker' in navigator)) return;
  const manifest = document.createElement('link'); manifest.rel = 'manifest'; manifest.href = '/manifest.webmanifest'; document.head.appendChild(manifest);
  const theme = document.createElement('meta'); theme.name='theme-color'; theme.content='#111111'; document.head.appendChild(theme);
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
})();
