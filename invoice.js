// =====================================================
// invoice.js — FINAL STABLE (DROPDOWN FIX)
// =====================================================
(function () {

  // ===================== CONFIG =====================
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbyXsQbxebY3KMFXmRrT3FVyU9n4lqy0nmoWuh1Q8cUUJwFBwb1aczzcHSHCIR-BFr-J/exec";

  const PRICE_URL = WEB_APP_URL + "?action=pricelist";

  // ===================== TEMPLATE =====================
  const TEMPLATE_SRC = "./invoice-template.png";
  const templateImg = new Image();
  let templateLoaded = false;

  templateImg.onload = () => (templateLoaded = true);
  templateImg.src = TEMPLATE_SRC;

  function waitTemplateLoaded() {
    if (templateLoaded) return Promise.resolve();
    return new Promise(res => {
      templateImg.onload = () => {
        templateLoaded = true;
        res();
      };
    });
  }

  // ===================== GLOBAL =====================
  let PRODUCT_LIST = [];

  // ===================== HELPERS =====================
  function parseNumber(x) {
    return (
      Number(
        String(x || "")
          .replace(/\./g, "")
          .replace(/,/g, ".")
          .replace(/[^0-9.-]/g, "")
      ) || 0
    );
  }

  function formatNumber(n) {
    return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
  }

  function formatDateDMY(date) {
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${date.getFullYear()}`;
  }

  // ===================== LOAD PRICE LIST =====================
  async function loadPriceList() {
    try {
      const res = await fetch(PRICE_URL);
      const data = await res.json();
      PRODUCT_LIST = data.harga || [];
    } catch (e) {
      console.error("Gagal load pricelist", e);
    }
  }

  // ===================== AUTOCOMPLETE =====================
  function setupProductAutocomplete(input) {
    input.addEventListener("input", () => {
      closeAllLists();

      const val = input.value.toLowerCase();
      if (!val) return;

      const list = document.createElement("div");
      list.className = "autocomplete-items";
      input.parentNode.appendChild(list);

      PRODUCT_LIST.filter(p =>
        String(p.nama || p.item || p.produk || "")
          .toLowerCase()
          .includes(val)
      ).forEach(p => {
        const name =
          p.nama || p.item || p.produk || p.name || "";

        const price = parseNumber(p.harga || p.price);

        const div = document.createElement("div");
        div.innerHTML = `<strong>${name}</strong> — Rp${formatNumber(price)}`;
        div.onclick = () => {
          input.value = name;
          const row = input.closest(".item-row");
          row.querySelector(".price").value = price;
          if (typeof updateTotals === "function") updateTotals();
          closeAllLists();
        };
        list.appendChild(div);
      });
    });
  }

  function closeAllLists() {
    document.querySelectorAll(".autocomplete-items").forEach(e => e.remove());
  }

  document.addEventListener("click", closeAllLists);

  // ===================== DRAW PREVIEW =====================
  async function drawPreview(data) {
    const canvas = document.getElementById("invoiceCanvas");
    const ctx = canvas.getContext("2d");

    await waitTemplateLoaded();

    canvas.width = templateImg.width;
    canvas.height = templateImg.height;
    ctx.drawImage(templateImg, 0, 0);

    ctx.fillStyle = "#ffffff";
    ctx.font = "37px 'Comic Sans MS'";

    ctx.textAlign = "left";
    ctx.fillText(data.customer, 200, 630);
    ctx.fillText(data.wa, 200, 700);

    ctx.textAlign = "right";
    ctx.fillText(data.noInvoice || "-", 1450, 575);
    ctx.fillText(data.tanggalInvoice, 1450, 650);
    ctx.fillText(data.tanggalPengirim, 1450, 725);

    let y = 925;
    data.items.forEach(it => {
      ctx.textAlign = "left";
      ctx.fillText(it.item, 200, y);
      ctx.textAlign = "right";
      ctx.fillText(formatNumber(it.price), 1050, y);
      ctx.textAlign = "center";
      ctx.fillText(it.qty, 1180, y);
      ctx.textAlign = "right";
      ctx.fillText(formatNumber(it.amount), 1475, y);
      y += 60;
    });

    ctx.textAlign = "right";
    ctx.fillText(formatNumber(data.subtotal), 1475, 1755);
    ctx.fillText(formatNumber(data.delivery), 1475, 1840);
    ctx.fillText(formatNumber(data.total), 1475, 1915);

    const img = canvas.toDataURL("image/png");
    const previewEl = document.getElementById("invoicePreview");
    previewEl.src = img;
    previewEl.style.display = "block";

    document.getElementById("downloadJpg").style.display = "inline-block";
    document.getElementById("shareBtn").style.display = "inline-block";
  }

  // ===================== INIT =====================
  window.addEventListener("DOMContentLoaded", async () => {
    await loadPriceList();

    document
      .querySelectorAll(".productInput")
      .forEach(setupProductAutocomplete);
  });

})();
