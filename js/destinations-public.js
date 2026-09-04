(() => {
  "use strict";
  const root=document.getElementById("destinationGrid")||document.getElementById("publicDestinationsGrid")||document.querySelector("[data-destination-grid]");
  if(!root)return;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const img=v=>{const x=String(v||"").trim();if(!x)return"";if(/^(https?:)?\/\//i.test(x)||x.startsWith("/"))return x;return `../${x.replace(/^\.?\//,"")}`};
  const search=document.getElementById("destinationSearch"), clear=document.getElementById("clearDestinationSearch"), count=document.getElementById("destinationResultsCount"); let all=[];
  const render=()=>{
    const q=String(search?.value||"").trim().toLowerCase();
    const items=all.filter(d=>!q||[d.name,d.location,d.region,d.description,d.highlights,d.best_season].join(" ").toLowerCase().includes(q));
    if(count)count.textContent=`Showing ${items.length} of ${all.length} ${all.length===1?"destination":"destinations"}.`;
    if(!items.length){root.innerHTML='<div class="destination-empty" style="grid-column:1/-1">No destinations match your search.</div>';return;}
    root.innerHTML=items.map(d=>`<article class="destination-card">${img(d.image)?`<img src="${esc(img(d.image))}" alt="${esc(d.name)}" loading="lazy">`:""}<div class="destination-card-body"><span class="eyebrow">${esc(d.location||d.region||"Gilgit-Baltistan")}</span><h3>${esc(d.name)}</h3><div class="expandable-text ${String(d.description||"").length>140?"is-collapsed":""}"><p class="card-description-preview expandable-text-body">${esc(d.description||"")}</p>${String(d.description||"").length>140?`<button type="button" class="see-more-btn" data-see-more>See more</button>`:""}</div>${d.best_season?`<small>Best season: ${esc(d.best_season)}</small>`:""}<a class="btn btn-primary" href="destination.html?slug=${encodeURIComponent(d.slug||"")}">Explore destination</a></div></article>`).join("");
    root.querySelectorAll("[data-see-more]").forEach(button=>button.addEventListener("click",()=>{const box=button.closest(".expandable-text");const collapsed=box.classList.toggle("is-collapsed");button.textContent=collapsed?"See more":"See less";}));
  };
  fetch("/api/destinations",{cache:"no-store"}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw Error(d.message||"Unable to load destinations.");return d.destinations||[];}).then(items=>{all=items;render();}).catch(e=>{console.error(e);root.innerHTML='<div class="destination-empty">Destinations are temporarily unavailable.</div>';});
  search?.addEventListener("input",render); clear?.addEventListener("click",()=>{if(search)search.value="";render();search?.focus();});
})();