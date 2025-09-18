// Fully fixed version of your JS with per-table headings + Hub Diesel Flow Meter integration
// + Fix for Tanker Cert & Cal. Validity not printing

function num(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
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
    // Basic info
    const ordered_quantity = num("ordered_quantity");
    const supplier = document.getElementById("supplier")?.value || "N/A";
    const date = document.getElementById("date")?.value || "N/A";
    const tankerNumber = document.getElementById("tanker_number")?.value || "N/A";
    const tankerCertNum = document.getElementById("tanker_cert_num")?.value || "N/A";
    const calValidityDate = document.getElementById("cal_validity_date")?.value || "N/A";

    const No_Of_Chambers = Math.max(
      1,
      Math.min(4, parseInt(document.getElementById("no_of_chambers")?.value || "4", 10))
    );

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

    const Dispatched_Litre_at_85F = Natural_Dispatch_QTY_Ltr * Factor_Dispatch;
    const Received_Litre_at_85F = Natural_Receipt_QTY_Ltr * Factor_Received;

    const Diff_vs_Ordered_Dispatch = Dispatched_Litre_at_85F - ordered_quantity;
    const Diff_vs_Ordered_Received = Received_Litre_at_85F - ordered_quantity;

    const delivery_product_MT = (delivery_product_weight * delivery_avg_density) / 1000;
    const received_product_MT = (received_product_weight * received_avg_density) / 1000;

    // --- Hub Diesel Flow Meter & Tank Level Reading (NEW PART) ---

    // Chamber-2
    const flow_meter_reading_before_chamber_2 = num("flow_meter_reading_before_chamber_2");
    const flow_meter_reading_after_chamber_2 = num("flow_meter_reading_after_chamber_2");
    const tank_level_before_chamber_2 = num("tank_level_before_chamber_2");
    const tank_level_after_chamber_2 = num("tank_level_after_chamber_2");

    const decanted_ltr_chamber_2 = flow_meter_reading_after_chamber_2 - flow_meter_reading_before_chamber_2;
    const tank_level_rise_chamber_2 = tank_level_after_chamber_2 - tank_level_before_chamber_2;
    const decanted_litre_converted_chamber_2 = tank_level_rise_chamber_2 * 38250;
    const diff_decanted_ltr_minus_product_recieved_quantitiy_chamber_2 =
      decanted_ltr_chamber_2 - qtyLtrReceipt[1];
    const diff_decanted_ltr_converterted_minus_product_recieved_quantity_chamber_2 =
      decanted_litre_converted_chamber_2 - qtyLtrReceipt[1];

    // Chamber-1
    const flow_meter_reading_after_chamber_1 = num("flow_meter_reading_after_chamber_1");
    const flow_meter_reading_before_chamber_1 = flow_meter_reading_after_chamber_2;
    const tank_level_after_chamber_1 = num("tank_level_after_chamber_1");
    const tank_level_before_chamber_1 = tank_level_after_chamber_2;

    const decanted_ltr_chamber_1 = flow_meter_reading_after_chamber_1 - flow_meter_reading_before_chamber_1;
    const tank_level_rise_chamber_1 = tank_level_after_chamber_1 - tank_level_before_chamber_1;
    const decanted_litre_converted_chamber_1 = tank_level_rise_chamber_1 * 38250;
    const diff_decanted_ltr_minus_product_recieved_quantitiy_chamber_1 =
      decanted_ltr_chamber_1 - qtyLtrReceipt[0];
    const diff_decanted_ltr_converterted_minus_product_recieved_quantity_chamber_1 =
      decanted_litre_converted_chamber_1 - qtyLtrReceipt[0];

    // Final Difference from Flow meter readings
    const reading_after_tanker_decanting = flow_meter_reading_after_chamber_1;
    const reading_before_tanker_decanting = flow_meter_reading_before_chamber_2;
    const total_volume_recived_by_flow_meter =
      reading_after_tanker_decanting - reading_before_tanker_decanting;
    const diff_Flow_meter_reading = total_volume_recived_by_flow_meter - Natural_Receipt_QTY_Ltr;

    // Diesel Tank Level
    const tank_level_after_tanker_decanting = tank_level_after_chamber_1;
    const tank_level_before_tanker_decanting = tank_level_before_chamber_2;
    const LOFO_tanker_rise_after_tanker_decanting =
      tank_level_after_tanker_decanting - tank_level_before_tanker_decanting;
    const LOFO_converted = LOFO_tanker_rise_after_tanker_decanting * 38250;
    const Deisel_tank_level_difference = LOFO_converted - Natural_Receipt_QTY_Ltr;

    // --- PDF ---
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("jsPDF failed to load. Check the script URLs.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- Header ---
    doc.setFontSize(10);
    const headerRows = [
      ["Supplier", supplier, "Date", date],
      ["Tanker No.", tankerNumber, "Chambers", String(No_Of_Chambers)],
      ["Tanker Cal. Cert. No.", tankerCertNum, "Cal. Validity Date", calValidityDate],
      ["Ordered Qty @85°F (L)", ordered_quantity.toFixed(2), "", ""],
    ];
    doc.autoTable({
      startY: 10,
      head: [["Field", "Value", "Field", "Value"]],
      body: headerRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    // --- Dispatch ---
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

    // --- Receipt ---
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

    // --- Weighbridge ---
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

    // --- 85°F Calc ---
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

    // ------------------------- PAGE 2 -------------------------
    doc.addPage();

    // 1) CHAMBER-2
    doc.setFontSize(12);
    doc.text("Hub Diesel Flow Meter & Tank Level Reading - Chamber 2", 14, 20);

    doc.autoTable({
      startY: 23, // tighter
      head: [["Description", "Value"]],
      body: [
        ["Flow Meter reading Before Tanker decanting", flow_meter_reading_before_chamber_2.toFixed(2)],
        ["Flow Meter reading After Tanker decanting", flow_meter_reading_after_chamber_2.toFixed(2)],
        ["Tank Level before Tanker decanting", tank_level_before_chamber_2.toFixed(2)],
        ["Tank Level after Tanker decanting", tank_level_after_chamber_2.toFixed(2)],
        ["Decanted Ltr from flow meter", decanted_ltr_chamber_2.toFixed(2)],
        ["TK Level rise", tank_level_rise_chamber_2.toFixed(2)],
        ["Decanted Ltr from tank level", decanted_litre_converted_chamber_2.toFixed(2)],
        ["Diff:", diff_decanted_ltr_minus_product_recieved_quantitiy_chamber_2.toFixed(2)],
        ["Final Difference", diff_decanted_ltr_converterted_minus_product_recieved_quantity_chamber_2.toFixed(2)],
      ],
      styles: { fontSize: 9, cellPadding: 1 }, // compress rows a bit
      headStyles: { fillColor: [102, 126, 234] },
    });

    // 2) CHAMBER-1
    doc.setFontSize(12);
    doc.text("Hub Diesel Flow Meter & Tank Level Reading - Chamber 1", 14, doc.lastAutoTable.finalY + 6);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Description", "Value"]],
      body: [
        ["Flow Meter reading Before Tanker decanting", flow_meter_reading_before_chamber_1.toFixed(2)],
        ["Flow Meter reading After Tanker decanting", flow_meter_reading_after_chamber_1.toFixed(2)],
        ["Tank Level before Tanker decanting", tank_level_before_chamber_1.toFixed(2)],
        ["Tank Level after Tanker decanting", tank_level_after_chamber_1.toFixed(2)],
        ["Decanted Ltr from flow meter", decanted_ltr_chamber_1.toFixed(2)],
        ["TK Level rise", tank_level_rise_chamber_1.toFixed(2)],
        ["Decanted Ltr from tank level", decanted_litre_converted_chamber_1.toFixed(2)],
        ["Diff:", diff_decanted_ltr_minus_product_recieved_quantitiy_chamber_1.toFixed(2)],
        ["Final Difference", diff_decanted_ltr_converterted_minus_product_recieved_quantity_chamber_1.toFixed(2)],
      ],
      styles: { fontSize: 9, cellPadding: 1 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    // 3) Final difference (Flow meter)
    doc.setFontSize(12);
    doc.text("Final Difference by Flow Meter", 14, doc.lastAutoTable.finalY + 6);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Description", "Value"]],
      body: [
        ["Reading after Tanker decanting", reading_after_tanker_decanting.toFixed(2)],
        ["Reading before Tanker decanting", reading_before_tanker_decanting.toFixed(2)],
        ["Total Volume Received by Flow Meter", total_volume_recived_by_flow_meter.toFixed(2)],
        ["Product Received by Dip Method", Natural_Receipt_QTY_Ltr.toFixed(2)],
        ["Difference", diff_Flow_meter_reading.toFixed(2)],
      ],
      styles: { fontSize: 9, cellPadding: 1 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    // 4) Diesel Tank Level Difference
    doc.setFontSize(12);
    doc.text("Diesel Tank Level Difference", 14, doc.lastAutoTable.finalY + 6);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Description", "Value"]],
      body: [
        ["Tank Level after Tanker decanting", tank_level_after_tanker_decanting.toFixed(2)],
        ["Tank Level before Tanker decanting", tank_level_before_tanker_decanting.toFixed(2)],
        ["LOFO Tank Rise", LOFO_tanker_rise_after_tanker_decanting.toFixed(2)],
        ["LOFO Converted", LOFO_converted.toFixed(2)],
        ["Product Received by Dip Method", Natural_Receipt_QTY_Ltr.toFixed(2)],
        ["Difference", Deisel_tank_level_difference.toFixed(2)],
      ],
      styles: { fontSize: 9, cellPadding: 1 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    doc.save("HSD_Report.pdf");
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
}
