(function () {
  // ===================== CONFIG =====================
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbyLpZ-RdrrKFMh0RvpdfNCWqGaPwj47C6oZqk91k7PWbRj1BSertFaSdLkBDEqpUuds/exec";

  // ===================== TEMPLATE =====================
  const TEMPLATE_SRC = "./src/invoice-template.png";
  const templateImg = new Image();
  let templateLoaded = false;
  templateImg.onload = () => (templateLoaded = true);
  templateImg.src = TEMPLATE_SRC;

  // ===================== HELPERS =====================
  function formatDateId(date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  function parseNumber(x) {
    if (!x) return 0;
    return (
      Number(
        String(x)
          .replace(/\./g, "")
          .replace(/,/g, ".")
          .replace(/[^0-9.-]/g, "")
      ) || 0
    );
  }

  function formatNumber(n) {
    return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
  }

  // ===================== TEXT WRAP =====================
  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let yy = y;

    words.forEach(word => {
      const testLine = line + word + " ";
      const w = ctx.measureText(testLine).width;
      if (w > maxWidth && line !== "") {
        ctx.fillText(line, x, yy);
        line = word + " ";
        yy += lineHeight;
      } else {
        line = testLine;
      }
    });

    ctx.fillText(line, x, yy);
    return yy + lineHeight;
  }

  // ===================== SAVE INVOICE (POST)
  async function saveInvoiceToDb(payload) {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.ok) throw json.error;
    return json.noInvoice; // ← INI PENTING
  }

  // ===================== GENERATE INVOICE =====================
  window.generateInvoice = async function () {
    const customerName = document.getElementById("customer").value.trim();
    const customerWa = document.getElementById("wa").value.trim();
    const receiverName = document.getElementById("receiverName").value.trim();
    const receiverPhone = document.getElementById("receiverPhone").value.trim();
    const receiverAddress = document.getElementById("receiverAddress").value.trim();
    const shippingDate = document.getElementById("shippingDate").value;

    if (!customerName) {
      alert("Nama customer belum diisi");
      return;
    }

    if (typeof updateTotals === "function") updateTotals();

    const delivery = parseNumber(document.getElementById("delivery").value);
    const subtotal = parseNumber(document.getElementById("subtotal").textContent);
    const total = parseNumber(document.getElementById("total").textContent);

    // ===== ambil item =====
    const items = [];
    document.querySelectorAll(".item-row").forEach(row => {
      const name = row.querySelector(".productInput")?.value.trim();
      const qty = parseNumber(row.querySelector(".qty")?.value);
      const price = parseNumber(row.querySelector(".price")?.value);
      if (name && qty > 0) {
        items.push({ name, qty, price, amount: qty * price });
      }
    });

    if (!items.length) {
      alert("Minimal 1 item");
      return;
    }

    const invoiceDate = formatDateId(new Date());

    // =====================
    // PAYLOAD (NO noInvoice!)
    // =====================
    const payload = {
      namaPemesan: customerName,
      noHpPemesan: customerWa,
      namaPenerima: receiverName,
      noHpPenerima: receiverPhone,
      alamatPenerima: receiverAddress,
      tanggalPengirim: shippingDate,
      subtotal,
      delivery,
      total,
      rincian: items.map(i => ({
        tanggal: shippingDate,
        item: i.name,
        qty: i.qty
      }))
    };

    // =====================
    // 1. SIMPAN DULU → DAPAT noInvoice
    // =====================
    let noInvoice;
    try {
      noInvoice = await saveInvoiceToDb(payload);
    } catch (err) {
      alert("Gagal simpan invoice");
      console.error(err);
      return;
    }

    // tampilkan nomor invoice
    document.getElementById("editInvoiceNo").value = noInvoice;

    // =====================
    // 2. BARU GAMBAR CANVAS
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

    ctx.fillText(customerName, 200, 630);
    ctx.fillText(customerWa, 200, 700);

    ctx.textAlign = "right";
    ctx.fillText(noInvoice, 1450, 575);
    ctx.fillText(invoiceDate, 1450, 650);
    ctx.fillText(shippingDate, 1450, 725);

    let y = 925;
    items.forEach(it => {
      ctx.textAlign = "left";
      const nextY = drawWrappedText(ctx, it.name, 200, y, 775, 55);
      ctx.textAlign = "right";
      ctx.fillText(formatNumber(it.price), 1050, y);
      ctx.textAlign = "center";
      ctx.fillText(it.qty, 1180, y);
      ctx.textAlign = "right";
      ctx.fillText(formatNumber(it.amount), 1475, y);
      y = nextY + 10;
    });

    ctx.textAlign = "right";
    ctx.fillText(formatNumber(subtotal), 1475, 1755);
    ctx.fillText(formatNumber(delivery), 1475, 1840);
    ctx.fillText(formatNumber(total), 1475, 1915);

    const imgData = canvas.toDataURL("image/png");
    document.getElementById("invoicePreview").src = imgData;

    const downloadBtn = document.getElementById("downloadJpg");
    downloadBtn.href = imgData;
    downloadBtn.download = `invoice-${noInvoice}.png`;
    downloadBtn.style.display = "inline-flex";

    const shareBtn = document.getElementById("shareBtn");
    shareBtn.style.display = "inline-flex";
    shareBtn.onclick = () => {
      const text = encodeURIComponent(
        `Invoice ${noInvoice}\nTotal: Rp ${formatNumber(total)}`
      );
      window.open(`https://wa.me/?text=${text}`, "_blank");
    };
  };
})();
