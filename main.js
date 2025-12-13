// =====================
// main.js — FINAL
// =====================
(function () {
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbyLpZ-RdrrKFMh0RvpdfNCWqGaPwj47C6oZqk91k7PWbRj1BSertFaSdLkBDEqpUuds/exec";

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
  // LOAD HARGA
  // =====================
  async function loadHarga() {
    const res = await fetch(PRICE_URL, { cache: "no-store" });
    const json = await res.json();
    PRODUCT_LIST = json.harga || [];
    document.querySelectorAll(".item-row").forEach(setupRow);
  }

  function setupRow(row) {
    const input = row.querySelector(".productInput");
    const priceEl = row.querySelector(".price");
    const suggest = row.querySelector(".product-suggest");

    input.addEventListener("input", () => {
      const q = input.value.toLowerCase();
      suggest.innerHTML = "";

      if (!q) {
        suggest.style.display = "none";
        return;
      }

      PRODUCT_LIST
        .filter(p => String(p[NAME_KEY]).toLowerCase().includes(q))
        .forEach(p => {
          const div = document.createElement("div");
          div.className = "item";
          div.textContent = p[NAME_KEY];
          div.onclick = () => {
            input.value = p[NAME_KEY];
            priceEl.value = formatNumber(p[PRICE_KEY]);
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
      row.querySelector(".amount").textContent = formatNumber(amount);
      subtotal += amount;
    });

    document.getElementById("subtotal").textContent = formatNumber(subtotal);
    const delivery = parseNumber(document.getElementById("delivery").value);
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
        <input class="productInput" type="text">
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

  window.addEventListener("load", loadHarga);
})();
