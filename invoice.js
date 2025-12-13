(function () {
  // ===================== CONFIG =====================
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbxrlKIwLq4chQc7oUtzUdMZWTl-11ce_xoIq7nGiZBL1uyCBG9SLUOp9qICUTzPj-ho/exec";

  // ===================== TEMPLATE =====================
  const TEMPLATE_SRC = "invoice-template.png";
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

  // ===================== SAVE INVOICE (NO CORS)
  async function saveInvoiceToDb(payload) {
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(payload)
    });
    return true;
  }

  // ===================== GENERATE INVOICE =====================
  window.generateInvoice = async function () {
    const customerName = customer.value.trim();
    const customerWa = wa.value.trim();
    const receiverName = receiverNameInput.value.trim();
    const receiverPhone = receiverPhoneInput.value.trim();
    const receiverAddress = receiverAddressInput.value.trim();
    const shippingDate = shippingDateInput.value;

    if (!customerName) {
      alert("Nama customer belum diisi");
      return;
    }

    if (typeof updateTotals === "function") updateTotals();

    const delivery = parseNumber(deliveryInput.value);
    const subtotal = parseNumber(subtotalEl.textContent);
    const total = parseNumber(totalEl.textContent);

    // ===== ambil item =====
    const items = [];
    document.querySelectorAll(".item-row").forEach(row => {
      const name = row.querySelector(".productInput")?.value.trim();
      const qty = parseNumber(row.querySelector(".qty")?.value);
      const price = parseNumber(row.querySelector(".price")?.value);
      if (name && qty > 0) {
        items.push({ item: name, qty, price, amount: qty * price });
      }
    });

    if (!items.length) {
      alert("Minimal 1 item");
      return;
    }

    const invoiceDate = formatDateId(new Date());
    const localInvoiceNo = "INV-" + Date.now(); // untuk preview

    // =====================
    // PAYLOAD (SESUAI APPS SCRIPT)
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
      items: items.map(i => ({
        item: i.item,
        qty: i.qty
      }))
    };

    try {
      await saveInvoiceToDb(payload);
    } catch (err) {
      alert("Gagal simpan invoice");
      console.error(err);
      return;
    }

    document.getElementById("editInvoiceNo").value = localInvoiceNo;

    // ===================== CANVAS =====================
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
    ctx.fillText(localInvoiceNo, 1450, 575);
    ctx.fillText(invoiceDate, 1450, 650);
    ctx.fillText(shippingDate, 1450, 725);

    let y = 925;
    items.forEach(it => {
      ctx.textAlign = "left";
      const nextY = drawWrappedText(ctx, it.item, 200, y, 775, 55);
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
    invoicePreview.src = imgData;

    downloadJpg.href = imgData;
    downloadJpg.download = `invoice-${localInvoiceNo}.png`;
    downloadJpg.style.display = "inline-flex";

    shareBtn.style.display = "inline-flex";
    shareBtn.onclick = () => {
      const text = encodeURIComponent(
        `Invoice ${localInvoiceNo}\nTotal: Rp ${formatNumber(total)}`
      );
      window.open(`https://wa.me/?text=${text}`, "_blank");
    };
  };
})();
