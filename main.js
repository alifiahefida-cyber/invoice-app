// =====================
// main.js — FIX MINIMAL + DEBUG
// =====================
(function () {
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbyzeCDH_BpgPs_0SF1rNZn4u9OCOK88uKjAmHwTeaTRNYlZSuZF94U-1_FC3d4pViE/exec";

  const PRICE_URL = WEB_APP_URL + "?action=pricelist";
  const NAME_KEY = "Name";
  const PRICE_KEY = "Price";

  let PRODUCT_LIST = [];

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

  // =====================
  // LOAD HARGA (FIX FETCH + DEBUG)
  // =====================
  async function loadHarga() {
    try {
      console.log("FETCHING:", PRICE_URL);

      const res = await fetch(PRICE_URL, {
        method: "GET",
        redirect: "follow",
        cache: "no-store"
      });

      console.log("FETCH STATUS:", res.status, res.url);

      if (!res.ok) {
        throw "HTTP " + res.status;
      }

      const json = await res.json();
      console.log("RESPONSE JSON:", json);

      if (!Array.isArray(json.harga)) {
        throw "Data harga tidak valid";
      }

      PRODUCT_LIST = json.harga;

      alert("Harga loaded: " + PRODUCT_LIST.length);
      console.log("PRODUCT_LIST:", PRODUCT_LIST);

      document.querySelectorAll(".item-row").forEach(setupRow);

    } catch (err) {
      console.error("GAGAL LOAD HARGA:", err);
      alert("Gagal memuat harga");
    }
  }

  // =====================
  // AUTOCOMPLETE (DEBUG)
  // =====================
  function setupRow(row) {
    console.log("setupRow dipanggil:", row);

    const input = row.querySelector(".productInput");
    const priceEl = row.querySelector(".price");
    const suggest = row.querySelector(".product-suggest");
    const qtyEl = row.querySelector(".qty");

    if (!input || !priceEl || !suggest) {
      console.warn("ROW TIDAK LENGKAP", row);
      return;
    }

    input.parentElement.style.position = "relative";
    suggest.style.position = "absolute";
    suggest.style.zIndex = "9999";

    input.addEventListener("input", () => {
      console.log("INPUT:", input.value);

      const q = input.value.toLowerCase();
      suggest.innerHTML = "";

      if (!q) {
        suggest.style.display = "none";
        return;
      }

      const matches = PRODUCT_LIST.filter(p =>
        String(p[NAME_KEY]).toLowerCase().includes(q)
      );

      console.log("MATCHES:", matches.map(m => m[NAME_KEY]));

      matches.forEach(p => {
        const div = document.createElement("div");
        div.className = "item";
        div.textContent = p[NAME_KEY];

        div.onmousedown = () => {
          console.log("PILIH ITEM:", p[NAME_KEY]);
          input.value = p[NAME_KEY];
          priceEl.value = formatNumber(p[PRICE_KEY]);
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
  // TOTAL
  // =====================
  window.updateTotals = function () {
    let subtotal = 0;

    document.querySelectorAll(".item-row").forEach(row => {
      const qty = parseNumber(row.querySelector(".qty").value);
      const price = parseNumber(row.querySelector(".price").value);
      const amount = qty * price;

      row.querySelector(".amount").textContent =
        formatNumber(amount);

      subtotal += amount;
    });

    document.getElementById("subtotal").textContent =
      formatNumber(subtotal);

    const delivery = parseNumber(
      document.getElementById("delivery").value
    );

    document.getElementById("total").textContent =
      formatNumber(subtotal + delivery);
  };

  // =====================
  // TAMBAH ITEM
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

    row.querySelector(".qty").oninput = updateTotals;
    row.querySelector(".price").oninput = updateTotals;
    row.querySelector(".removeItemBtn").onclick = () => {
      row.remove();
      updateTotals();
    };

    setupRow(row);
  };

  // =====================
  // INIT
  // =====================
  window.addEventListener("load", () => {
    loadHarga();
    document
      .querySelectorAll(".qty, .price")
      .forEach(el =>
        el.addEventListener("input", updateTotals)
      );
  });
})();

