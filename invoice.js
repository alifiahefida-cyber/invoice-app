// =====================================================
// invoice.js — FINAL (DB sebagai sumber nomor invoice)
// preview muncul + database PASTI konsisten
// =====================================================
(function () {

  // ===================== CONFIG =====================
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbxrlKIwLq4chQc7oUtzUdMZWTl-11ce_xoIq7nGiZBL1uyCBG9SLUOp9qICUTzPj-ho/exec";

  // ===================== TEMPLATE =====================
  const TEMPLATE_SRC = "./invoice-template.png";
  const templateImg = new Image();
  let templateLoaded = false;
  templateImg.onload = () => (templateLoaded = true);
  templateImg.src = TEMPLATE_SRC;

  // ===================== HELPERS =====================
  function formatDateId(d) {
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

  // ===================== JSONP SAVE (ANTI CORS) =====================
  function saveInvoiceToDb(payload) {
    return new Promise((resolve, reject) => {
      const cb = "__save_cb_" + Math.random().toString(36).slice(2);

      window[cb] = function (res) {
        delete window[cb];
        document.getElementById(cb)?.remove();
        resolve(res);
      };

      const json = JSON.stringify(payload);
      const b64 = btoa(unescape(encodeURIComponent(json)));

      const script = document.createElement("script");
      script.id = cb;
      script.src =
        WEB_APP_URL +
        "?action=saveInvoice" +
        "&payload=" + encodeURIComponent(b64) +
        "&callback=" + cb;

      script.onerror = () => reject("JSONP gagal");
      document.body.appendChild(script);
    });
  }

  // ===================== GENERATE INVOICE =====================
  window.generateInvoice = async function () {

    // ---------- ambil data ----------
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

    // ---------- items ----------
    const items = [];
    document.querySelectorAll(".item-row").forEach(row => {
      const item = row.querySelector(".productInput")?.value.trim();
      const qty = parseNumber(row.querySelector(".qty")?.value);
      const price = parseNumber(row.querySelector(".price")?.value);

      if (item && qty > 0) {
        items.push({
          item,
          qty,
          price,
          amount: qty * price
        });
      }
    });

    if (!items.length) {
      alert("Minimal 1 item");
      return;
    }

    const invoiceDate = formatDateId(new Date());

    // =====================
    // 1️⃣ SIMPAN KE DATABASE (SERVER YANG TENTUKAN NO INVOICE)
    // =====================
    const payload = {
      namaPemesan: customer,
      noHpPemesan: wa,
      namaPenerima: receiverName,
      noHpPenerima: receiverPhone,
      alamatPenerima: receiverAddress,
      tanggalPengirim: shippingDate,
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

    // =====================
    // 2️⃣ BARU DRAW CANVAS (PAKAI noInvoice DARI DB)
    // =====================
    const canvas = document.getElementById("invoiceCanvas");
    const ctx = canvas.getContext("2d");

    if (!templateLoaded) {
      await new Promise(r => (templateImg.onload = r));
    }

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
    ctx.fillText(invoiceDate, 1450, 650);
    ctx.fillText(shippingDate, 1450, 725);

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
