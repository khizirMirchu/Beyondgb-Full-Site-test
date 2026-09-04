(() => {
  "use strict";
  const grid = document.getElementById("publicGalleryGrid");
  if (!grid) return;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));

  const normalizeImagePath = value => {
    const image = String(value || "").trim();
    if (!image) return "";
    if (/^(https?:)?\/\//i.test(image) || image.startsWith("data:")) return image.startsWith("//") ? `${location.protocol}${image}` : image;
    if (image.startsWith("/")) return image;
    if (image.startsWith("../") || image.startsWith("./")) return image;
    if (image.startsWith("assets/") || image.startsWith("images/")) return `../${image}`;
    return image;
  };

  let items = [];
  let categories = [];

  const ensureLightbox = () => {
    if (document.getElementById("galleryLightbox")) return;
    const box = document.createElement("div");
    box.id = "galleryLightbox";
    box.className = "gallery-lightbox";
    box.hidden = true;
    box.innerHTML = `<button class="gallery-lightbox-close" type="button" aria-label="Close">×</button><div class="gallery-lightbox-counter" aria-live="polite"></div><button class="gallery-lightbox-prev" type="button" aria-label="Previous photo">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="gallery-lightbox-next" type="button" aria-label="Next photo">›</button>`;
    document.body.appendChild(box);
    return box;
  };

  const openLightbox = index => {
    const box = ensureLightbox();
    let current = index;
    const render = () => {
      const item = items[current];
      if (!item) return;
      const img = box.querySelector("img");
      img.src = normalizeImagePath(item.image);
      img.alt = item.title || "BeyondGB gallery image";
      box.querySelector("figcaption").textContent = item.caption || item.title || "";
      box.querySelector(".gallery-lightbox-counter").textContent = `${current + 1} / ${items.length}`;
      box.hidden = false;
      document.body.classList.add("gallery-lightbox-open");
    };
    box.querySelector(".gallery-lightbox-close").onclick = () => { box.hidden=true; document.body.classList.remove("gallery-lightbox-open"); };
    box.querySelector(".gallery-lightbox-prev").onclick = () => { current=(current-1+items.length)%items.length; render(); };
    box.querySelector(".gallery-lightbox-next").onclick = () => { current=(current+1)%items.length; render(); };
    box.onclick = e => { if (e.target === box) box.querySelector(".gallery-lightbox-close").click(); };
    render();
  };

  const render = filter => {
    const visible = filter === "all" ? items : items.filter(item => (item.category || "Uncategorized") === filter);
    if (!visible.length) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1;">No photos in this category yet.</div>'; return; }
    grid.innerHTML = visible.map(item => {
      const index = items.indexOf(item);
      const src = normalizeImagePath(item.image);
      return `<button class="gallery-item" type="button" data-gallery-index="${index}">
        <img src="${esc(src)}" alt="${esc(item.title || "BeyondGB gallery image")}" loading="lazy" onerror="this.classList.add('gallery-image-error')">
        <span class="gallery-caption"><strong>${esc(item.title || "BeyondGB")}</strong>${item.caption ? `<small>${esc(item.caption)}</small>` : ""}</span>
      </button>`;
    }).join("");
    grid.querySelectorAll(".gallery-item").forEach(btn => btn.addEventListener("click", () => openLightbox(Number(btn.dataset.galleryIndex))));
  };

  const renderFilters = () => {
    const host = document.querySelector("[data-gallery-filters]");
    if (!host || categories.length < 2) return;
    host.innerHTML = `<button class="gallery-filter active" type="button" data-filter="all">All</button>${categories.map(c => `<button class="gallery-filter" type="button" data-filter="${esc(c)}">${esc(c)}</button>`).join("")}`;
    host.querySelectorAll(".gallery-filter").forEach(btn => btn.addEventListener("click", () => {
      host.querySelectorAll(".gallery-filter").forEach(b => b.classList.remove("active")); btn.classList.add("active"); render(btn.dataset.filter);
    }));
  };

  fetch("/api/gallery", { cache:"no-store", headers:{Accept:"application/json"} })
    .then(async response => { const data=await response.json().catch(()=>({})); if(!response.ok||!data.success) throw new Error(data.message||"Unable to load gallery."); return data.gallery||[]; })
    .then(data => {
      items=data;
      categories=[...new Set(items.map(i => String(i.category||"").trim()).filter(Boolean))].sort();
      renderFilters(); render("all");
    })
    .catch(error => { console.error("BeyondGB gallery error:", error); grid.innerHTML='<div class="empty" style="grid-column:1/-1;">Unable to load gallery right now. Please refresh the page.</div>'; });

  document.addEventListener("keydown", e => {
    const box=document.getElementById("galleryLightbox"); if(!box||box.hidden)return;
    if(e.key==="Escape") box.querySelector(".gallery-lightbox-close").click();
    if(e.key==="ArrowLeft") box.querySelector(".gallery-lightbox-prev").click();
    if(e.key==="ArrowRight") box.querySelector(".gallery-lightbox-next").click();
  });
})();
