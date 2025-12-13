// main.js (final) - compatible with sheet name "harga"
(function () {
  // =====================
  //  KONFIGURASI PRICELIST (APPS SCRIPT)
  //  Ubah WEB_APP_URL kalau deploy Apps Script-mu beda
  // =====================
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxrlKIwLq4chQc7oUtzUdMZWTl-11ce_xoIq7nGiZBL1uyCBG9SLUOp9qICUTzPj-ho/exec";
  const PRICE_DB_URL = normalizeUrl(WEB_APP_URL) + (WEB_APP_URL.includes("?") ? "&" : "?") + "action=pricelist";

  // =====================
  //  FIELDS (sesuai header di sheet 'harga' — biasanya Name & Price)
  // =====================
  const NAME_KEY = "Name";
  const PRICE_KEY = "Price";

  let PRODUCT_LIST = [];

  const FALLBACK_PRODUCTS = [
    { [NAME_KEY]: "Contoh Item A", [PRICE_KEY]: 25000 },
    { [NAME_KEY]: "Contoh Item B", [PRICE_KEY]: 45000 },
  ];

  // =====================
  //  HELPERS
  // =====================
  function normalizeUrl(u) {
    if (!u) return u;
    let s = String(u).trim();
    if (/^https?:\/\//i.test(s)) return s;
    return "https://" + s;
  }

  function parseNumber(x) {
    if (x === undefined || x === null || x === "") return 0;
    return Number(String(x).replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "")) || 0;
  }
  function formatNumber(n) {
    return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
  }

  // JSONP loader for fallback
  function loadJsonp(url, callbackParam = "callback", timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      try {
        const normalized = normalizeUrl(url);
        const cbName = "__pricelistCallback_" + Math.random().toString(36).slice(2);
        window[cbName] = function (data) {
          resolve(data);
          try { delete window[cbName]; } catch (e) {}
          const s = document.getElementById(cbName); if (s) s.remove();
        };
        const script = document.createElement("script");
        script.id = cbName;
        const delim = normalized.includes("?") ? "&" : "?";
        script.src = normalized + delim + encodeURIComponent(callbackParam) + "=" + cbName;
        script.onerror = function () {
          try { delete window[cbName]; } catch (e) {}
          if (script) script.remove();
          reject(new Error("JSONP script load error"));
        };
        document.head.appendChild(script);
        setTimeout(() => {
          if (window[cbName]) {
            try { delete window[cbName]; } catch (e) {}
            script.remove();
            reject(new Error("JSONP timeout"));
          }
        }, timeoutMs);
      } catch (err) { reject(err); }
    });
  }

  // =====================
  //  loadProductList: try fetch -> JSONP -> fallback local
  // =====================
  async function loadProductList() {
    console.log("Mencoba fetch PRICE_DB_URL:", PRICE_DB_URL);
    try {
      const res = await fetch(PRICE_DB_URL, { cache: "no-store" });
      console.log("fetch status:", res.status, res.statusText, "ok:", res.ok);
      const text = await res.text();
      console.log("Raw response (fetch):", text.slice(0, 2000));
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("not_json"); }

      // server should return object with key "harga" (array)
      PRODUCT_LIST = Array.isArray(data.harga) ? data.harga : (Array.isArray(data) ? data : []);
      if (!PRODUCT_LIST.length) {
        console.warn("Pricelist kosong atau format tidak sesuai (fetch):", data);
        PRODUCT_LIST = FALLBACK_PRODUCTS.slice();
        alert("Data harga kosong atau format tidak sesuai. Menggunakan produk fallback.");
      } else {
        console.log("Loaded", PRODUCT_LIST.length, "produk (fetch).");
      }
      refreshAllProductSuggestions();
      return;
    } catch (err) {
      console.warn("fetch failed or parse failed, try JSONP fallback:", err);
      try {
        const jsonpData = await loadJsonp(PRICE_DB_URL);
        console.log("Raw response (JSONP):", jsonpData);
        const rows = Array.isArray(jsonpData.harga) ? jsonpData.harga : (Array.isArray(jsonpData) ? jsonpData : []);
        if (!rows.length) {
          console.warn("JSONP returned no rows", jsonpData);
          PRODUCT_LIST = FALLBACK_PRODUCTS.slice();
          alert("Pricelist JSONP kosong. Menggunakan fallback.");
        } else {
          PRODUCT_LIST = rows;
          console.log("Loaded", PRODUCT_LIST.length, "produk (JSONP).");
        }
        refreshAllProductSuggestions();
        return;
      } catch (e2) {
        console.error("JSONP fallback failed:", e2);
        PRODUCT_LIST = FALLBACK_PRODUCTS.slice();
        alert("Gagal memuat harga dari server (CORS atau format). Menggunakan fallback produk.");
        refreshAllProductSuggestions();
        return;
      }
    }
  }

  // =====================
  //  Autocomplete / UI helpers
  // =====================
  function getProductName(p) { return (p && p[NAME_KEY]) || ""; }
  function getProductPrice(p) { return parseNumber((p && p[PRICE_KEY]) || 0); }

  function makeSuggestions(filter) {
    const q = String(filter || "").toLowerCase();
    return PRODUCT_LIST
      .map(p => ({ name: getProductName(p), price: getProductPrice(p) }))
      .filter(p => p.name.toLowerCase().includes(q));
  }

  function attachSuggestEvents(row) {
    const input = row.querySelector(".productInput");
    if (!input) return;
    const box = row.querySelector(".product-suggest");

    function show(list) {
      if (!box) return;
      if (!list.length) { box.style.display = "none"; return; }
      box.innerHTML = list
        .map(it => `<div class="item" data-name="${escapeHtml(it.name)}" data-price="${it.price}">${escapeHtml(it.name)}</div>`)
        .join("");
      box.style.display = "block";
      box.querySelectorAll(".item").forEach((el) => {
        el.addEventListener("click", () => {
          row.querySelector(".productInput").value = el.dataset.name;
          row.querySelector(".price").value = formatNumber(el.dataset.price);
          box.style.display = "none";
          updateTotals();
        });
      });
    }

    input.addEventListener("input", () => {
      const v = input.value.trim();
      if (!v) return (box.style.display = "none");
      show(makeSuggestions(v));
    });
    input.addEventListener("focus", () => show(makeSuggestions(input.value || "")));
    document.addEventListener("click", (e) => { if (!row.contains(e.target)) box && (box.style.display = "none"); });
  }

  function refreshAllProductSuggestions() {
    document.querySelectorAll(".item-row").forEach((row) => {
      const inputEl = row.querySelector(".productInput");
      const priceEl = row.querySelector(".price");
      if (inputEl && priceEl) {
        const exact = PRODUCT_LIST.find(p => (getProductName(p) || "").toLowerCase() === (inputEl.value || "").toLowerCase());
        if (exact) priceEl.value = formatNumber(getProductPrice(exact));
      }
      attachSuggestEvents(row);
    });
  }

  // =====================
  //  Add / totals / events
  // =====================
  window.addItemRow = function (name = "", qty = 1, price = 0) {
    const list = document.getElementById("itemList");
    if (!list) { console.warn("#itemList not found"); return; }
    const div = document.createElement("div");
    div.className = "item-row";
    div.innerHTML = `
      <div style="position:relative">
        <input class="productInput" type="text" placeholder="Nama produk..." value="${escapeHtml(name)}">
        <div class="product-suggest"></div>
      </div>
      <input class="qty" type="number" min="1" value="${qty}">
      <input class="price" type="text" value="${price ? formatNumber(price) : ""}">
      <div>Rp <span class="amount">0</span></div>
      <button type="button" class="removeItemBtn">X</button>
    `;
    list.appendChild(div);
    div.querySelector(".qty").addEventListener("input", updateTotals);
    div.querySelector(".price").addEventListener("input", updateTotals);
    div.querySelector(".removeItemBtn").addEventListener("click", () => { div.remove(); updateTotals(); });
    attachSuggestEvents(div);
    updateTotals();
  };

  window.updateTotals = function () {
    let subtotal = 0;
    document.querySelectorAll(".item-row").forEach((row) => {
      const qty = parseNumber(row.querySelector(".qty").value);
      const price = parseNumber(row.querySelector(".price").value);
      const amount = qty * price;
      const amountEl = row.querySelector(".amount");
      if (amountEl) amountEl.textContent = formatNumber(amount);
      subtotal += amount;
    });
    const subtotalEl = document.getElementById("subtotal");
    if (subtotalEl) subtotalEl.textContent = formatNumber(subtotal);
    const delivery = parseNumber(document.getElementById("delivery").value);
    const totalEl = document.getElementById("total");
    if (totalEl) totalEl.textContent = formatNumber(subtotal + delivery);
  };

  // attach events on load
  window.addEventListener("load", () => {
    document.querySelectorAll(".item-row").forEach((row) => {
      row.querySelector(".qty")?.addEventListener("input", updateTotals);
      row.querySelector(".price")?.addEventListener("input", updateTotals);
      row.querySelector(".removeItemBtn")?.addEventListener("click", () => { row.remove(); updateTotals(); });
      attachSuggestEvents(row);
    });
    // start loading pricelist
    loadProductList();
  });

})(); // end IIFE main.js
