window.BeyondGBImage = (() => {
  const normalize = (value) => {
    const v = String(value || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return v;
  };

  const apply = (img, value, fallback) => {
    const src = normalize(value);
    if (!img) return;
    img.onerror = () => {
      img.onerror = null;
      if (fallback) img.src = fallback;
      else img.style.display = "none";
    };
    if (src) img.src = src;
  };

  return { normalize, apply };
})();