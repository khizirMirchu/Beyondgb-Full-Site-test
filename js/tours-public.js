(() => {
  "use strict";
  const root = document.getElementById("tourGrid") || document.getElementById("publicToursGrid") || document.querySelector("[data-tour-grid]");
  if (!root) return;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  const imageUrl = value => { const x=String(value||"").trim(); if(!x)return""; if(/^(https?:)?\/\//i.test(x)||x.startsWith("/")||x.startsWith("data:"))return x; return x.startsWith("../")?x:"../"+x; };
  const search=document.getElementById("tourSearch"), difficulty=document.getElementById("tourDifficultyFilter"), clear=document.getElementById("clearTourFilters"), count=document.getElementById("tourResultsCount");
  let allTours=[];
  const savedKey="beyondgb.savedJourneys";
  const readSaved=()=>{try{return JSON.parse(localStorage.getItem(savedKey)||"[]").map(Number).filter(Number.isFinite);}catch{return[];}};
  const writeSaved=ids=>{try{localStorage.setItem(savedKey,JSON.stringify([...new Set(ids)]));}catch{}};
  const savedCount=document.getElementById("savedTourCount"), savedButton=document.getElementById("showSavedTours");
  const planSaved=document.getElementById("planSavedTours"), shareSaved=document.getElementById("shareSavedTours");
  let showingSaved=false;
  const getSavedTours=()=>{
    const ids=new Set(readSaved());
    return allTours.filter(t=>ids.has(Number(t.id)));
  };
  const shortlistUrl=()=>{
    const tours=getSavedTours();
    const slugs=tours.map(t=>t.slug).filter(Boolean);
    const url=new URL(location.href);
    url.search="";
    if(slugs.length) url.searchParams.set("shortlist",slugs.join(","));
    return url.href;
  };
  const notifyButton=(button,text,restore)=>{if(!button)return;const old=button.textContent;button.textContent=text;setTimeout(()=>button.textContent=restore||old,1800);};
  const updateSavedUI=()=>{const ids=readSaved();if(savedCount)savedCount.textContent=ids.length;if(savedButton){savedButton.setAttribute("aria-pressed",String(showingSaved));savedButton.textContent=`${showingSaved?"Show all journeys":"Saved journeys"} ${ids.length}`;}};
  const render=()=>{
    const q=String(search?.value||"").trim().toLowerCase(), d=String(difficulty?.value||"").trim().toLowerCase(), saved=new Set(readSaved());
    const filtered=allTours.filter(t=>{
      const hay=[t.title,t.location,t.destination,t.description,t.duration,t.difficulty].join(" ").toLowerCase();
      return (!q||hay.includes(q)) && (!d||String(t.difficulty||"").toLowerCase()===d) && (!showingSaved||saved.has(Number(t.id)));
    });
    if(count) count.textContent=`Showing ${filtered.length} of ${allTours.length} ${allTours.length===1?"journey":"journeys"}.`;
    if(!filtered.length){ root.innerHTML='<div class="tour-empty" style="grid-column:1/-1">No journeys match your search.</div>'; return; }
    root.innerHTML=filtered.map(tour=>`
      <article class="tour-card public-tour-card" data-tour-id="${esc(tour.id)}">
        <label class="tour-compare-check"><input type="checkbox" data-compare-tour="${esc(tour.id)}" aria-label="Compare ${esc(tour.title)}"><span>Compare</span></label>
        <button type="button" class="tour-save-btn ${saved.has(Number(tour.id))?"is-saved":""}" data-save-tour="${esc(tour.id)}" aria-pressed="${saved.has(Number(tour.id))}" aria-label="${saved.has(Number(tour.id))?"Remove":"Save"} ${esc(tour.title)}">${saved.has(Number(tour.id))?"Saved":"Save journey"}</button>
        ${imageUrl(tour.image)?`<img src="${esc(imageUrl(tour.image))}" alt="${esc(tour.title)}" loading="lazy">`:""}
        <div class="tour-card-body"><span class="eyebrow">${esc(tour.location||tour.destination||"Gilgit-Baltistan")}</span>
        <h3>${esc(tour.title)}</h3>
        <div class="expandable-text ${String(tour.description||"").length>140?"is-collapsed":""}"><p class="card-description-preview expandable-text-body">${esc(tour.description||"")}</p>${String(tour.description||"").length>140?`<button type="button" class="see-more-btn" data-see-more>See more</button>`:""}</div>
        <div class="tour-meta"><span>${esc(tour.duration||"Custom duration")}</span>${tour.price?`<strong>${esc(tour.price)}</strong>`:""}</div>
        ${tour.next_available_date?`<div class="tour-availability-chip status-${esc(tour.next_available_status||"available")}">Next date: <strong>${esc(tour.next_available_date)}</strong>${tour.next_available_seats!==null&&tour.next_available_status!=="full"?` · ${esc(tour.next_available_seats)} seats`:""}</div>`:""}
        <a class="btn btn-primary" href="tour.html?slug=${encodeURIComponent(tour.slug||"")}">Explore journey</a></div>
      </article>`).join("");
    root.querySelectorAll("[data-see-more]").forEach(button=>button.addEventListener("click",()=>{const box=button.closest(".expandable-text");const collapsed=box.classList.toggle("is-collapsed");button.textContent=collapsed?"See more":"See less";}));
    root.querySelectorAll("[data-save-tour]").forEach(button=>button.addEventListener("click",()=>{const id=Number(button.dataset.saveTour);const ids=readSaved();const next=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];writeSaved(next);render();}));
    updateCompareUI(); updateSavedUI();
  };
  const compareToolbar=document.getElementById("tourCompareToolbar");
  const compareCount=document.getElementById("tourCompareCount");
  const compareOpen=document.getElementById("openTourCompare");
  const compareClear=document.getElementById("clearTourCompare");
  const compareModal=document.getElementById("tourCompareModal");
  const compareTable=document.getElementById("tourCompareTable");
  const compareClose=document.getElementById("closeTourCompare");
  let compareIds=[];
  const updateCompareUI=()=>{
    if(compareToolbar) compareToolbar.hidden=compareIds.length===0;
    if(compareCount) compareCount.textContent=`${compareIds.length} of 3 selected`;
    if(compareOpen) compareOpen.disabled=compareIds.length<2;
    root.querySelectorAll("[data-compare-tour]").forEach(cb=>cb.checked=compareIds.includes(Number(cb.dataset.compareTour)));
  };
  const closeCompare=()=>{if(compareModal){compareModal.hidden=true;compareModal.setAttribute("aria-hidden","true");document.body.classList.remove("compare-modal-open");}};
  const openCompare=()=>{
    const selected=allTours.filter(t=>compareIds.includes(Number(t.id))).slice(0,3);
    if(selected.length<2||!compareModal||!compareTable)return;
    const rows=[
      ["Destination",t=>t.location||t.destination||"—"],
      ["Duration",t=>t.duration||"Custom"],
      ["Difficulty",t=>t.difficulty||"—"],
      ["Price",t=>t.price||"Contact us"],
      ["Description",t=>t.description||"—"]
    ];
    compareTable.innerHTML=`<table><thead><tr><th>Details</th>${selected.map(t=>`<th>${esc(t.title)}</th>`).join("")}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><th>${label}</th>${selected.map(t=>`<td>${esc(fn(t))}</td>`).join("")}</tr>`).join("")}<tr><th>Journey</th>${selected.map(t=>`<td><a class="btn btn-primary" href="tour.html?slug=${encodeURIComponent(t.slug||"")}">Explore</a></td>`).join("")}</tr></tbody></table>`;
    compareModal.hidden=false;compareModal.setAttribute("aria-hidden","false");document.body.classList.add("compare-modal-open");
  };
  root.addEventListener("change",event=>{
    const cb=event.target.closest("[data-compare-tour]"); if(!cb)return;
    const id=Number(cb.dataset.compareTour);
    if(cb.checked){ if(compareIds.length>=3){cb.checked=false;return;} if(!compareIds.includes(id))compareIds.push(id); }
    else compareIds=compareIds.filter(x=>x!==id);
    updateCompareUI();
  });
  compareOpen?.addEventListener("click",openCompare);
  compareClose?.addEventListener("click",closeCompare);
  compareModal?.addEventListener("click",event=>{if(event.target.matches("[data-close-compare]"))closeCompare();});
  compareClear?.addEventListener("click",()=>{compareIds=[];updateCompareUI();});
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeCompare();});

  fetch("/api/tours",{cache:"no-store"}).then(async r=>{const data=await r.json().catch(()=>({}));if(!r.ok||!data.success)throw Error(data.message||"Unable to load journeys.");return data.tours||[];})
    .then(tours=>{
      allTours=tours;
      const params=new URLSearchParams(location.search);
      const shared=(params.get("shortlist")||"").split(",").map(s=>s.trim()).filter(Boolean);
      if(shared.length){
        const ids=allTours.filter(t=>shared.includes(String(t.slug||""))).map(t=>Number(t.id)).filter(Number.isFinite);
        if(ids.length) writeSaved(ids);
        showingSaved=true;
      }
      render();
    })
    .catch(error=>{console.error("Journeys:",error);root.innerHTML='<div class="tour-empty">Journeys are temporarily unavailable.</div>';});
  [search,difficulty].forEach(el=>el&&el.addEventListener("input",render)); difficulty&&difficulty.addEventListener("change",render);
  clear&&clear.addEventListener("click",()=>{if(search)search.value="";if(difficulty)difficulty.value="";showingSaved=false;render();search?.focus();});
  savedButton?.addEventListener("click",()=>{showingSaved=!showingSaved;render();});
  planSaved?.addEventListener("click",()=>{
    const tours=getSavedTours();
    if(!tours.length){ notifyButton(planSaved,"Save a journey first","Plan saved journeys"); return; }
    const names=tours.map(t=>t.title).join(", ");
    const url=new URL("plan.html",location.href);
    url.searchParams.set("tourlist",tours.map(t=>t.slug).filter(Boolean).join(","));
    location.href=url.href;
  });
  shareSaved?.addEventListener("click",async()=>{
    const tours=getSavedTours();
    if(!tours.length){ notifyButton(shareSaved,"Save a journey first","Share shortlist"); return; }
    const url=shortlistUrl();
    try{
      if(navigator.share) await navigator.share({title:"My BeyondGB journey shortlist",text:"Here are the BeyondGB journeys I shortlisted.",url});
      else if(navigator.clipboard){ await navigator.clipboard.writeText(url); notifyButton(shareSaved,"Link copied","Share shortlist"); }
    }catch(error){ if(error?.name!=="AbortError") console.warn("Shortlist share unavailable",error); }
  });
})();