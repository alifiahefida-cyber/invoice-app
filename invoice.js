alert("INVOICE.JS FIXX");

/**
 * =====================================================
 * invoice.js — FINAL STABLE
 * FIX:
 * 1. Invoice number selalu muncul
 * 2. Tanggal kirim konsisten
 * 3. Rincian selalu terkirim
 * =====================================================
 */
(function () {

  /* ================= CONFIG ================= */
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbzvdMFELdWnSHfgZnvVox_DxO3JiDpiV0qKf0_Ik2SlneCQYdKDj2Amg7dsAWV4JyY8/exec";

  /* ================= TEMPLATE ================= */
  const TEMPLATE_SRC = "./invoice-template.png";
  const templateImg = new Image();
  let templateLoaded = false;

  templateImg.onload = () => (templateLoaded = true);
  templateImg.src = TEMPLATE_SRC;

  function waitTemplate() {
    if (templateLoaded) return Promise.resolve();
    return new Promise(res => (templateImg.onload = () => res()));
  }

  /* ================= HELPERS ================= */
  const formatDMY = d =>
    `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;

  const parseNumber = x =>
    Number(
      String(x || "")
        .replace(/\./g, "")
        .replace(/,/g, ".")
        .replace(/[^0-9.-]/g, "")
    ) || 0;

  const formatNumber = n =>
    new Intl.NumberFormat("id-ID").format(Number(n) || 0);

  /* ================= JSONP SAVE ================= */
  function saveInvoice(payload) {
    return new Promise((resolve, reject) => {
      const cb = "__cb_" + Date.now();
      const script = document.createElement("script");

      window[cb] = res => {
        delete window[cb];
        script.remove();
        resolve(res);
      };

      const b64 = btoa(
        unescape(encodeURIComponent(JSON.stringify(payload)))
      );

      script.src =
        WEB_APP_URL +
        "?action=saveinvoice" +
        "&payload=" +
        encodeURIComponent(b64) +
        "&callback=" +
        cb;

      script.onerror = () => {
        delete window[cb];
        script.remove();
        reject("JSONP error");
      };

      document.body.appendChild(script);
    });
  }

  /* ================= DRAW PREVIEW ================= */
  async function drawPreview(data) {
    await waitTemplate();

    const canvas = document.getElementById("invoiceCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = templateImg.width;
    canvas.height = templateImg.height;
    ctx.drawImage(templateImg, 0, 0);

    ctx.fillStyle = "#ffffff";
    ctx.font = "37px 'Comic Sans MS'";

    // CUSTOMER
    ctx.textAlign = "left";
    ctx.fillText(data.customer, 200, 630);
    ctx.fillText(data.wa, 200, 700);

    // HEADER KANAN
    ctx.textAlign = "right";
    ctx.fillText(data.noInvoice, 1450, 575);
    ctx.fillText(data.tanggalInvoice, 1450, 650);
    ctx.fillText(data.tanggalPengirim, 1450, 725);

    // ITEMS
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

    // TOTALS
    ctx.textAlign = "right";
    ctx.fillText(formatNumber(data.subtotal), 1475, 1755);
    ctx.fillText(formatNumber(data.delivery), 1475, 1840);
    ctx.fillText(formatNumber(data.total), 1475, 1915);

    // PREVIEW IMAGE
    const img = canvas.toDataURL("image/png");
    const preview = document.getElementById("invoicePreview");
    preview.src = img;
    preview.style.display = "block";
    preview.style.visibility = "visible";

    document.getElementById("downloadJpg").style.display = "inline-block";
    document.getElementById("shareBtn").style.display = "inline-block";
  }

  /* ================= GENERATE INVOICE ================= */
  window.generateInvoice = async function () {

    const customer = document.getElementById("customer").value.trim();
    const wa = document.getElementById("wa").value.trim();
    const shippingDate = document.getElementById("shippingDate").value;

    if (!customer) return alert("Nama customer wajib diisi");
    if (!shippingDate) return alert("Tanggal kirim wajib diisi");

    if (typeof updateTotals === "function") updateTotals();

    const subtotal = parseNumber(
      document.getElementById("subtotal").textContent
    );
    const delivery = parseNumber(
      document.getElementById("delivery").value
    );
    const total = parseNumber(
      document.getElementById("total").textContent
    );

    // ITEMS (PASTI TERKIRIM)
    const items = [];
    document.querySelectorAll(".item-row").forEach(r => {
      const item = r.querySelector(".productInput")?.value.trim();
      const qty = parseNumber(r.querySelector(".qty")?.value);
      const price = parseNumber(r.querySelector(".price")?.value);
      if (item && qty > 0) {
        items.push({
          item,
          qty,
          price,
          amount: qty * price
        });
      }
    });

    if (!items.length) return alert("Minimal 1 item");

    const tanggalInvoice = formatDMY(new Date());
    const tanggalPengirim = formatDMY(new Date(shippingDate));

    /* ===== SAVE KE DATABASE DULU ===== */
    try {
      const res = await saveInvoice({
        namaPemesan: customer,
        noHpPemesan: wa,
        tanggalPengirim,
        subtotal,
        delivery,
        total,
        items
      });

      if (!res?.ok) throw res?.error;

      // SET NO INVOICE
      document.getElementById("editInvoiceNo").value = res.noInvoice;

      /* ===== PREVIEW SEKALI SAJA (FINAL) ===== */
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

      alert("Invoice berhasil dibuat");

    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan invoice");
    }
  };

  /* ================= DOWNLOAD ================= */

