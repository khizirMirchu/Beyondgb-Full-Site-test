(() => {
  "use strict";

  const get = id => document.getElementById(id);

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[ch]));

  const imageUrl = value => {
    const x = String(value || "").trim();
    if (!x) return "";
    if (/^(https?:)?\/\//i.test(x) || x.startsWith("/") || x.startsWith("data:")) return x;
    return x.startsWith("../") ? x : "../" + x;
  };

  const splitItems = value =>
    String(value || "").split(/\n|[,;•]/).map(x => x.trim()).filter(Boolean);

  const slug = new URLSearchParams(window.location.search).get("slug");
  if (!slug) return;

  fetch(`/api/tours/${encodeURIComponent(slug)}`, { cache:"no-store" })
    .then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Journey not found.");
      }
      return data.tour;
    })
    .then(tour => {
      document.title = `${tour.title} | BeyondGB`;
      const seoDescription = String(tour.description || `${tour.title} journey with BeyondGB in Gilgit-Baltistan.`).replace(/\s+/g," ").trim().slice(0,160);
      let meta = document.head.querySelector('meta[name="description"]');
      if (!meta) { meta=document.createElement('meta'); meta.name='description'; document.head.appendChild(meta); }
      meta.content=seoDescription;
      const canonical=document.head.querySelector('link[rel="canonical"]'); if(canonical) canonical.href=location.href.split('#')[0];
      const setOg=(name,value)=>{let e=document.head.querySelector(`meta[property="${name}"]`);if(!e){e=document.createElement('meta');e.setAttribute('property',name);document.head.appendChild(e);}e.content=value;};
      setOg('og:title',`${tour.title} | BeyondGB`); setOg('og:description',seoDescription); setOg('og:url',location.href.split('#')[0]); setOg('og:type','article'); const ogImage=imageUrl(tour.image); if(ogImage) setOg('og:image', new URL(ogImage, location.href).href);
      const schema=document.createElement('script'); schema.type='application/ld+json'; schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'TouristTrip',name:tour.title,description:seoDescription,url:location.href.split('#')[0],touristType:'Leisure travelers',itinerary:tour.location||'Gilgit-Baltistan, Pakistan'}); document.head.appendChild(schema);

      get("tourTitle").textContent = tour.title;
      get("tourHeading").textContent = tour.title;
      const description = String(tour.description || "");
      get("tourDescription").textContent = description;
      const descWrap = get("tourDescription").closest(".expandable-text");
      const descMore = get("tourDescriptionMore");
      if (description.length > 500 && descWrap && descMore) { descWrap.classList.add("is-collapsed"); descMore.hidden = false; }
      get("tourLocation").textContent = tour.location || "Gilgit-Baltistan";
      get("tourDuration").textContent = tour.duration || "Custom";
      get("tourPrice").textContent = tour.price || "Contact us";

      const image = imageUrl(tour.image);
      if (image) {
        get("tourImage").innerHTML =
          `<img src="${escapeHtml(image)}" alt="${escapeHtml(tour.title)}">`;
      }

      get("tourIncluded").innerHTML =
        splitItems(tour.included).map(item => `<li>${escapeHtml(item)}</li>`).join("") ||
        "<li>Customized for your trip</li>";

      get("tourExcluded").innerHTML =
        splitItems(tour.excluded).map(item => `<li>${escapeHtml(item)}</li>`).join("") ||
        "<li>Personal expenses</li>";

      get("tourPlan").href =
        `plan.html?tour=${encodeURIComponent(tour.slug || slug)}`;
      const savedKey="beyondgb.savedJourneys";
      const readSaved=()=>{try{return JSON.parse(localStorage.getItem(savedKey)||"[]").map(Number).filter(Number.isFinite);}catch{return[];}};
      const writeSaved=ids=>{try{localStorage.setItem(savedKey,JSON.stringify([...new Set(ids)]));}catch{}};
      const saveButton=get("tourSave");
      const refreshSave=()=>{if(!saveButton)return;const saved=readSaved().includes(Number(tour.id));saveButton.textContent=saved?"Saved journey":"Save journey";saveButton.setAttribute("aria-pressed",String(saved));};
      saveButton?.addEventListener("click",()=>{const ids=readSaved(),id=Number(tour.id);writeSaved(ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);refreshSave();});
      refreshSave();
      const printButton=get("tourPrint");
      printButton?.addEventListener("click",()=>window.print());
      const shareButton=get("tourShare");
      shareButton?.addEventListener("click",async()=>{
        const shareData={title:`${tour.title} | BeyondGB`,text:`Explore ${tour.title} with BeyondGB.`,url:location.href};
        try{
          if(navigator.share) await navigator.share(shareData);
          else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);shareButton.textContent="Link copied";setTimeout(()=>shareButton.textContent="Share journey",1800);}
        }catch(error){ if(error?.name!=="AbortError") console.warn("Share unavailable",error); }
      });

      document.querySelectorAll("[data-see-more]").forEach(button=>button.addEventListener("click",()=>{
        const box=button.closest(".expandable-text");
        const collapsed=box.classList.toggle("is-collapsed");
        button.textContent=collapsed?"See more":"See less";
      }));
      const reviewsRoot=get("tourReviews");
      const reviewForm=get("reviewForm");
      if(reviewsRoot){
        fetch(`/api/reviews?tour_id=${encodeURIComponent(tour.id)}`,{cache:"no-store"}).then(r=>r.json()).then(data=>{const items=data.reviews||[];reviewsRoot.innerHTML=items.length?items.map(r=>`<article class="tour-review-card"><strong>${escapeHtml(r.customer_name)}</strong><span>${"★".repeat(Number(r.rating)||0)}${"☆".repeat(5-(Number(r.rating)||0))}</span><div class="expandable-text is-collapsed"><p class="expandable-text-body">${escapeHtml(r.review)}</p>${String(r.review||"").length>240?'<button type="button" class="see-more-btn" data-see-more>See more</button>':""}</div></article>`).join(""):"<p class=\"muted\">No reviews yet. Be the first to share your experience.</p>";}).catch(()=>reviewsRoot.innerHTML='<p class="muted">Reviews are unavailable right now.</p>');
      }
      reviewForm?.addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(reviewForm);const msg=get("reviewFormMessage");try{const r=await fetch("/api/reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tour_id:tour.id,customer_name:f.get("customer_name"),rating:Number(f.get("rating")),review:f.get("review"),website:f.get("website")})});const d=await r.json();if(!r.ok)throw new Error(d.message||"Unable to submit review.");msg.textContent=d.message;reviewForm.reset();}catch(err){msg.textContent=err.message;}});

      const availabilityRoot=get("tourAvailability"); if(availabilityRoot){ fetch(`/api/tours/${encodeURIComponent(slug)}/availability`,{cache:"no-store"}).then(r=>r.json()).then(data=>{const items=data.availability||[]; availabilityRoot.innerHTML=items.length?items.map(a=>`<div class="availability-row"><div><strong>${escapeHtml(a.date)}</strong>${a.notes?`<span>${escapeHtml(a.notes)}</span>`:""}</div><span class="availability-badge status-${escapeHtml(a.status)}">${escapeHtml(a.status)}${a.seats!==null&&a.status!=="full"?` · ${escapeHtml(a.seats)} seats`:""}</span></div>`).join(""):'<p class="muted">Contact us for your preferred travel date.</p>';}).catch(()=>availabilityRoot.innerHTML='<p class="muted">Contact us for availability and preferred dates.</p>'); }
      const itineraryRoot=get("tourItinerary"); if(itineraryRoot){ fetch(`/api/tours/${encodeURIComponent(slug)}/itinerary`,{cache:"no-store"}).then(r=>r.json()).then(data=>{const items=data.itinerary||[]; itineraryRoot.innerHTML=items.length?items.map(x=>`<article class="itinerary-row"><div class="itinerary-day">Day ${escapeHtml(x.day)}</div><div><h3>${escapeHtml(x.title)}</h3>${x.details?`<div class="expandable-text is-collapsed"><p class="expandable-text-body">${escapeHtml(x.details)}</p>${String(x.details).length>240?`<button type="button" class="see-more-btn" data-see-more>See more</button>`:""}</div>`:""}</div></article>`).join(""):'<p class="muted">A day-by-day plan will be added for this journey.</p>'; document.querySelectorAll("#tourItinerary [data-see-more]").forEach(button=>button.addEventListener("click",()=>{const box=button.closest(".expandable-text");const collapsed=box.classList.toggle("is-collapsed");button.textContent=collapsed?"See more":"See less";}));}).catch(()=>itineraryRoot.innerHTML='<p class="muted">Contact us for the journey plan.</p>'); }
      const mediaRoot=get("tourMediaGallery"); if(mediaRoot){ fetch(`/api/tours/${encodeURIComponent(slug)}/media`,{cache:"no-store"}).then(r=>r.json()).then(data=>{const items=data.media||[]; mediaRoot.innerHTML=items.length?items.map(x=>`<figure><img src="${escapeHtml(x.image)}" alt="${escapeHtml(x.caption||tour.title)}" loading="lazy">${x.caption?`<figcaption>${escapeHtml(x.caption)}</figcaption>`:""}</figure>`).join(""):'<p class="muted">No additional journey photos yet.</p>';}).catch(()=>mediaRoot.innerHTML='<p class="muted">Journey photos are unavailable right now.</p>'); }
    })
    .catch(error => {
      console.error(error);
      get("tourTitle").textContent = "Journey not found";
    });
})();