// invoice.js (final) - compatible with sheet name "invoice" for DB
(function () {
  // ===================== CONFIG =====================
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwM9BXJjAtyl0UEjJiwqV-aVYmhtvY_b3sf8JAZDfiLrUqNGnptjk1I3KztOzEETeRi/exec";
  const PRICELIST_DB_URL = WEB_APP_URL + "?action=pricelist";
  // Note: save uses JSONP to WEB_APP_URL?action=saveInvoice&payload=...&callback=cb

  let lastGeneratedInvoiceNo = "";

  // ===================== TEMPLATE (canvas) =====================
  const TEMPLATE_SRC = "./src/invoice-template.png";
  const templateImg = new Image();
  let templateLoaded = false;
  templateImg.onload = () => { templateLoaded = true; };
  templateImg.src = TEMPLATE_SRC;

  // ===================== HELPERS =====================
  function formatDateId(date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
  function parseNumber(x) {
    if (x === undefined || x === null || x === "") return 0;
    return Number(String(x).replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "")) || 0;
  }
  function formatNumber(n) {
    return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
  }
  function normalizeName(s) {
    if (!s && s !== 0) return "";
    return String(s).toLowerCase().replace(/[^\w\s\-&+()/]/g, "").replace(/\s+/g, " ").trim();
  }

  // ===================== PRICELIST MAP =====================
  let priceListMap = {};
  let priceListRaw = [];

  function buildMapFromRows(rows) {
    priceListMap = {};
    priceListRaw = rows || [];
    if (!rows || !rows.length) return;
    const sample = rows[0];
    const keys = Object.keys(sample || {});
    let nameField = null;
    let priceField = null;
    for (const k of keys) {
      const kl = k.toLowerCase();
      if (!nameField && (kl.includes("name") || kl.includes("nama") || kl.includes("item") || kl.includes("product") || kl.includes("produk"))) nameField = k;
      if (!priceField && (kl.includes("price") || kl.includes("harga") || kl.includes("amount") || kl.includes("cost"))) priceField = k;
    }
    if (!nameField || !priceField) {
      const stats = keys.map(k => {
        let numericCount = 0, stringCount = 0;
        for (let i = 0; i < Math.min(rows.length, 50); i++) {
          const v = rows[i][k];
          if (v === null || v === undefined) continue;
          if (typeof v === "number") numericCount++;
          else if (typeof v === "string") {
            const s = v.trim();
            if (/^[\d\.\, \u00A0\-]+$/.test(s)) numericCount++; else stringCount++;
          } else stringCount++;
        }
        return { k, numericCount, stringCount };
      });
      if (!nameField) { stats.sort((a,b)=>b.stringCount-a.stringCount); nameField = stats[0] ? stats[0].k : keys[0]; }
      if (!priceField) { stats.sort((a,b)=>b.numericCount-a.numericCount); priceField = stats[0] ? stats[0].k : (keys[1]||keys[0]); }
    }
    for (const r of rows) {
      const rawName = r[nameField];
      const rawPrice = r[priceField];
      const nname = normalizeName(rawName || "");
      const nprice = parseNumber(rawPrice);
      if (nname) priceListMap[nname] = nprice;
    }
  }

  function loadJsonp(url, callbackParam = "callback", timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      try {
        const cbName = "__jsonp_cb_" + Math.random().toString(36).slice(2);
        window[cbName] = function(data) {
          resolve(data);
          try { delete window[cbName]; } catch(e){}
          const s = document.getElementById(cbName);
          if (s) s.remove();
        };
        const script = document.createElement("script");
        script.id = cbName;
        const delim = url.includes("?") ? "&" : "?";
        script.src = url + delim + encodeURIComponent(callbackParam) + "=" + cbName;
        script.onerror = function() {
          try { delete window[cbName]; } catch(e){}
          if (script) script.remove();
          reject(new Error("JSONP script load error"));
        };
        document.head.appendChild(script);
        setTimeout(() => {
          if (window[cbName]) {
            try { delete window[cbName]; } catch(e){}
            script.remove();
            reject(new Error("JSONP timeout"));
          }
        }, timeoutMs);
      } catch (err) { reject(err); }
    });
  }

  async function fetchPriceList() {
    try {
      console.log("fetchPriceList -> trying fetch:", PRICELIST_DB_URL);
      const res = await fetch(PRICELIST_DB_URL, { cache: "no-store" });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch (e) { throw new Error("not_json"); }
      // server returns { harga: [...] } expected
      let rows = Array.isArray(json.harga) ? json.harga : null;
      if (!rows) {
        function findFirstArray(obj) {
          if (!obj || typeof obj !== "object") return null;
          if (Array.isArray(obj)) return obj;
          for (const k of Object.keys(obj)) {
            try {
              const a = findFirstArray(obj[k]);
              if (a) return a;
            } catch (e) {}
          }
          return null;
        }
        rows = findFirstArray(json) || [];
      }
      if (!rows.length) throw new Error("no_rows");
      buildMapFromRows(rows);
      console.log("Pricelist loaded (fetch). Items:", Object.keys(priceListMap).length);
      return { map: priceListMap, fields: null };
    } catch (err) {
      console.warn("fetchPriceList fetch failed:", err, "-> trying JSONP");
      try {
        const jsonp = await loadJsonp(PRICELIST_DB_URL);
        let rows = Array.isArray(jsonp.harga) ? jsonp.harga : null;
        if (!rows) {
          function findFirstArray(obj) {
            if (!obj || typeof obj !== "object") return null;
            if (Array.isArray(obj)) return obj;
            for (const k of Object.keys(obj)) {
              try {
                const a = findFirstArray(obj[k]);
                if (a) return a;
              } catch (e) {}
            }
            return null;
          }
          rows = findFirstArray(jsonp) || [];
        }
        if (!rows.length) throw new Error("no_rows_jsonp");
        buildMapFromRows(rows);
        console.log("Pricelist loaded (jsonp). Items:", Object.keys(priceListMap).length);
        return { map: priceListMap, fields: null };
      } catch (e2) {
        console.error("fetchPriceList JSONP also failed:", e2);
        priceListMap = {};
        priceListRaw = [];
        return { map: priceListMap, fields: null, error: e2 };
      }
    }
  }

  function getPriceByName(name) {
    if (!name) return 0;
    const nn = normalizeName(name);
    if (priceListMap[nn] !== undefined) return priceListMap[nn];
    const keys = Object.keys(priceListMap);
    const parts = nn.split(" ").filter(Boolean);
    for (const k of keys) {
      let matchAll = true;
      for (const p of parts) {
        if (!k.includes(p)) { matchAll = false; break; }
      }
      if (matchAll) return priceListMap[k];
    }
    for (const k of keys) {
      if (parts[0] && k.includes(parts[0])) return priceListMap[k];
    }
    return 0;
  }

  // ===================== SAVE (JSONP) - avoids CORS for POST-like action =====================
  function saveInvoiceToDb(payload) {
    return new Promise((resolve, reject) => {
      try {
        const cb = "__save_cb_" + Math.random().toString(36).slice(2);
        window[cb] = function(resp) {
          try { delete window[cb]; } catch(e){}
          const s = document.getElementById(cb);
          if (s) s.remove();
          resolve(resp);
        };

        const json = JSON.stringify(payload);
        const b64 = btoa(unescape(encodeURIComponent(json)));
        const url = WEB_APP_URL + (WEB_APP_URL.includes("?") ? "&" : "?") + "action=saveInvoice&payload=" + encodeURIComponent(b64) + "&callback=" + cb;

        const script = document.createElement("script");
        script.id = cb;
        script.src = url;
        script.onerror = function() {
          try { delete window[cb]; } catch(e){}
          if (script) script.remove();
          reject(new Error("JSONP save script load error"));
        };
        document.head.appendChild(script);

        setTimeout(() => {
          if (window[cb]) {
            try { delete window[cb]; } catch(e){}
            try { script.remove(); } catch(e){}
            reject(new Error("saveInvoice timeout"));
          }
        }, 10000);
      } catch (err) {
        reject(err);
      }
    });
  }

  // ===================== invoice number (local fallback) =====================
  async function generateInvoiceNumber() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = yy + mm;
    const STEP = 2;
    const START = 2;
    const pad3 = (n) => String(n).padStart(3, "0");
    const lsKey = "lastInvoiceNo7Digit";
    const lsVal = localStorage.getItem(lsKey);
    let next = START;
    if (lsVal && lsVal.startsWith(prefix)) {
      const n = parseInt(lsVal.slice(prefix.length), 10);
      if (!isNaN(n)) next = n + STEP;
    }
    if (next > 999) throw new Error("Nomor invoice melebihi batas (fallback).");
    const invoiceNo = prefix + pad3(next);
    localStorage.setItem(lsKey, invoiceNo);
    lastGeneratedInvoiceNo = invoiceNo;
    return invoiceNo;
  }

  // ===================== wrapText =====================
  function wrapText(ctx, text, x, y, maxX, lineHeight) {
    const words = String(text).split(" ");
    let line = "";
    const lines = [];
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = x + metrics.width;
      if (testWidth > maxX && i > 0) {
        lines.push(line);
        line = words[i] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    lines.forEach((l, i) => { ctx.fillText(l.trim(), x, y + i * lineHeight); });
    return lines.length;
  }

  // ===================== generateInvoice =====================
  window.generateInvoice = async function () {
    const customerName = document.getElementById("customer").value.trim();
    const customerWa = document.getElementById("wa").value.trim();
    const receiverName = document.getElementById("receiverName").value.trim();
    const receiverPhone = document.getElementById("receiverPhone").value.trim();
    const receiverAddress = document.getElementById("receiverAddress").value.trim();
    const shippingDate = document.getElementById("shippingDate").value;

    if (!customerName) { alert("Nama customer belum diisi."); return; }
    if (typeof updateTotals === "function") updateTotals();

    const delivery = parseNumber(document.getElementById("delivery").value);
    const subtotal = parseNumber(document.getElementById("subtotal").textContent);
    const total = parseNumber(document.getElementById("total").textContent);

    const rows = document.querySelectorAll(".item-row");
    const items = [];
    rows.forEach((row) => {
      const name = row.querySelector(".productInput").value.trim();
      if (!name) return;
      const qty = parseNumber(row.querySelector(".qty").value);
      const price = parseNumber(row.querySelector(".price").value);
      const amount = qty * price;
      if (!qty) return;
      items.push({ name, qty, price, amount });
    });
    if (!items.length) { alert("Minimal 1 item harus diisi."); return; }

    const now = new Date();
    const invoiceDate = formatDateId(now);
    const editInvoiceNo = document.getElementById("editInvoiceNo").value.trim();

    let noInvoice;
    try { noInvoice = editInvoiceNo || (await generateInvoiceNumber()); }
    catch (err) { console.error("Gagal generate no invoice:", err); alert("Gagal generate nomor invoice: " + err.message); return; }
    lastGeneratedInvoiceNo = noInvoice;

    // draw canvas
    const canvas = document.getElementById("invoiceCanvas");
    const ctx = canvas.getContext("2d");
    if (!templateLoaded) {
      await new Promise((resolve) => { templateImg.onload = () => { templateLoaded = true; resolve(); }; });
    }
    try { await document.fonts.ready; } catch (e) {}
    canvas.width = templateImg.width || 1600;
    canvas.height = templateImg.height || 2000;
    ctx.drawImage(templateImg, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "top";

    ctx.textAlign = "left";
    ctx.font = "40px 'Comic Sans MS'";
    ctx.fillText(customerName, 200, 600);
    ctx.fillText(customerWa, 200, 700);

    ctx.textAlign = "right";
    ctx.fillText(noInvoice, 1500, 540);
    ctx.fillText(invoiceDate, 1500, 615);
    ctx.fillText(shippingDate, 1500, 690);

    // items
    let y = 910;
    const lineHeight = 50;
    const itemGap = 30;
    items.forEach((it) => {
      ctx.textAlign = "left";
      ctx.font = "40px 'Comic Sans MS'";
      const usedLines = wrapText(ctx, it.name, 200, y, 1000, lineHeight);
      ctx.textAlign = "right";
      ctx.fillText(formatNumber(it.price), 1075, y);
      ctx.textAlign = "center";
      ctx.fillText(String(it.qty), 1175, y);
      ctx.textAlign = "right";
      ctx.fillText(formatNumber(it.amount), 1475, y);
      y += usedLines * lineHeight + itemGap;
    });

    // total
    ctx.textAlign = "right";
    ctx.font = "40px 'Comic Sans MS'";
    ctx.fillText(formatNumber(subtotal), 1475, 1725);
    ctx.fillText(formatNumber(delivery), 1475, 1800);
    ctx.fillText(formatNumber(total), 1475, 1875);

    const img = canvas.toDataURL("image/png");
    const previewEl = document.getElementById("invoicePreview");
    if (previewEl) { previewEl.src = img; previewEl.style.display = "block"; }
    const dl = document.getElementById("downloadJpg");
    if (dl) { dl.href = img; dl.download = `${noInvoice}.png`; dl.style.display = "inline-block"; }
    const shareBtnEl = document.getElementById("shareBtn");
    if (shareBtnEl) shareBtnEl.style.display = "inline-block";

    alert(`Invoice ${noInvoice} berhasil dibuat.`);

    const summary = items.map((i) => `${i.name} x${i.qty}`).join("; ");
    const payload = {
      noInvoice,
      namaPemesan: customerName,
      noHpPemesan: customerWa,
      namaPenerima: receiverName,
      noHpPenerima: receiverPhone,
      alamatPenerima: receiverAddress,
      tanggalPengirim: shippingDate,
      pesanan: summary,
      subtotal,
      delivery,
      total,
    };

    try {
      const res = await saveInvoiceToDb(payload);
      console.log("saveInvoiceToDb response:", res);
      if (res && res.ok) {
        console.log("Invoice saved successfully on server.");
      } else {
        console.warn("Server save returned:", res);
        alert("Invoice dibuat tetapi penyimpanan server gagal / tidak yakin. Periksa console.");
      }
    } catch (err) {
      console.error("Gagal menyimpan/update invoice ke server:", err);
      alert("Warning: Gagal menyimpan invoice ke database. Periksa koneksi / konfigurasi Web App.");
    }
  };

  // whatsapp share & preload pricelist
  window.addEventListener("load", () => {
    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        let wa = document.getElementById("wa").value.trim();
        if (!wa) return alert("Nomor WhatsApp belum diisi.");
        if (wa.startsWith("08")) wa = "62" + wa.slice(1);
        const customerName = document.getElementById("customer").value.trim() || "Kak";
        const totalText = document.getElementById("total").textContent || "0";
        const message = `Halo kak ${customerName},
Terima kasih telah melakukan pemesanan.
Total pesanan Anda: Rp${totalText}.
Pembayaran dapat dilakukan melalui transfer ke:
BCA 215 029 4366 a/n Efira
Mohon lakukan konfirmasi setelah transfer ya, Kak.`;
        window.open("https://wa.me/" + wa + "?text=" + encodeURIComponent(message), "_blank");
      });
    }
    // preload pricelist (best-effort)
    (async () => { await fetchPriceList(); })();
  });

  // loadInvoice (best-effort) — tries to find invoice list in server response
  async function loadInvoice() {
    const noInvoice = document.getElementById("editInvoiceNo").value.trim();
    if (!noInvoice) return alert("Masukkan nomor invoice terlebih dahulu.");
    try {
      const url = WEB_APP_URL + "?action=invoices";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch invoices failed: " + res.status);
      const data = await res.json();
      // server may respond { invoice: [...] } or { invoice: {...} } or first array
      let invList = Array.isArray(data.invoice) ? data.invoice : null;
      if (!invList) {
        // try common keys
        if (Array.isArray(data.Invoice)) invList = data.Invoice;
        else if (Array.isArray(data.invoices)) invList = data.invoices;
        else {
          // find first array
          function findFirstArray(obj) {
            if (!obj || typeof obj !== "object") return null;
            if (Array.isArray(obj)) return obj;
            for (const k of Object.keys(obj)) {
              try {
                const a = findFirstArray(obj[k]);
                if (a) return a;
              } catch (e) {}
            }
            return null;
          }
          invList = findFirstArray(data) || [];
        }
      }
      const inv = invList.find(i => i && String(i.noInvoice) === String(noInvoice));
      if (!inv) return alert("Invoice tidak ditemukan di server.");
      document.getElementById("customer").value = inv.namaPemesan || "";
      document.getElementById("wa").value = inv.noHpPemesan || "";
      document.getElementById("receiverName").value = inv.namaPenerima || "";
      document.getElementById("receiverPhone").value = inv.noHpPenerima || "";
      document.getElementById("receiverAddress").value = inv.alamatPenerima || "";
      document.getElementById("shippingDate").value = inv.tanggalPengirim || "";
      document.getElementById("delivery").value = inv.delivery || 0;

      const list = document.getElementById("itemList");
      if (list) list.innerHTML = "";
      const items = inv.pesanan ? inv.pesanan.split(";").map(s => {
        const [namePart, qtyPart] = s.split(" x");
        return { name: (namePart || "").trim(), qty: parseInt(qtyPart) || 1, price: getPriceByName(namePart) || 0 };
      }) : [];
      items.forEach(it => {
        const rdiv = document.createElement("div");
        rdiv.className = "item-row";
        rdiv.style.display = "grid";
        rdiv.style.gridTemplateColumns = "2.3fr 0.7fr 1fr 1.1fr 0.5fr";
        rdiv.style.gap = "8px";
        rdiv.style.marginBottom = "8px";
        rdiv.innerHTML = `
          <div style="position:relative">
            <input class="productInput" type="text" placeholder="Ketik nama produk..." value="${(it.name||"").replace(/"/g,'&quot;')}">
            <div class="product-suggest"></div>
          </div>
          <input class="qty" type="number" min="1" value="${it.qty}">
          <input class="price" type="text" value="${it.price ? formatNumber(it.price) : ""}">
          <div>
            <span class="amount-label">Rp </span>
            <span class="amount amount-value">0</span>
          </div>
          <button type="button" class="removeItemBtn" title="Hapus item">X</button>
        `;
        document.getElementById("itemList").appendChild(rdiv);
      });
      document.querySelectorAll(".item-row").forEach((row) => {
        row.querySelector(".qty")?.addEventListener("input", updateTotals);
        row.querySelector(".price")?.addEventListener("input", updateTotals);
        row.querySelector(".removeItemBtn")?.addEventListener("click", () => { row.remove(); updateTotals(); });
      });
      if (typeof updateTotals === "function") updateTotals();
      alert("Data invoice berhasil dimuat (jika tersedia pada server).");
    } catch (err) {
      console.error("Gagal load invoice:", err);
      alert("Gagal memuat invoice dari server. Fitur load mungkin tidak tersedia pada deploy Apps Script ini.");
    }
  }
  window.loadInvoice = loadInvoice;

  // expose minimal helpers if other scripts need them
  window.getPriceByName = getPriceByName;
  window.fetchPriceList = fetchPriceList;

})(); // end IIFE invoice.js
