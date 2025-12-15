// =====================================================
// invoice.js — FINAL FULL STABLE
// - Preview DIGAMBAR DULU (anti blank)
// - Save database JSONP (CORS-safe)
// - Tanggal Invoice  : otomatis (hari ini)
// - Tanggal Pengirim : dari input user
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

    // Customer
    ctx.textAlign = "left";
    ctx.fillText(data.customer, 200, 630);
    ctx.fillText(data.wa, 200, 700);

    // Invoice info
    ctx.textAlign = "right";
    ctx.fillText(data.noInvoice || "-", 1450, 575);
    ctx.fillText(data.tanggalInvoice, 1450, 650);
    ctx.fillText(data.tanggalPengirim, 1450, 725);

    // Items
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

    // Totals
    ctx.textAlign = "right";
    ctx.fillText(formatNumber(data.subtotal), 1475, 1755);
    ctx.fillText(formatNumber(data.delivery), 1475, 1840);
    ctx.fillText(formatNumber(data.total), 1475, 1915);

    const previewEl = document.getElementById("invoicePreview");
    previewEl.src = canvas.toDataURL("image/png");
    previewEl.style.display = "block";
    previewEl.style.visibility = "visible";
  }

  // ===================== GENERATE INVOICE =====================
  window.generateInvoice = async function () {

    // ===== ambil data form =====
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

    // ===== tanggal =====
    const tanggalInvoice = formatDateDMY(new Date());
    const tanggalPengirim = formatDateFromInput(shippingDateInput);

    // ===== payload =====
    const payload = {
      namaPemesan: customer,
      noHpPemesan: wa,
      namaPenerima: receiverName,
      noHpPenerima: receiverPhone,
      alamatPenerima: receiverAddress,
      tanggalPengirim,
      subtotal,
      delivery,
      total,
      items
    };

    // =====================
    // PREVIEW DULU (PASTI MUNCUL)
    // =====================
    await drawPreview({
      customer,
      wa,
      items,
      subtotal,
      delivery,
      total,
      tanggalInvoice,
      tanggalPengirim,
      noInvoice: ""
    });

    // =====================
    // SAVE DATABASE
    // =====================
    try {
      const res = await saveInvoiceToDb(payload);
      if (!res || !res.ok) throw res?.error || "Save gagal";

      document.getElementById("editInvoiceNo").value = res.noInvoice;

      // update preview dengan no invoice
      await drawPreview({
        customer,
        wa,
        items,
        subtotal,
        delivery,
        total,
        tanggalInvoice,
        tanggalPengirim,
        noInvoice: res.noInvoice
      });

      alert("Invoice berhasil dibuat & tersimpan di database");
    } catch (err) {
      console.error(err);
      alert("Preview berhasil dibuat, tapi gagal simpan ke database");
    }
  };

})();
