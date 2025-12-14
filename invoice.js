alert("INVOICE.JS FINAL KELOAD");

// =====================================================
// invoice.js — FINAL STABLE (JSONP, CORS-SAFE)
// - Tanggal Invoice  : otomatis (hari ini) → PREVIEW
// - Tanggal Pengirim : input user → DATABASE + PREVIEW
// =====================================================
(function () {

  // ===================== CONFIG =====================
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbzvdMFELdWnSHfgZnvVox_DxO3JiDpiV0qKf0_Ik2SlneCQYdKDj2Amg7dsAWV4JyY8/exec";

  // ===================== TEMPLATE =====================
  const TEMPLATE_SRC = "./invoice-template.png";
  const templateImg = new Image();
  let templateLoaded = false;

  templateImg.onload = () => { templateLoaded = true; };
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
  function formatDateDMY(d) {
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }

  // AMAN untuk <input type="date"> (YYYY-MM-DD)
  function formatDateFromInput(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
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
      const cb = "__save_cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      let done = false;

      const script = document.createElement("script");

      window[cb] = function (res) {
        done = true;
        delete window[cb];
        script.remove();
        resolve(res);
      };

      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      script.src =
        WEB_APP_URL +
        "?action=saveinvoice" +
        "&payload=" + encodeURIComponent(b64) +
        "&callback=" + cb;

      script.onerror = () => {
        if (!done) {
          delete window[cb];
          script.remove();
          reject("JSONP gagal");
        }
      };

      document.body.appendChild(script);
    });
  }

  // ===================== GENERATE INVOICE =====================
  window.generateInvoice = async function () {

    // ===== ambil data =====
    const customer = document.getElementById("customer").value.trim();
    const wa = document.getElementById("wa").value.trim();
    const receiverName = document.getElementById("receiverName").value.trim();
    const receiverPhone = document.getElementById("receiverPhone").value.trim();
    const receiverAddress = document.getElementById("receiverAddress").value.trim();
    const shippingDateInput = document.getElementById("shippingDate").value;

    if (!customer) return alert("Nama customer wajib diisi");
    if (!shippingDateInput) return alert("Tanggal pengiriman wajib diisi");

    if (typeof updateTotals === "function") updateTotals();

    const subtotal = parseNumber(document.getElementById("subtotal").textContent);
    const delivery = parseNumber(document.getElementById("delivery").value);
    const total = parseNumber(document.getElementById("total").textContent);

    // ===== items =====
    const items = [];
    document.querySelectorAll(".item-row").forEach(row => {
      const item = row.querySelector(".productInput")?.value.trim();
      const qty = parseNumber(row.querySelector(".qty")?.value);
      const price = parseNumber(row.querySelector(".price")?.value);

      if (item && qty > 0) {
        items.push({ item, qty, price, amount: qty * price });
      }
    });

    if (!items.length) return alert("Minimal 1 item");

    // =====================
    // TANGGAL
    // =====================
    const tanggalInvoice  = formatDateDMY(new Date());                 // hari ini
    const tanggalPengirim = formatDateFromInput(shippingDateInput);    // dari input

    // =====================
    // SAVE DATABASE
    // =====================
    const payload = {
      namaPemesan: customer,
      noHpPemesan: wa,
      namaPenerima: receiverName,
      noHpPenerima: receiverPhone,
      alamatPenerima: receiverAddress,
      tanggalPengirim: tanggalPengirim, // ⬅️ STRING dd/mm/yyyy
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
      return alert("Gagal simpan ke database");
    }

    // =====================
    // DRAW PREVIEW
    // =====================
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
    ctx.fillText(tanggalInvoice, 1450, 650);   // 🧾 invoice
    ctx.fillText(tanggalPengirim, 1450, 725);  // 🚚 kirim

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

    const previewEl = document.getElementById("invoicePreview");
    previewEl.src = canvas.toDataURL("image/png");
    previewEl.style.display = "block";
    previewEl.style.visibility = "visible";

    alert("Invoice berhasil dibuat & tersimpan di database");
  };

})();
