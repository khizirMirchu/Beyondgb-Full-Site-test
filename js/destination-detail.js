(() => {
  const q=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const img=v=>{const x=String(v||"").trim();if(!x)return"";if(/^(https?:)?\/\//i.test(x)||x.startsWith("/"))return x;return `../${x.replace(/^\.?\//,"")}`};
  const slug=new URLSearchParams(location.search).get("slug"); if(!slug)return;
  fetch(`/api/destinations/${encodeURIComponent(slug)}`,{cache:"no-store"}).then(async r=>{
    const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw Error(d.message||"Destination not found.");return d.destination;
  }).then(d=>{
    document.title=`${d.name} | BeyondGB`;q("destTitle").textContent=d.name;q("destHeading").textContent=d.name;
    const description=String(d.description||"");
    q("destDescription").textContent=description;
    const descMore=q("destDescriptionMore");
    if(description.length>500){ q("destDescriptionWrap").classList.add("is-collapsed"); descMore.hidden=false; }
    const highlights=String(d.highlights||"");
    if(highlights){ q("destHighlightsWrap").hidden=false; q("destHighlights").textContent=highlights; const more=q("destHighlightsMore"); if(highlights.length>350){ q("destHighlightsWrap").querySelector(".expandable-text").classList.add("is-collapsed"); more.hidden=false; } }q("destLocation").textContent=d.location||"Gilgit-Baltistan";q("destSeason").textContent=d.best_season||"Varies";q("destActivities").textContent=d.activities||"Custom";
    const im=img(d.image);if(im)q("destImage").innerHTML=`<img src="${esc(im)}" alt="${esc(d.name)}">`;
    q("destPlan").href=`plan.html?destination=${encodeURIComponent(d.slug||slug)}`;
    const map=q("destMap"); if(map) map.href=`https://www.openstreetmap.org/search?query=${encodeURIComponent(d.name||"Gilgit-Baltistan")}`;
    document.querySelectorAll("[data-see-more]").forEach(button=>button.addEventListener("click",()=>{
      const box=button.closest(".expandable-text");
      const collapsed=box.classList.toggle("is-collapsed");
      button.textContent=collapsed?"See more":"See less";
    }));
  }).catch(e=>{q("destTitle").textContent="Destination not found";const desc=q("destDescription");if(desc)desc.textContent=e.message;});
})();
// Step 55: free live destination weather via Open-Meteo (no API key/subscription).
// Use the actual destination name from the CMS rather than assuming the URL slug
// is a geocodable place name. This also works for custom slugs.
(() => {
  const root = document.getElementById("destinationWeather");
  if (!root) return;
  const content = root.querySelector(".weather-content");
  const slug = new URLSearchParams(location.search).get("slug") || "";
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#039;"}[c]));
  const coords = {
    hunza:[36.3167,74.65], skardu:[35.2971,75.6333], deosai:[34.85,75.55],
    shigar:[35.4236,75.7308], "khunjerab-pass":[36.8497,75.4286], "fairy-meadows":[35.4167,74.5833]
  };
  const getDestination = fetch(`/api/destinations/${encodeURIComponent(slug)}`, {cache:"no-store"})
    .then(r => r.json()).then(d => {
      if (!d.success || !d.destination) throw Error("Destination unavailable");
      return d.destination;
    });
  getDestination.then(d => {
    const direct = coords[slug] || coords[String(d.slug || "").toLowerCase()];
    const place = String(d.name || d.location || "Gilgit-Baltistan").trim();
    const getCoords = direct ? Promise.resolve(direct) :
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`)
        .then(r => r.json()).then(x => x.results?.[0] ? [x.results[0].latitude, x.results[0].longitude] : null);
    return getCoords.then(c => {
      if (!c) throw Error("Location unavailable");
      return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c[0]}&longitude=${c[1]}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`)
        .then(r => r.json());
    });
  }).then(d => {
    const w = d.current;
    if (!w) throw Error("Weather unavailable");
    const labels={0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy rain showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Thunderstorm with hail"};
    content.innerHTML=`<div class="weather-main"><strong>${Math.round(w.temperature_2m)}°C</strong><span>${esc(labels[w.weather_code]||"Current conditions")}</span></div><div class="weather-meta"><span>Feels like ${Math.round(w.apparent_temperature)}°C</span><span>Wind ${Math.round(w.wind_speed_10m)} km/h</span></div><small>Live data · Open-Meteo</small>`;
  }).catch(err => {
    console.warn("Destination weather unavailable:", err);
    content.innerHTML='<span class="weather-unavailable">Live weather is temporarily unavailable.</span>';
  });
})();
