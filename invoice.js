alert("INVOICE.JS FIXX");

/**
 * =====================================================
 * invoice.js — FINAL (LOAD + CREATE + UPDATE)
 * MATCH WITH CURRENT HTML
 * =====================================================
 */
(function () {

  /* ================= CONFIG ================= */
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbyXsQbxebY3KMFXmRrT3FVyU9n4lqy0nmoWuh1Q8cUUJwFBwb1aczzcHSHCIR-BFr-J/exec";

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

  /* ================= JSONP HELPER ================= */
  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = "__cb_" + Date.now() + Math.random().toString(36).slice(2);
      const s = document.createElement("script");

      window[cb] = res => {
        delete window[cb];
        s.remove();
        resolve(res);
      };

      s.src = url + "&callback=" + cb;
      s.onerror = () => {
        delete window[cb];
        s.remove();
        reject("JSONP error");
      };

      document.body.appendChild(s);
    });
  }

  /* ================= SAVE / UPDATE ================= */
  function saveInvoice(payload) {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return jsonp(
      WEB_APP_URL +
      "?action=saveinvoice" +
      "&payload=" + encodeURIComponent(b64)
    );
  }

  /* ================= LOAD INVOICE ================= */
  window.loadInvoice = async function () {
    const no = document.getElementById("editInvoiceNo").value.trim();
    if (!no) return alert("Masukkan nomor invoice");

    try {
      const res = await jsonp(
        WEB_APP_URL +
        "?action=loadinvoice" +
        "&no=" + encodeURIComponent(no)
      );

      if (!res?.ok) throw res?.error;

      fillForm(res.data);
    } catch (e) {
      alert("Invoice tidak ditemukan");
    }
  };

  function fillForm(d) {
    document.getElementById("customer").value = d.namaPemesan || "";
    document.getElementById("wa").value = d.noHpPemesan || "";
    document.getElementById("receiverName").value = d.namaPenerima || "";
    document.getElementById("receiverPhone").value = d.noHpPenerima || "";
    document.getElementById("receiverAddress").value = d.alamatPenerima || "";
    document.getElementById("shippingDate").value = d.tanggalPengirimISO || "";
    document.getElementById("delivery").value = d.delivery || 0;

    const list = document.getElementById("itemList");
    list.innerHTML = "";

    d.items.forEach(it => {
      addItemRow();
      const row = list.lastElementChild;
      row.querySelector(".productInput").value = it.item;
      row.querySelector(".qty").value = it.qty;
      row.querySelector(".price").value = formatNumber(it.price);
    });

    updateTotals();
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

    ctx.textAlign = "left";
    ctx.fillText(data.customer, 200, 630);
    ctx.fillText(data.wa, 200, 700);

    ctx.textAlign = "right";
    ctx.fillText(data.noInvoice || "-", 1450, 575);
    ctx.fillText(data.tanggalInvoice, 1450, 650);
    ctx.fillText(data.tanggalPengirim, 1450, 725);

    let y = 1020;
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
    const preview = document.getElementById("invoicePreview");
    preview.src = img;
    preview.style.display = "block";
    preview.style.visibility = "visible";

    document.getElementById("downloadJpg").style.display = "inline-block";
    document.getElementById("shareBtn").style.display = "inline-block";
  }

  /* ================= GENERATE ================= */
  window.generateInvoice = async function () {

    const customer = document.getElementById("customer").value.trim();
    const wa = document.getElementById("wa").value.trim();
    const receiverName = document.getElementById("receiverName").value.trim();
    const receiverPhone = document.getElementById("receiverPhone").value.trim();
    const receiverAddress = document.getElementById("receiverAddress").value.trim();
    const shippingDateRaw = document.getElementById("shippingDate").value;
    const noInvoiceEdit = document.getElementById("editInvoiceNo").value.trim();

    if (!customer) return alert("Nama customer wajib diisi");
    if (!shippingDateRaw) return alert("Tanggal kirim wajib diisi");

    updateTotals();

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

    const tanggalInvoice = formatDMY(new Date());
    const tanggalPengirim = formatDMY(new Date(shippingDateRaw));

    try {
      const res = await saveInvoice({
        noInvoice: noInvoiceEdit || null,   // ⬅️ KUNCI UPDATE
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

      alert("Invoice berhasil disimpan");

    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan invoice");
    }
  };

  /* ================= DOWNLOAD ================= */
  window.downloadInvoiceImage = function () {
    const img = document.getElementById("invoicePreview");
    if (!img?.src) return alert("Preview belum tersedia");

    const noInv = document.getElementById("editInvoiceNo").value || "invoice";
    const a = document.createElement("a");
    a.href = img.src;
    a.download = noInv + ".png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* ================= WHATSAPP ================= */
  window.sendInvoiceWhatsApp = function () {
    let wa = document.getElementById("wa").value.trim();
    if (!wa) return alert("Nomor WhatsApp belum diisi");

    wa = wa.replace(/[^0-9]/g, "");
    if (wa.startsWith("0")) wa = "62" + wa.slice(1);

    const total = document.getElementById("total").textContent;

    const msg = `
Halo terima kasih sudah berbelanja di Betterbutterybatter.

Total belanja Rp${total}

Pembayaran melalui transfer ke:
BCA 2150294366 a.n Efira

Mohon lakukan pembayaran maksimal pukul 17.00 WIB H-1 pengiriman.
    `.trim();

    window.open(
      "https://wa.me/" + wa + "?text=" + encodeURIComponent(msg),
      "_blank"
    );
  };

})();

