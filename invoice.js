alert("fix");

// =====================================================
// invoice.js — FIX FINAL (PREVIEW AMAN)
// =====================================================
(function () {

  // ===================== CONFIG =====================
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbyXsQbxebY3KMFXmRrT3FVyU9n4lqy0nmoWuh1Q8cUUJwFBwb1aczzcHSHCIR-BFr-J/exec";

  // ===================== TEMPLATE =====================
  const TEMPLATE_SRC = "./invoice-template.png";
  const templateImg = new Image();
  let templateLoaded = false;

  templateImg.onload = () => templateLoaded = true;
  templateImg.src = TEMPLATE_SRC;

  function waitTemplateLoaded() {
    if (templateLoaded) return Promise.resolve();
    return new Promise(res => templateImg.onload = () => {
      templateLoaded = true;
      res();
    });
  }

  // ===================== HELPERS =====================
  const formatDateDMY = d =>
    `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;

  const parseNumber = x =>
    Number(String(x || "").replace(/\./g,"").replace(/,/g,".").replace(/[^0-9.-]/g,"")) || 0;

  const formatNumber = n =>
    new Intl.NumberFormat("id-ID").format(Number(n) || 0);

  // ===================== JSONP SAVE =====================
  function saveInvoiceToDb(payload) {
    return new Promise((resolve, reject) => {
      const cb = "__save_cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");

      window[cb] = res => {
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
        delete window[cb];
        script.remove();
        reject("JSONP gagal");
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
    const previewEl = d
      
    
    
    ocument.getElementById("invoicePreview");
    previewEl.src = img;
    previewEl.style.display = "block";
    previewEl.style.visibility = "visible";

    document.getElementById("downloadJpg").style.display = "inline-block";
    document.getElementById("shareBtn").style.display = "inline-block";
  }
function formatTanggalText(tgl) {
  if (!tgl) return "";

  const s = String(tgl).replace(/\D/g, "");
  if (s.length !== 8) return tgl;

  const dd = s.slice(0, 2);
  const mm = s.slice(2, 4);
  const yyyy = s.slice(4, 8);

  return `${dd}/${mm}/${yyyy}`;
}

  // ===================== GENERATE =====================
 window.generateInvoice = async function () {

  const customer = document.getElementById("customer").value.trim();
  const wa = document.getElementById("wa").value.trim();
 const shippingDateRaw =
  document.getElementById("shippingDate").value;

const shippingDate =
  formatTanggalText(shippingDateRaw);


  if (!customer) return alert("Nama customer wajib diisi");
  if (!shippingDate) return alert("Tanggal kirim wajib diisi");

  if (typeof updateTotals === "function") updateTotals();

  const subtotal = parseNumber(document.getElementById("subtotal").textContent);
  const delivery = parseNumber(document.getElementById("delivery").value);
  const total = parseNumber(document.getElementById("total").textContent);

  const items = [];
  document.querySelectorAll(".item-row").forEach(r => {
    const item = r.querySelector(".productInput")?.value.trim();
    const qty = parseNumber(r.querySelector(".qty")?.value);
    const price = parseNumber(r.querySelector(".price")?.value);
    if (item && qty > 0) items.push({ item, qty, price, amount: qty * price });
  });

  if (!items.length) return alert("Minimal 1 item");

  const tanggalInvoice = formatDateDMY(new Date());
  const tanggalPengirim = formatDateDMY(new Date(shippingDate));

  // PREVIEW DULU
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

  // SAVE DATABASE
  try {
    const res = await saveInvoiceToDb({
      namaPemesan: customer,
      noHpPemesan: wa,
      tanggalPengirim,
      subtotal,
      delivery,
      total,
      items
    });

    if (!res?.ok) throw res?.error;

    document.getElementById("editInvoiceNo").value = res.noInvoice;

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

    alert("Invoice berhasil dibuat & disimpan");
  } catch (e) {
    alert("Preview tampil, tapi gagal simpan database");
  }
};
  window.downloadInvoiceImage = function () {
  const img = document.getElementById("invoicePreview");
  if (!img || !img.src) {
    alert("Preview belum tersedia");
    return;
  }

  const noInvoice =
    document.getElementById("editInvoiceNo").value || "invoice";

  const link = document.createElement("a");
  link.href = img.src;
  link.download = noInvoice + ".png";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
window.sendInvoiceWhatsApp = function () {
  const waRaw = document.getElementById("wa").value.trim();
  if (!waRaw) {
    alert("Nomor WhatsApp pemesan belum diisi");
    return;
  }

  // normalisasi nomor (hapus 0, +, spasi)
  let wa = waRaw.replace(/[^0-9]/g, "");
  if (wa.startsWith("0")) wa = "62" + wa.slice(1);

  const total = document.getElementById("total").textContent;

  const message = `
Halo terima kasih sudah berbelanja di Betterbutterybatter.

Total belanja Rp${total}

Pembayaran melalui transfer ke:
BCA 2150294366 a.n Efira

Mohon lakukan pembayaran maksimal pukul 17.00 WIB H-1 pengiriman.
  `.trim();

  const url =
    "https://wa.me/" +
    wa +
    "?text=" +
    encodeURIComponent(message);

  window.open(url, "_blank");
};

})();
















