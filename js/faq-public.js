(() => {
  const root=document.getElementById("faqList")||document.querySelector(".faq-list"); if(!root)return;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  fetch("/api/faq",{cache:"no-store"}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw Error(d.message||"FAQ unavailable");return d.faqs||[]})
  .then(items=>{if(!items.length){root.innerHTML='<div class="faq-empty">No FAQs published yet.</div>';return}
    root.innerHTML=items.map((x,i)=>`<details class="faq-item" ${i===0?"open":""}><summary>${esc(x.question)}</summary><div class="faq-answer"><p>${esc(x.answer)}</p></div></details>`).join("");
  }).catch(e=>{console.error(e);root.innerHTML='<div class="faq-empty">FAQ is temporarily unavailable.</div>';});
})();