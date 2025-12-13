// =====================
// invoice.js — FINAL (CORS SAFE)
// =====================
(function () {
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbxrlKIwLq4chQc7oUtzUdMZWTl-11ce_xoIq7nGiZBL1uyCBG9SLUOp9qICUTzPj-ho/exec";

  function parseNumber(x) {
    return Number(
      String(x || "")
        .replace(/\./g, "")
        .replace(/,/g, ".")
        .replace(/[^0-9.-]/g, "")
    ) || 0;
  }

  // =====================
  // SAVE INVOICE (NO-CORS)
  // =====================
  async function saveInvoice(payload) {
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",        // 🔴 KUNCI UTAMA
      body: JSON.stringify(payload)
    });

    // ⚠️ JANGAN baca response
    return true;
  }

  // =====================
  // LOAD INVOICE (EDIT)
  // =====================
  window.loadInvoice = async function () {
    const no = document.getElementById("editInvoiceNo").value.trim();
    if (!no) return alert("Isi nomor invoice");

    const res = await fetch(
      WEB_APP_URL +
        "?action=getinvoicebyno&noInvoice=" +
        encodeURIComponent(no)
    );

    const d = await res.json();
    if (!d.noInvoice) return alert("Invoice tidak ditemukan");

    customer.value = d.namaPemesan || "";
    wa.value = d.noHpPemesan || "";
    receiverName.value = d.namaPenerima || "";
    receiverPhone.value = d.noHpPenerima || "";
    receiverAddress.value = d.alamatPenerima || "";
    shippingDate.value = d.tanggalPengirim || "";
  };

  // =====================
  // GENERATE INVOICE
  // =====================
  window.generateInvoice = async function () {
    const items = [];

    document.querySelectorAll(".item-row").forEach(row => {
      const item = row.querySelector(".productInput").value.trim();
      const qty = parseNumber(row.querySelector(".qty").value);
      if (item && qty > 0) items.push({ item, qty });
    });

    if (!items.length) return alert("Minimal 1 item");

    const payload = {
      namaPemesan: customer.value,
      noHpPemesan: wa.value,
      namaPenerima: receiverName.value,
      noHpPenerima: receiverPhone.value,
      alamatPenerima: receiverAddress.value,
      tanggalPengirim: shippingDate.value,
      subtotal: parseNumber(subtotal.textContent),
      delivery: parseNumber(delivery.value),
      total: parseNumber(total.textContent),
      items
    };

    try {
      await saveInvoice(payload);
      alert("Invoice berhasil disimpan");
    } catch (err) {
      console.error(err);
      alert("Gagal simpan invoice");
    }
  };
})();
