(() => {
  "use strict";

  // Homepage announcement: always points to a real active journey.
  const loadAnnouncement = async () => {
    const banner = document.querySelector("[data-tour-announcement]");
    if (!banner) return;

    try {
      const response = await fetch("/api/tours", {
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load journeys.");

      const tours = Array.isArray(data.tours) ? data.tours : [];
      const tour = tours[0];

      if (!tour || !tour.slug) {
        banner.hidden = true;
        return;
      }

      const text = banner.querySelector("[data-announcement-text]");
      if (text) text.textContent = `NEW JOURNEY • ${tour.title}`;
      banner.href = `pages/tour.html?slug=${encodeURIComponent(tour.slug)}`;
      banner.setAttribute("aria-label", `View new journey: ${tour.title}`);
      banner.hidden = false;
    } catch (error) {
      console.error("BeyondGB announcement:", error);
      banner.hidden = true;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAnnouncement);
  } else {
    loadAnnouncement();
  }
})();
