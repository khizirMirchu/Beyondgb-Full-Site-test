(() => {
  "use strict";
  if (document.getElementById("bgTravelAssistant")) return;

  const root = document.createElement("div");
  root.id = "bgTravelAssistant";
  root.innerHTML = `
    <button class="bg-assistant-fab" type="button" aria-label="Open BeyondGB travel assistant">Ask BeyondGB</button>
    <section class="bg-assistant-panel" aria-label="BeyondGB travel assistant" hidden>
      <div class="bg-assistant-head"><div><strong>BeyondGB Guide</strong><span>Quick answers from our website</span></div><button type="button" class="bg-assistant-close" aria-label="Minimize assistant">×</button></div>
      <div class="bg-assistant-messages"><div class="bg-assistant-msg bot">Hi! Ask about destinations, journeys, FAQs, or planning a trip.</div></div>
      <form class="bg-assistant-form"><input autocomplete="off" placeholder="e.g. best season for Skardu"><button type="submit">Ask</button></form>
    </section>`;
  document.body.appendChild(root);

  const fab = root.querySelector(".bg-assistant-fab");
  const panel = root.querySelector(".bg-assistant-panel");
  const close = root.querySelector(".bg-assistant-close");
  const messages = root.querySelector(".bg-assistant-messages");
  const form = root.querySelector(".bg-assistant-form");
  const input = form.querySelector("input");
  let knowledge = null;

  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const add = (text, who="bot") => { const el=document.createElement("div"); el.className=`bg-assistant-msg ${who}`; el.textContent=text; messages.appendChild(el); messages.scrollTop=messages.scrollHeight; };

  async function loadKnowledge(){
    if (knowledge) return knowledge;
    knowledge = { faqs:[], destinations:[], tours:[] };
    const requests = [
      ["/api/faq", "faqs", "faqs"],
      ["/api/destinations", "destinations", "destinations"],
      ["/api/tours", "tours", "tours"]
    ];
    await Promise.all(requests.map(async ([url,key,field])=>{ try { const r=await fetch(url,{cache:"no-store"}); const d=await r.json(); if(r.ok) knowledge[key]=Array.isArray(d[field])?d[field]:[]; } catch(e){} }));
    return knowledge;
  }

  function answer(q,k){
    const n=norm(q);
    if (!n) return "Tell me what you want to know—for example, a destination, journey, best season, or FAQ.";
    if (/^(hi|hello|hey|salam|assalam)/.test(n)) return "Hello! I can help you find destinations, journeys and answers from BeyondGB.";
    if (/(price|cost|budget|expensive)/.test(n)) return "Journey prices depend on the selected trip and arrangements. Open a journey or use Plan Your Trip for a tailored quote.";
    if (/(contact|whatsapp|book|booking|plan|enquir)/.test(n)) return "Use Plan Your Trip or the WhatsApp/contact buttons on the site to send your request to BeyondGB.";
    const pool=[];
    k.destinations.forEach(x=>pool.push({type:"destination",name:x.name||"",text:`${x.name||"Destination"}: ${x.description||""} ${x.highlights||""}`,season:x.best_season||""}));
    k.tours.forEach(x=>pool.push({type:"journey",name:x.title||"",text:`${x.title||"Journey"}: ${x.description||""} ${x.destination||""}`,price:x.price||""}));
    k.faqs.forEach(x=>pool.push({type:"faq",name:x.question||"",text:`${x.question||""} ${x.answer||x.content||""}`}));
    const hit=pool.find(x=>{const hay=norm(`${x.name} ${x.text}`); return n.split(" ").filter(w=>w.length>2).some(w=>hay.includes(w));});
    if(hit){
      if(hit.type==="faq") return `${hit.name}: ${String(hit.text).replace(hit.name,"").trim()}`;
      if(hit.type==="destination") return `${hit.name}${hit.season?` — best season: ${hit.season}.`:"."} ${String(hit.text).replace(`${hit.name}:`,"").trim().slice(0,320)}`;
      return `${hit.name}${hit.price?` — ${hit.price}.`:"."} ${String(hit.text).replace(`${hit.name}:`,"").trim().slice(0,320)}`;
    }
    return "I couldn't find a matching answer in the current BeyondGB content. Try the exact destination or journey name, or use Plan Your Trip for a custom request.";
  }

  const openAssistant = () => {
    panel.hidden = false;
    fab.hidden = true;
    root.classList.add("is-open");
    input.focus();
  };
  const minimizeAssistant = () => {
    panel.hidden = true;
    fab.hidden = false;
    root.classList.remove("is-open");
    fab.focus();
  };
  fab.addEventListener("click", openAssistant);
  close.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    minimizeAssistant();
  });
  form.addEventListener("submit",async e=>{e.preventDefault(); const q=input.value.trim(); if(!q)return; add(q,"user"); input.value=""; add("Checking BeyondGB information…","bot"); const last=messages.lastElementChild; const k=await loadKnowledge(); last.textContent=answer(q,k);});
})();
