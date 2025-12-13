alert("INVOICE.JS TERBARU2 KELOAD");

// =====================================================
// invoice.js — FINAL STABLE (JSONP, CORS-SAFE)
// Tanggal Rincian = Tanggal Pengiriman
// Preview PASTI muncul
// =====================================================
(function () {

  // ===================== CONFIG =====================
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbzvdMFELdWnSHfgZnvVox_DxO3JiDpiV0qKf0_Ik2SlneCQYdKDj2Amg7dsAWV4JyY8/exec";

  // ===================== TEMPLATE =====================
  const TEMPLATE_SRC = "./invoice-template.png";
  const templateImg = new Image();
  let templateLoaded = false;

  templateImg.onload = () => {
    templateLoaded = true;
  };
  templateImg.src = TEMPLATE_SRC;

  function waitTemplateLoaded() {
    if (templateLoaded) return Promise.resolve();
    return new Promise(resolve => {
      templateImg.onload = () => {
        templateLoaded = true;
        resolve();
      };
    });
  }

  // ===================== HELPERS =====================
  function formatDateDMY(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }

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

  // ===================== SAVE (JSONP) =====================
  function saveInvoiceToDb(payload) {
    return new Promise((resolve, reject) => {
      const cb = "__save_cb_" + Date.now();
      let done = false;

      window[cb] = function (res) {
        done = true;
        delete window[cb];
        script.remove();
        resolve(res);
      };

      const json = JSON.stringify(payload);
      const b64 = btoa(unescape(encodeURIComponent(json)));

      const script = document.createElement("script");
      script.src =
        WEB_APP_URL +
        "?action=saveinvoice" +
        "&payload=" + encodeURIComponent(b64) +
        "&callback=" + cb;

      script.onerror = () => {
        if (!done) reject("JSONP gagal");
      };

      document.body.appendChild(script);
    });
  }

  // ===================== GENERATE INVOICE =====================
  window.generateInvoice = async function () {

    const customer = document.getElementById("customer").value.trim();
    const wa = document.getElementById("wa").value.trim();
    const receiverName = document.getElementById("receiverName").value.trim();
    const receiverPhone = document.getElementById("receiverPhone").value.trim();
    const receiverAddress = document.getElementById("receiverAddress").value.trim();
    const shippingDate = document.getElementById("shippingDate").value;

    if (!customer) {
      alert("Nama customer wajib diisi");
      return;
    }

    if (typeof updateTotals === "function") updateTotals();

    const subtotal = parseNumber(document.getElementById("subtotal").textContent);
    const delivery = parseNumber(document.getElementById("delivery").value);
    const total = parseNumber(document.getElementById("total").textContent);

    const items = [];
    document.querySelectorAll(".item-row").forEach(row => {
      const item = row.querySelector(".productInput")?.value.trim();
      const qty = parseNumber(row.querySelector(".qty")?.value);
      const price = parseNumber(row.querySelector(".price")?.value);

      if (item && qty > 0) {
        items.push({ item, qty, price, amount: qty * price });
      }
    });

    if (!items.length) {
      alert("Minimal 1 item");
      return;
    }

    // ================= SAVE DATABASE =================
    const payload = {
      namaPemesan: customer,
      noHpPemesan: wa,
      namaPenerima: receiverName,
      noHpPenerima: receiverPhone,
      alamatPenerima: receiverAddress,
      tanggalPengirim: formatDateDMY(shippingDate),
      subtotal,
      delivery,
      total,
      items
    };

    let noInvoice;
    try {
      const res = await saveInvoiceToDb(payload);
      if (!res || !res.ok) throw res?.error || "Save gagal";
      noInvoice = res.noInvoice;
      document.getElementById("editInvoiceNo").value = noInvoice;
    } catch (err) {
      console.error(err);
      alert("Gagal simpan ke database");
      return;
    }

    // ================= DRAW PREVIEW =================
    const canvas = document.getElementById("invoiceCanvas");
    const ctx = canvas.getContext("2d");

    await waitTemplateLoaded();

    canvas.width = templateImg.width;
    canvas.height = templateImg.height;
    ctx.drawImage(templateImg, 0, 0);

    ctx.fillStyle = "#ffffff";
    ctx.font = "37px 'Comic Sans MS'";

    ctx.textAlign = "left";
    ctx.fillText(customer, 200, 630);
    ctx.fillText(wa, 200, 700);

    ctx.textAlign = "right";
    ctx.fillText(noInvoice, 1450, 575);
    ctx.fillText(formatDateDMY(shippingDate), 1450, 650);

    let y = 925;
    items.forEach(it => {
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
    ctx.fillText(formatNumber(subtotal), 1475, 1755);
    ctx.fillText(formatNumber(delivery), 1475, 1840);
    ctx.fillText(formatNumber(total), 1475, 1915);

    const img = canvas.toDataURL("image/png");
    const previewEl = document.getElementById("invoicePreview");
    previewEl.src = img;
    previewEl.style.display = "block";
    previewEl.style.visibility = "visible";

    alert("Invoice berhasil dibuat & tersimpan di database");
  };

})();
