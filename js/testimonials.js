(() => {
  "use strict";

  const root = document.getElementById("publicTestimonials");
  if (!root) return;

  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"
  }[char]));

  fetch("/api/testimonials", { credentials: "same-origin", cache: "no-store" })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load testimonials.");
      return data.testimonials || [];
    })
    .then((items) => {
      if (!items.length) {
        root.innerHTML = `
          <article class="testimonial-empty">
            <span class="eyebrow">Guest stories</span>
            <h3>Your next journey could be here.</h3>
            <p>Guest reviews will appear here automatically once they are approved.</p>
          </article>`;
        return;
      }

      root.innerHTML = items.slice(0, 6).map((item) => {
        const rating = Math.max(1, Math.min(5, Number(item.rating) || 5));
        const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
        const review = item.review ?? item.message ?? "";
        return `
          <article class="testimonial-card">
            <div class="testimonial-stars" aria-label="${rating} out of 5 stars">${stars}</div>
            <div class="testimonial-review expandable-text ${String(review).length>240?"is-collapsed":""}"><blockquote class="expandable-text-body">“${esc(review)}”</blockquote>${String(review).length>240?`<button type="button" class="see-more-btn testimonial-see-more">See more</button>`:""}</div>
            <div class="testimonial-person">
              ${item.photo ? `<img src="${esc(item.photo)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ""}
              <div>
                <strong>${esc(item.customer_name ?? item.name ?? "Traveler")}</strong>
                ${item.location ? `<span>${esc(item.location)}</span>` : ""}
              </div>
            </div>
          </article>`;
      }).join("");
      root.querySelectorAll(".testimonial-see-more").forEach(button=>button.addEventListener("click",()=>{const box=button.closest(".expandable-text");const collapsed=box.classList.toggle("is-collapsed");button.textContent=collapsed?"See more":"See less";}));
    })
    .catch(() => {
      root.innerHTML = `
        <article class="testimonial-empty">
          <span class="eyebrow">Guest stories</span>
          <h3>Guest stories are unavailable right now.</h3>
          <p>Please check back soon.</p>
        </article>`;
    });
})();
