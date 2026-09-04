(() => {
  "use strict";
  const root = document.getElementById("tripCostCalculator");
  if (!root) return;
  const $ = id => document.getElementById(id);
  const money = value => `PKR ${Math.round(Number(value) || 0).toLocaleString("en-PK")}`;
  const numberFromText = value => { const m = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : 0; };
  const params = new URLSearchParams(location.search);
  const initialTourSlug = params.get("slug");
  let tours = [], destinations = [], rates = {}, selected = null;

  function nights() { const days = Math.max(1, Number($("calcDays")?.value) || 1); return Math.max(0, days - 1); }
  function selectedBase() {
    const fallback = Number(selected?.price_amount) || numberFromText(selected?.price) || 0;
    if (selected?.kind !== "tour") return fallback;
    try {
      const list = JSON.parse(rates.calculator_tour_pricing || "[]");
      const custom = list.find(row => Number(row.tour_id) === Number(selected.id));
      return custom && Number(custom.price) > 0 ? Number(custom.price) : fallback;
    } catch (_) { return fallback; }
  }
  function activeRates() {
    if (selected?.kind !== "tour") return rates;
    try {
      const list = JSON.parse(rates.calculator_tour_pricing || "[]");
      const custom = list.find(row => Number(row.tour_id) === Number(selected.id));
      if (!custom) return rates;
      return { ...rates,
        calculator_standard_accommodation: Number(custom.standard_accommodation) || 0,
        calculator_comfort_accommodation: Number(custom.comfort_accommodation) || 0,
        calculator_premium_accommodation: Number(custom.premium_accommodation) || 0,
        calculator_shared_transport: Number(custom.shared_transport) || 0,
        calculator_private_transport: Number(custom.private_transport) || 0,
        calculator_luxury_transport: Number(custom.luxury_transport) || 0,
        calculator_activity: Number(custom.activity) || 0
      };
    } catch (_) { return rates; }
  }
  function calculate() {
    if (!selected) return;
    const travelers = Math.max(1, Number($("calcTravelers")?.value) || 1);
    const days = Math.max(1, Number($("calcDays")?.value) || 1);
    const base = selectedBase();
    const accommodation = Number($("calcAccommodation")?.value || 0);
    const transport = Number($("calcTransport")?.value || 0);
    const activity = Number($("calcActivity")?.checked ? activeRates().calculator_activity : 0);
    const baseTotal = base * travelers;
    const accommodationTotal = accommodation * nights() * travelers;
    const transportTotal = transport * days;
    const activityTotal = activity * travelers;
    const total = baseTotal + accommodationTotal + transportTotal + activityTotal;
    $("calcBase").textContent = money(baseTotal);
    $("calcAccommodationTotal").textContent = money(accommodationTotal);
    $("calcTransportTotal").textContent = money(transportTotal);
    $("calcActivityTotal").textContent = money(activityTotal);
    $("calcTotal").textContent = money(total);
    $("calcNote").textContent = base > 0
      ? `Estimate for ${travelers} traveler${travelers === 1 ? "" : "s"}, ${days} day${days === 1 ? "" : "s"}. Final pricing is confirmed privately by BeyondGB.`
      : `No starting price is configured for ${selected.title || selected.name}. Ask BeyondGB for a personalized quote.`;
    const plan = $("calcPlan");
    if (plan) {
      const key = selected.kind === "tour" ? `tour=${encodeURIComponent(selected.slug)}` : `destination=${encodeURIComponent(selected.slug)}`;
      plan.href = `plan.html?${key}&travelers=${travelers}&days=${days}`;
    }
  }
  function buildCategoryOptions() {
    const select = $("calcCategory"); if (!select) return;
    const current = selected ? `${selected.kind}:${selected.id}` : (initialTourSlug ? `tour:${tours.find(t => t.slug === initialTourSlug)?.id || ""}` : "");
    select.innerHTML = `<option value="">Choose a destination or journey</option>` +
      `<optgroup label="Destinations / Places">${destinations.map(d => `<option value="destination:${d.id}">${d.name}${Number(d.price_amount) ? ` — ${money(d.price_amount)} starting` : ""}</option>`).join("")}</optgroup>` +
      `<optgroup label="Tours / Journeys">${tours.map(t => `<option value="tour:${t.id}">${t.title}${Number(t.price_amount) || numberFromText(t.price) ? ` — ${money(Number(t.price_amount) || numberFromText(t.price))} starting` : ""}</option>`).join("")}</optgroup>`;
    if (current) select.value = current;
  }
  function findSelected(value) {
    const [kind, id] = String(value || "").split(":");
    const list = kind === "tour" ? tours : destinations;
    const item = list.find(x => Number(x.id) === Number(id));
    return item ? { ...item, kind, title: item.title || item.name } : null;
  }
  function fillRates() {
    const values = activeRates();
    $("calcAccommodation").innerHTML = [
      ["Standard — Included", 0], ["Standard accommodation", values.calculator_standard_accommodation],
      ["Comfort accommodation", values.calculator_comfort_accommodation], ["Premium accommodation", values.calculator_premium_accommodation]
    ].map(([label, value], i) => `<option value="${Number(value) || 0}">${label}${i ? ` — ${money(value)}/night` : ""}</option>`).join("");
    $("calcTransport").innerHTML = [["Shared transport", values.calculator_shared_transport], ["Private transport", values.calculator_private_transport], ["Luxury transport", values.calculator_luxury_transport]]
      .map(([label, value]) => `<option value="${Number(value) || 0}">${label} — ${money(value)}/day</option>`).join("");
    const activityLabel = root.querySelector("[data-activity-rate]");
    if (activityLabel) activityLabel.textContent = `${money(values.calculator_activity)} / person`;
  }
  function choose(item) {
    selected = item;
    $("calcCategory").value = `${item.kind}:${item.id}`;
    const duration = numberFromText(item.duration);
    if (duration) $("calcDays").value = Math.min(60, Math.max(1, duration));
    fillRates();
    calculate();
  }
  $("calcCategory")?.addEventListener("change", e => { const item = findSelected(e.target.value); if (item) choose(item); });
  ["calcTravelers", "calcDays", "calcAccommodation", "calcTransport", "calcActivity"].forEach(id => { $(id)?.addEventListener("input", calculate); $(id)?.addEventListener("change", calculate); });

  Promise.all([
    fetch("/api/tours", { cache: "no-store" }).then(r => r.json()),
    fetch("/api/destinations", { cache: "no-store" }).then(r => r.json()),
    fetch("/api/pricing-config", { cache: "no-store" }).then(r => r.json())
  ]).then(([tourData, destinationData, configData]) => {
    tours = tourData.success ? (tourData.tours || []) : [];
    destinations = destinationData.success ? (destinationData.destinations || []) : [];
    rates = configData.success ? (configData.settings || {}) : {};
    buildCategoryOptions();
    fillRates();
    let initial = initialTourSlug ? tours.find(t => t.slug === initialTourSlug) : null;
    if (!initial && params.get("destination")) initial = destinations.find(d => d.slug === params.get("destination"));
    if (initial) choose({ ...initial, kind: initial.title ? "tour" : "destination", title: initial.title || initial.name });
    else {
      const first = tours[0] || destinations[0];
      if (first) choose({ ...first, kind: first.title ? "tour" : "destination", title: first.title || first.name });
    }
  }).catch(() => { root.innerHTML = '<p class="muted">The cost calculator is temporarily unavailable. Contact BeyondGB for a quote.</p>'; });
})();
