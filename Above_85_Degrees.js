// Fully fixed version of your JS with per-table headings (no main heading)

function num(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element with id: ${id}`);
  const v = parseFloat(el.value);
  return isNaN(v) ? 0 : v;
}

function avg(values) {
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

function getHSDValue(density) {
  if (density >= 0.796 && density <= 0.801) return 0.00051;
  if (density >= 0.802 && density <= 0.807) return 0.00050;
  if (density >= 0.808 && density <= 0.814) return 0.00049;
  if (density >= 0.815 && density <= 0.823) return 0.00048;
  if (density >= 0.824 && density <= 0.832) return 0.00047;
  if (density >= 0.833 && density <= 0.842) return 0.00046;
  if (density >= 0.843 && density <= 0.852) return 0.00045;
  if (density >= 0.853 && density <= 0.862) return 0.00044;
  if (density >= 0.863 && density <= 0.875) return 0.00043;
  return null; // out of table range
}

function check() {
  try {
    // Basic
    const ordered_quantity = num("ordered_quantity");
    const supplier = document.getElementById("supplier").value || "";
    const date = document.getElementById("date").value || "";
    const tankerNumber = document.getElementById("tanker_number").value || "";
    const No_Of_Chambers = Math.max(1, Math.min(4, parseInt(document.getElementById("no_of_chambers").value || "4", 10)));

    // Per-mm values
    const per_mm = [1, 2, 3, 4].map((i) => {
      const cap = num(`tank_capacity_chamber_${i}`);
      const finalDip = num(`final_dip_chamber_${i}`);
      return finalDip > 0 ? cap / finalDip : 0;
    });

    // Dispatch
    const productDipDispatch = [1, 2, 3, 4].map((i) => num(`product_dip_chamber_${i}`));
    const tempDispatch = [1, 2, 3, 4].map((i) => num(`temperature_in_C_chamber_${i}`));
    const densityDispatch = [1, 2, 3, 4].map((i) => num(`density_chamber_${i}`));
    const qtyLtrDispatch = [0, 1, 2, 3].map((k) => productDipDispatch[k] * per_mm[k]);
    const Natural_Dispatch_QTY_Ltr = qtyLtrDispatch.reduce((a, b) => a + b, 0);

    // Receipt
    const receiptProductDip = [1, 2, 3, 4].map((i) => num(`receipt_product_dip_chamber_${i}`));
    const receiptTempC = [1, 2, 3, 4].map((i) => num(`receipt_temperature_in_C_chamber_${i}`));
    const receiptDensity = [1, 2, 3, 4].map((i) => num(`receipt_density_chamber_${i}`));
    const qtyLtrReceipt = [0, 1, 2, 3].map((k) => receiptProductDip[k] * per_mm[k]);
    const Natural_Receipt_QTY_Ltr = qtyLtrReceipt.reduce((a, b) => a + b, 0);

    // Weighbridge
    const delivered_gross_weight = num("delivered_gross_weight");
    const delivered_tare_weight = num("delivered_tare_weight");
    const delivery_product_weight = delivered_gross_weight - delivered_tare_weight;

    const received_gross_weight = num("Recieved_gross_weight");
    const received_tare_weight = num("Recieved_tare_weight");
    const received_product_weight = received_gross_weight - received_tare_weight;

    // Averages
    const dN = No_Of_Chambers;
    const delivery_avg_density = avg(densityDispatch.slice(0, dN));
    const received_avg_density = avg(receiptDensity.slice(0, dN));

    const Dispatch_avg_temperature_C = avg(tempDispatch.slice(0, dN));
    const dispatched_in_Degree_F = (Dispatch_avg_temperature_C * 9) / 5 + 32;
    const dispatch_Temp_Difference = dispatched_in_Degree_F - 85;

    const Received_avg_temperature_C = avg(receiptTempC.slice(0, dN));
    const received_in_Degree_F = (Received_avg_temperature_C * 9) / 5 + 32;
    const received_Temp_Difference = received_in_Degree_F - 85;

    // VCF
    const HSD_Correction_Factor_Dispatch = getHSDValue(delivery_avg_density);
    const HSD_Correction_Factor_Received = getHSDValue(received_avg_density);
    if (HSD_Correction_Factor_Dispatch == null) {
      alert(`Dispatch avg density ${delivery_avg_density.toFixed(3)} is out of supported range (0.796–0.875).`);
      return;
    }
    if (HSD_Correction_Factor_Received == null) {
      alert(`Receipt avg density ${received_avg_density.toFixed(3)} is out of supported range (0.796–0.875).`);
      return;
    }

    const Factor_Dispatch = dispatch_Temp_Difference * HSD_Correction_Factor_Dispatch + 1;
    const Factor_Received = received_Temp_Difference * HSD_Correction_Factor_Received + 1;

    const Dispatched_Litre_at_85F = Natural_Dispatch_QTY_Ltr / Factor_Dispatch;
    const Received_Litre_at_85F = Natural_Receipt_QTY_Ltr / Factor_Received;

    const Diff_vs_Ordered_Dispatch = Dispatched_Litre_at_85F - ordered_quantity;
    const Diff_vs_Ordered_Received = Received_Litre_at_85F - ordered_quantity;

    const delivery_product_MT = (delivery_product_weight * delivery_avg_density) / 1000;
    const received_product_MT = (received_product_weight * received_avg_density) / 1000;

    // PDF
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("jsPDF failed to load. Check the script URLs.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- Header table ---
    doc.setFontSize(10);
    const headerRows = [
      ["Supplier", supplier, "Date", date],
      ["Tanker No.", tankerNumber, "Chambers", String(No_Of_Chambers)],
      ["Ordered Qty @85°F (L)", ordered_quantity.toFixed(2), "", ""],
    ];
    doc.autoTable({
      startY: 10,
      head: [["Field", "Value", "Field", "Value"]],
      body: headerRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    // --- Dispatch Table ---
    doc.setFontSize(11);
    doc.text("Dispatch Particulars", 14, doc.lastAutoTable.finalY + 6);
    const dispatchBody = [1, 2, 3, 4].map((i, idx) => [
      String(i),
      productDipDispatch[idx].toFixed(2),
      qtyLtrDispatch[idx].toFixed(2),
      tempDispatch[idx].toFixed(2),
      densityDispatch[idx].toFixed(3),
    ]);
    dispatchBody.push(["TOTAL", "", Natural_Dispatch_QTY_Ltr.toFixed(2), "", ""]);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Chamber", "Product DIP (mm)", "Product Qty (L)", "Temp (°C)", "Density"]],
      body: dispatchBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    // --- Receipt Table ---
    doc.setFontSize(11);
    doc.text("Receipt Particulars", 14, doc.lastAutoTable.finalY + 6);
    const receiptBody = [1, 2, 3, 4].map((i, idx) => [
      String(i),
      receiptProductDip[idx].toFixed(2),
      qtyLtrReceipt[idx].toFixed(2),
      receiptTempC[idx].toFixed(2),
      receiptDensity[idx].toFixed(3),
    ]);
    receiptBody.push(["TOTAL", "", Natural_Receipt_QTY_Ltr.toFixed(2), "", ""]);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Chamber", "Product DIP (mm)", "Product Qty (L)", "Temp (°C)", "Density"]],
      body: receiptBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    // --- Weighbridge Table ---
    doc.setFontSize(11);
    doc.text("Weighbridge Table", 14, doc.lastAutoTable.finalY + 6);
    const wbBody = [
      ["Dispatch", delivered_gross_weight.toFixed(2), delivered_tare_weight.toFixed(2), delivery_product_weight.toFixed(2), delivery_product_MT.toFixed(3)],
      ["Receipt", received_gross_weight.toFixed(2), received_tare_weight.toFixed(2), received_product_weight.toFixed(2), received_product_MT.toFixed(3)],
    ];
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Type", "Gross Wt (kg)", "Tare Wt (kg)", "Net Wt (kg)", "Product (MT)"]],
      body: wbBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    // --- 85°F Calc Table ---
    doc.setFontSize(11);
    doc.text("HSD 85°F Calculation Against Ordered 85°F Qty", 14, doc.lastAutoTable.finalY + 6);
    const calcBody = [
      ["Dispatch", `${Dispatch_avg_temperature_C.toFixed(2)} / ${dispatched_in_Degree_F.toFixed(2)}`, dispatch_Temp_Difference.toFixed(2), delivery_avg_density.toFixed(3), HSD_Correction_Factor_Dispatch.toFixed(5), Factor_Dispatch.toFixed(6), Dispatched_Litre_at_85F.toFixed(2)],
      ["Receipt", `${Received_avg_temperature_C.toFixed(2)} / ${received_in_Degree_F.toFixed(2)}`, received_Temp_Difference.toFixed(2), received_avg_density.toFixed(3), HSD_Correction_Factor_Received.toFixed(5), Factor_Received.toFixed(6), Received_Litre_at_85F.toFixed(2)],
    ];
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Type", "Avg Temp °C/°F", "Diff (°F-85)", "Density", "VCF", "Factor", "Liters @85°F"]],
      body: calcBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    // --- Differences ---
    doc.setFontSize(11);
    doc.text("Conclusive Result", 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Diff than Ordered 85°F std. Qty", "Litres"]],
      body: [
        ["Dispatched @85°F - Ordered", Diff_vs_Ordered_Dispatch.toFixed(2)],
        ["Received @85°F - Ordered", Diff_vs_Ordered_Received.toFixed(2)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    // Footer
    doc.setFontSize(9);
    doc.text("Generated Report - By Syed Aqeel Ahmed", 14, doc.internal.pageSize.height - 8);

    doc.save("HSD_Above_85_Report.pdf");
  } catch (err) {
    console.error(err);
    if (!/out of supported range|jsPDF/.test(err.message)) {
      alert(`Error: ${err.message}`);
    }
  }
}
