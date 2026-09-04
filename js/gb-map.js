(() => {
  "use strict";
  const root = document.getElementById("gbInteractiveMap");
  if (!root || typeof L === "undefined") return;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const normalize = value => String(value || "").toLowerCase().replace(/[–—]/g, "-").trim();
  const known = {
    islamabad:[33.6844,73.0479], gilgit:[35.9208,74.3144], hunza:[36.3167,74.65], karimabad:[36.3167,74.65], aliabad:[36.307,74.619], attabad:[36.3236,74.8561], khunjerab:[36.8497,75.4286], "khunjerab pass":[36.8497,75.4286], passu:[36.4786,74.8869], gulmit:[36.4142,74.8717], naltar:[36.1594,74.1927], skardu:[35.2971,75.6333], shigar:[35.4236,75.7308], khaplu:[35.163,76.336], deosai:[34.85,75.55], "fairy meadows":[35.4167,74.5833], astore:[35.3667,74.8667], minimarg:[35.85,74.9], "rama lake":[35.4,74.7], "satpara lake":[35.2,75.62], basho:[35.32,75.83], "astore valley":[35.3667,74.8667], chilas:[35.42,74.1], raikot:[35.45,74.5]
  };
  const params = new URLSearchParams(location.search), slug = params.get("slug") || "", type = root.dataset.type || "tour";
  let map, markers = [], routeLayer, searchMarker;
  function coordsFromKnown(text) { const n=normalize(text); return Object.entries(known).filter(([name])=>n.includes(name)).map(([name,coords])=>({name,coords})); }
  function formatDistance(m){ return m>=1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`; }
  function formatDuration(sec){ const h=Math.floor(sec/3600), min=Math.round((sec%3600)/60); return h ? `${h} hr ${min} min` : `${min} min`; }
  function addControls() {
    const box=L.DomUtil.create("div","gb-map-toolbar");
    box.innerHTML='<div class="gb-map-search"><input id="gbMapSearch" type="search" placeholder="Search places…" aria-label="Search places"><button id="gbMapSearchBtn" type="button">Search</button></div><div class="gb-map-tools"><button type="button" data-map-tool="fit">Route</button><button type="button" data-map-tool="locate">My location</button><button type="button" data-map-tool="fullscreen">Fullscreen</button></div><div id="gbMapResults" class="gb-map-results" hidden></div>';
    root.parentElement.insertBefore(box, root);
    $("gbMapSearchBtn").addEventListener("click", searchPlaces); $("gbMapSearch").addEventListener("keydown",e=>{if(e.key==="Enter")searchPlaces();});
    box.querySelector('[data-map-tool="fit"]').addEventListener("click",()=>fitRoute());
    box.querySelector('[data-map-tool="locate"]').addEventListener("click",()=>map.locate({setView:true,maxZoom:13,enableHighAccuracy:true}));
    box.querySelector('[data-map-tool="fullscreen"]').addEventListener("click",()=>root.requestFullscreen?.());
  }
  function $(id){return document.getElementById(id);}
  function makeMap(points) {
    map=L.map(root,{zoomControl:false,scrollWheelZoom:true,preferCanvas:true});
    L.control.zoom({position:"bottomright"}).addTo(map);
    L.control.scale({imperial:false}).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    addControls();
    points.forEach((p,i)=>addMarker(p,i));
    if(points.length>1) drawRoute(points); else if(points.length) map.setView(points[0].coords,12); else map.setView([35.8,74.5],7);
    map.on("locationerror",()=>alert("Your location could not be accessed. Please allow location access in the browser."));
    root.dataset.ready="true";
  }
  function addMarker(p,i){ const m=L.marker(p.coords).addTo(map).bindPopup(`<strong>${esc(p.label||p.name)}</strong>${p.day?`<br>Day ${esc(p.day)}`:""}`); markers.push(m); if(i===0)m.openPopup(); }
  async function drawRoute(points){
    try{
      const coords=points.map(p=>`${p.coords[1]},${p.coords[0]}`).join(";");
      const r=await fetch(`/api/map/route?coords=${encodeURIComponent(coords)}`,{cache:"no-store"}).then(x=>x.json());
      if(!r.success||!r.route?.geometry) return fitRoute();
      routeLayer?.remove(); routeLayer=L.geoJSON(r.route.geometry,{style:{weight:5,opacity:.82}}).addTo(map);
      const summary=L.DomUtil.create("div","gb-map-summary"); summary.innerHTML=`<strong>Road route</strong><span>${formatDistance(r.route.distance)} · ${formatDuration(r.route.duration)}</span>`; root.parentElement.appendChild(summary);
      fitRoute();
    }catch(e){fitRoute();}
  }
  function fitRoute(){ const layers=[...markers]; if(routeLayer)layers.push(routeLayer); if(!layers.length)return; const group=L.featureGroup(layers); map.fitBounds(group.getBounds(),{padding:[40,40],maxZoom:12}); }
  async function searchPlaces(){
    const q=$("gbMapSearch").value.trim(), results=$("gbMapResults"); if(!q)return;
    results.hidden=false; results.innerHTML='<div>Searching…</div>';
    try{ const data=await fetch(`/api/map/geocode?q=${encodeURIComponent(q)}`).then(r=>r.json());
      results.innerHTML=(data.results||[]).map((x,i)=>`<button type="button" data-result="${i}"><strong>${esc(x.name.split(",")[0])}</strong><small>${esc(x.name)}</small></button>`).join("")||'<div>No places found.</div>';
      (data.results||[]).forEach((x,i)=>results.querySelector(`[data-result="${i}"]`)?.addEventListener("click",()=>{ const ll=[x.lat,x.lon]; searchMarker?.remove(); searchMarker=L.marker(ll).addTo(map).bindPopup(`<strong>${esc(x.name.split(",")[0])}</strong><br>${esc(x.name)}`).openPopup(); map.setView(ll,15); results.hidden=true; }));
    }catch(e){results.innerHTML='<div>Search is temporarily unavailable.</div>';}
  }
  const source= type==="destination"
    ? fetch(`/api/destinations/${encodeURIComponent(slug)}`,{cache:"no-store"}).then(r=>r.json()).then(d=>{if(!d.success)throw Error(); const found=coordsFromKnown(`${d.destination.name} ${d.destination.location||""}`)[0]; return found?[{...found,label:d.destination.name}]:[];})
    : Promise.all([fetch(`/api/tours/${encodeURIComponent(slug)}`,{cache:"no-store"}).then(r=>r.json()),fetch(`/api/tours/${encodeURIComponent(slug)}/itinerary`,{cache:"no-store"}).then(r=>r.json()).catch(()=>({itinerary:[]}))]).then(([td,id])=>{if(!td.success)throw Error(); const points=[];(id.itinerary||[]).forEach(day=>coordsFromKnown(`${day.title} ${day.details||""}`).forEach(x=>{if(!points.some(p=>p.coords[0]===x.coords[0]&&p.coords[1]===x.coords[1]))points.push({...x,day:day.day,label:x.name});})); if(!points.length){const f=coordsFromKnown(`${td.tour.destination||""} ${td.tour.title||""}`)[0];if(f)points.push({...f,label:td.tour.destination||f.name});}return points;});
  source.then(points=>{makeMap(points);}).catch(()=>{root.innerHTML='<div class="map-unavailable">Map locations are temporarily unavailable.</div>';});
})();
