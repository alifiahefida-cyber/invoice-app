// =====================
// invoice.js — FINAL
// =====================
(function () {
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbyLpZ-RdrrKFMh0RvpdfNCWqGaPwj47C6oZqk91k7PWbRj1BSertFaSdLkBDEqpUuds/exec";

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

  async function saveInvoice(payload) {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.ok) throw json.error;
    return json.noInvoice;
  }

  // =====================
  // LOAD INVOICE (EDIT)
  // =====================
  window.loadInvoice = async function () {
    const no = document.getElementById("editInvoiceNo").value.trim();
    if (!no) return alert("Isi nomor invoice");

    const res = await fetch(
      WEB_APP_URL + "?action=getinvoicebyno&noInvoice=" + encodeURIComponent(no)
    );
    const d = await res.json();
    if (!d.noInvoice) return alert("Invoice tidak ditemukan");

    document.getElementById("customer").value = d.namaPemesan;
    document.getElementById("wa").value = d.noHpPemesan;
    document.getElementById("receiverName").value = d.namaPenerima;
    document.getElementById("receiverPhone").value = d.noHpPenerima;
    document.getElementById("receiverAddress").value = d.alamatPenerima;
    document.getElementById("shippingDate").value = d.tanggalPengirim;
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
      const noInvoice = await saveInvoice(payload);
      document.getElementById("editInvoiceNo").value = noInvoice;
      alert("Invoice berhasil dibuat: " + noInvoice);
    } catch (err) {
      alert("Gagal simpan invoice");
      console.error(err);
    }
  };
})();
