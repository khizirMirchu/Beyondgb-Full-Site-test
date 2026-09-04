(() => {
  const root=document.getElementById("videoGrid"); if(!root)return;
  const mediaPath=v=>{const x=String(v||"").trim();if(!x)return"";if(/^(https?:)?\/\//i.test(x))return x;if(x.startsWith("/"))return x;return `/${x.replace(/^\.\//,"")}`};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  fetch("/api/gallery/videos",{cache:"no-store"}).then(async r=>{
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.success) throw Error(d.message||"Unable to load videos.");
    return d.videos||[];
  }).then(videos=>{
    if(!videos.length){root.innerHTML='<div class="video-empty">No videos have been published yet.</div>';return;}
    root.innerHTML=videos.map(v=>`<article class="video-card">
      <div class="video-frame">${v.video_url?`<video controls preload="metadata" poster="${esc(v.image||"")}"><source src="${esc(mediaPath(v.video_url))}"></video>`:"<div class='video-missing'>Video URL not available</div>"}</div>
      <div class="video-body"><span class="eyebrow">${esc(v.category||"BeyondGB")}</span><h3>${esc(v.title||"Untitled video")}</h3><p>${esc(v.description||"")}</p></div>
    </article>`).join("");
  }).catch(e=>{console.error(e);root.innerHTML='<div class="video-empty">Videos are temporarily unavailable.</div>';});
})();