(() => {
  "use strict";
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const media=v=>{const x=String(v||"").trim();if(!x)return"";if(/^(https?:)?\/\//i.test(x)||x.startsWith("/"))return x;return `/${x.replace(/^\.?\//,"")}`};
  const fill=(selectors,html)=>{for(const sel of selectors){const el=document.querySelector(sel);if(el){el.innerHTML=html;return}}};
  fetch("/api/homepage",{cache:"no-store"}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw Error(d.message||"Homepage unavailable");return d})
  .then(d=>{
    fill(["#homepageDestinations","#featuredDestinations",".homepage-destinations",".dest-grid"],(d.destinations||[]).map((x,i)=>{
      const slug=encodeURIComponent(x.slug||"");
      const description=String(x.description||"");
      const season=x.best_season||x.bestSeason||"";
      const highlights=Array.isArray(x.highlights)?x.highlights.join(" · "):String(x.highlights||"");
      return `<article class="homepage-dynamic-card homepage-destination-card">
        <div class="homepage-destination-media">${media(x.image)?`<img src="${esc(media(x.image))}" alt="${esc(x.name)}" loading="lazy">`:""}<div class="homepage-destination-overlay"><span class="homepage-destination-number">${String(i+1).padStart(2,"0")}</span><div class="homepage-destination-actions"><a class="btn btn-primary" href="pages/destination.html?slug=${slug}">View destination</a><a class="btn btn-light" href="pages/plan.html?destination=${slug}">Plan this trip</a></div></div></div>
        <div class="homepage-dynamic-body"><span class="eyebrow">${esc(x.location||"Gilgit-Baltistan")}</span><h3>${esc(x.name)}</h3>
          <div class="homepage-destination-meta">${season?`<span>Best time: ${esc(season)}</span>`:""}${highlights?`<span>${esc(highlights.slice(0,110))}</span>`:""}</div>
          <div class="expandable-text ${description.length>140?"is-collapsed":""}"><p class="card-description-preview expandable-text-body">${esc(description)}</p>${description.length>140?`<button type="button" class="see-more-btn" data-see-more>See more</button>`:""}</div>
        </div></article>`;
    }).join(""));
    fill(["#homepageTours","#featuredTours",".homepage-tours","[data-featured-tours]","[data-latest-tours]"],(d.tours||[]).slice(0,3).map(x=>`
      <article class="homepage-dynamic-card">${media(x.image)?`<img src="${esc(media(x.image))}" alt="${esc(x.title)}" loading="lazy">`:""}
      <div class="homepage-dynamic-body"><span class="eyebrow">${esc(x.location||"Gilgit-Baltistan")}</span><h3>${esc(x.title)}</h3><div class="expandable-text ${String(x.description||"").length>140?"is-collapsed":""}"><p class="card-description-preview expandable-text-body">${esc(x.description||"")}</p>${String(x.description||"").length>140?`<button type="button" class="see-more-btn" data-see-more>See more</button>`:""}</div>
      <a class="text-link" href="pages/tour.html?slug=${encodeURIComponent(x.slug||"")}">Explore journey →</a></div></article>`).join(""));
    fill(["#homepageGallery",".homepage-gallery"],(d.gallery||[]).slice(0,6).map(x=>`
      <a class="homepage-gallery-item" href="pages/gallery.html">${media(x.image)?`<img src="${esc(media(x.image))}" alt="${esc(x.title||"BeyondGB gallery photo")}" loading="lazy">`:""}</a>`).join(""));
    fill(["#homepageTestimonials","#testimonialsGrid",".homepage-testimonials"],(d.testimonials||[]).slice(0,3).map(x=>{
      const message=String(x.message||"");
      const long=message.length>240;
      return `<article class="homepage-testimonial"><div class="testimonial-stars">${"★".repeat(Math.max(0,Math.min(5,Number(x.rating)||5)))}</div>
      <div class="testimonial-review expandable-text ${long?"is-collapsed":""}"><p class="expandable-text-body">“${esc(message)}”</p>${long?`<button type="button" class="see-more-btn testimonial-see-more" data-see-more>See more</button>`:""}</div><strong>${esc(x.name||"Traveler")}</strong>${x.location?`<span>${esc(x.location)}</span>`:""}</article>`;
    }).join(""));
  }).catch(e=>console.error("Homepage dynamic content:",e));

  document.querySelectorAll("[data-see-more]").forEach(button=>button.addEventListener("click",()=>{
    const box=button.closest(".expandable-text");
    const collapsed=box.classList.toggle("is-collapsed");
    button.textContent=collapsed?"See more":"See less";
  }));
})();