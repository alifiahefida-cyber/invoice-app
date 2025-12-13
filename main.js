// =====================
// main.js — FINAL STABLE
// =====================
(function () {

  // =====================
  // CONFIG
  // =====================
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbxrlKIwLq4chQc7oUtzUdMZWTl-11ce_xoIq7nGiZBL1uyCBG9SLUOp9qICUTzPj-ho/exec";

  const PRICE_URL = WEB_APP_URL + "?action=pricelist";

  const NAME_KEY_CANDIDATES = ["Name", "Nama", "Item", "Produk", "Product"];
  const PRICE_KEY_CANDIDATES = ["Price", "Harga", "Amount"];

  let PRODUCT_LIST = [];

  // =====================
  // HELPERS
  // =====================
  function parseNumber(x) {
    return Number(
      String(x || "")
        .replace(/\./g, "")
        .replace(/,/g, ".")
        .replace(/[^0-9.-]/g, "")
    ) || 0;
  }

  function formatNumber(n) {
    return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
  }

  function getNameField(o) {
    return NAME_KEY_CANDIDATES.find(k => o && o[k] !== undefined);
  }

  function getPriceField(o) {
    return PRICE_KEY_CANDIDATES.find(k => o && o[k] !== undefined);
  }

  // =====================
  // LOAD HARGA
  // =====================
  async function loadHarga() {
    try {
      const res = await fetch(PRICE_URL, {
        redirect: "follow",
        cache: "no-store"
      });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const json = await res.json();
      if (!Array.isArray(json.harga)) throw new Error("Format data harga salah");

      PRODUCT_LIST = json.harga;

      // setup autocomplete utk row yg sudah ada
      document.querySelectorAll(".item-row").forEach(setupRow);

    } catch (err) {
      console.error("LOAD HARGA ERROR:", err);
      alert("Gagal memuat harga");
    }
  }

  // =====================
  // AUTOCOMPLETE
  // =====================
  function setupRow(row) {
    const input = row.querySelector(".productInput");
    const priceEl = row.querySelector(".price");
    const suggest = row.querySelector(".product-suggest");
    const qtyEl = row.querySelector(".qty");

    if (!input || !priceEl || !suggest || !qtyEl) return;

    input.parentElement.style.position = "relative";
    suggest.style.position = "absolute";
    suggest.style.zIndex = "9999";

    input.addEventListener("input", () => {
      const q = input.value.toLowerCase().trim();
      suggest.innerHTML = "";

      if (!q) {
        suggest.style.display = "none";
        return;
      }

      PRODUCT_LIST
        .filter(p => {
          const nk = getNameField(p);
          return nk && String(p[nk]).toLowerCase().includes(q);
        })
        .forEach(p => {
          const nk = getNameField(p);
          const pk = getPriceField(p);

          const div = document.createElement("div");
          div.className = "item";
          div.textContent = p[nk];

          div.onmousedown = () => {
            input.value = p[nk];
            priceEl.value = formatNumber(p[pk] || 0);
            qtyEl.value = 1;
            suggest.style.display = "none";
            updateTotals();
          };

          suggest.appendChild(div);
        });

      suggest.style.display = suggest.children.length ? "block" : "none";
    });
  }

  // =====================
  // TOTALS
  // =====================
  window.updateTotals = function () {
    let subtotal = 0;

    document.querySelectorAll(".item-row").forEach(row => {
      const qty = parseNumber(row.querySelector(".qty")?.value);
      const price = parseNumber(row.querySelector(".price")?.value);
      const amount = qty * price;

      const amountEl = row.querySelector(".amount");
      if (amountEl) amountEl.textContent = formatNumber(amount);

      subtotal += amount;
    });

    document.getElementById("subtotal").textContent = formatNumber(subtotal);

    const delivery = parseNumber(document.getElementById("delivery").value);
    document.getElementById("total").textContent =
      formatNumber(subtotal + delivery);
  };

  // =====================
  // ADD ITEM ROW
  // =====================
  window.addItemRow = function () {
    const list = document.getElementById("itemList");

    const row = document.createElement("div");
    row.className = "item-row";

    row.innerHTML = `
      <div style="position:relative">
        <input class="productInput" type="text" placeholder="Nama produk">
        <div class="product-suggest"></div>
      </div>
      <input class="qty" type="number" min="1" value="1">
      <input class="price" type="text">
      <div>Rp <span class="amount">0</span></div>
      <button type="button" class="removeItemBtn">X</button>
    `;

    list.appendChild(row);

    row.querySelector(".qty").addEventListener("input", updateTotals);
    row.querySelector(".price").addEventListener("input", updateTotals);
    row.querySelector(".removeItemBtn").addEventListener("click", () => {
      row.remove();
      updateTotals();
    });

    setupRow(row);
  };

  // =====================
  // INIT
  // =====================
  window.addEventListener("load", () => {
    loadHarga();
    updateTotals();
  });

})();
