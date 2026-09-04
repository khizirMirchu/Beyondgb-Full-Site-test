(() => {
  "use strict";
  const root=document.getElementById("relatedToursGrid"); if(!root)return;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const img=v=>{const x=String(v||"").trim();if(!x)return"";if(/^(https?:)?\/\//i.test(x)||x.startsWith("/"))return x;return `../${x.replace(/^\.?\//,"")}`};
  const slug=new URLSearchParams(location.search).get("slug")||"";
  const norm=v=>String(v||"").toLowerCase().replace(/[-_]/g," ").trim();
  Promise.all([fetch("/api/destinations/"+encodeURIComponent(slug),{cache:"no-store"}).then(r=>r.json()),fetch("/api/tours",{cache:"no-store"}).then(r=>r.json())])
    .then(([destinationData,tourData])=>{
      const d=destinationData.destination||{}; const key=norm(d.name||slug);
      const tours=(tourData.tours||[]).filter(t=>{const vals=[t.destination,t.location,t.title].map(norm);return key && vals.some(v=>v===key||v.includes(key)||key.includes(v));}).slice(0,3);
      if(!tours.length){root.innerHTML='<p class="muted">No journeys are currently listed for this destination.</p>';return;}
      root.innerHTML=tours.map(t=>`<article class="tour-card public-tour-card">${img(t.image)?`<img src="${esc(img(t.image))}" alt="${esc(t.title)}" loading="lazy">`:""}<div class="tour-card-body"><span class="eyebrow">${esc(t.location||t.destination||"Gilgit-Baltistan")}</span><h3>${esc(t.title)}</h3><div class="expandable-text ${String(t.description||"").length>140?"is-collapsed":""}"><p class="card-description-preview expandable-text-body">${esc(t.description||"")}</p>${String(t.description||"").length>140?'<button type="button" class="see-more-btn" data-see-more>See more</button>':""}</div><a class="btn btn-primary" href="../pages/tour.html?slug=${encodeURIComponent(t.slug||"")}">Explore journey</a></div></article>`).join("");
      root.querySelectorAll("[data-see-more]").forEach(b=>b.addEventListener("click",()=>{const box=b.closest(".expandable-text");const c=box.classList.toggle("is-collapsed");b.textContent=c?"See more":"See less";}));
    }).catch(()=>{root.innerHTML="";});
})();