// =====================================================
// invoice.js — FINAL STABLE
// preview muncul + database tersimpan
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
    return new Intl.NumberFormat("id-ID").format(n || 0);
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

      script.onerror = () => reject("Gagal load script JSONP");
      document.body.appendChild(script);
    });
  }

  // ===================== GENERATE INVOICE =====================
  window.generateInvoice = async function () {

    // ---------- ambil data ----------
    const customer = customerName = document.getElementById("customer").value.trim();
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

    // ---------- nomor invoice ----------
    const now = new Date();
    const invoiceDate = formatDateId(now);
    const prefix = String(now.getFullYear()).slice(-2) + String(now.getMonth()+1).padStart(2,"0");
    const seq = (Number(localStorage.getItem("lastSeq")) || 0) + 2;
    localStorage.setItem("lastSeq", seq);
    const noInvoice = prefix + String(seq).padStart(3,"0");

    // =====================
    // 1️⃣ DRAW CANVAS (PASTI MUNCUL)
    // =====================
    const canvas = document.getElementById("invoiceCanvas");
    const ctx = canvas.getContext("2d");

    if (!templateLoaded) {
      await new Promise(r => templateImg.onload = r);
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

    ctx.fillText(formatNumber(subtotal), 1475, 1755);
    ctx.fillText(formatNumber(delivery), 1475, 1840);
    ctx.fillText(formatNumber(total), 1475, 1915);

    const img = canvas.toDataURL("image/png");
    document.getElementById("invoicePreview").src = img;

    // =====================
    // 2️⃣ SIMPAN DATABASE (PASTI MASUK)
    // =====================
    const payload = {
      noInvoice,
      namaPemesan: customer,
      noHpPemesan: wa,
      namaPenerima: receiverName,
      noHpPenerima: receiverPhone,
      alamatPenerima: receiverAddress,
      tanggalPengirim: shippingDate,
      subtotal,
      delivery,
      total,
      items // ⬅️ INI KUNCI UTAMA
    };

    try {
      const res = await saveInvoiceToDb(payload);
      if (!res.ok) throw res.error;
      document.getElementById("editInvoiceNo").value = noInvoice;
      alert("Invoice berhasil dibuat & disimpan");
    } catch (err) {
      console.error(err);
      alert("Preview muncul, tapi gagal simpan ke database");
    }
  };

})();

