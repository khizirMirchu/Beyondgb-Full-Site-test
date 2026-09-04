(() => {
  const root=document.getElementById("journalGrid")||document.querySelector(".journal-grid"); if(!root)return;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const media=v=>{const x=String(v||"").trim();if(!x)return"";if(/^(https?:)?\/\//i.test(x)||x.startsWith("/"))return x;return `../${x.replace(/^\.?\//,"")}`};
  fetch("/api/journal",{cache:"no-store"}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw Error(d.message||"Journal unavailable");return d.posts||[]})
  .then(posts=>{if(!posts.length){root.innerHTML='<div class="journal-empty">No journal articles published yet.</div>';return}
    root.innerHTML=posts.map(p=>`<article class="journal-card">${media(p.image)?`<img src="${esc(media(p.image))}" alt="${esc(p.title)}" loading="lazy">`:""}<div class="journal-card-body"><span class="eyebrow">${esc(p.category||"Journal")}</span><h3>${esc(p.title)}</h3><p class="journal-excerpt">${esc(p.excerpt||p.content||"")}</p><div class="journal-full-content" hidden>${esc(p.content||p.excerpt||"")}</div><button class="text-link journal-read-more" type="button">Read story →</button></div></article>`).join("");
  })
  .then(()=>{
    root.querySelectorAll(".journal-read-more").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const card=btn.closest(".journal-card");
        const full=card?.querySelector(".journal-full-content");
        if(!full)return;
        const open=!full.hidden;
        full.hidden=open;
        btn.textContent=open?"Read story →":"Show less ↑";
      });
    });
  })
  .catch(e=>{console.error(e);root.innerHTML='<div class="journal-empty">Journal is temporarily unavailable.</div>';});
})();