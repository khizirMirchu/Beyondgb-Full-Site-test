(() => {
  "use strict";

  const grid = document.getElementById("publicToursGrid");
  if (!grid) return;

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const renderTours = (tours) => {
    if (!Array.isArray(tours) || tours.length === 0) {
      grid.innerHTML = `
        <div class="empty" style="grid-column:1/-1;">
          No journeys are currently published. Please check back soon.
        </div>`;
      return;
    }

    grid.innerHTML = tours.map((tour, index) => `
      <article class="feature-box tour-card" id="tour-${escapeHtml(tour.id)}">
        ${tour.image ? `<img src="${escapeHtml(tour.image)}" alt="${escapeHtml(tour.title)}" loading="lazy" class="tour-card-image" onerror="this.style.display='none';">` : ""}
        <span class="number-large">${String(index + 1).padStart(2, "0")}</span>
        <h3>${escapeHtml(tour.title)}</h3>
        <p>${escapeHtml(
          [tour.duration, tour.destination, tour.difficulty]
            .filter(Boolean)
            .join(" · ")
        )}</p>
        <p>${escapeHtml(
          tour.description || "A flexible journey across Gilgit-Baltistan."
        )}</p>
        ${tour.price ? `<p><strong>${escapeHtml(tour.price)}</strong></p>` : ""}
        <a class="btn btn-primary"
           href="../pages/plan.html?tour=${encodeURIComponent(tour.id)}">
          Plan this journey
        </a>
      </article>
    `).join("");
  };

  const loadTours = async () => {
    try {
      const response = await fetch("/api/tours", {
        method: "GET",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Tours API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.success !== true) {
        throw new Error(data?.message || "Tours API returned an invalid response");
      }

      renderTours(data.tours);
    } catch (error) {
      console.error("BeyondGB public tours error:", error);
      grid.innerHTML = `
        <div class="empty" style="grid-column:1/-1;">
          Unable to load journeys right now. Please refresh the page.
        </div>`;
    }
  };

  loadTours();
})();
