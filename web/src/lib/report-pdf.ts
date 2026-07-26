/**
 * Generates a real, downloadable text-based PDF (searchable/selectable,
 * small file size) from a consultation report - drawn from structured data
 * via jsPDF directly, not a rasterized screenshot of the page. Includes a
 * textual planetary placement table in place of the SVG chart graphic.
 */
import { jsPDF } from "jspdf";
import type { ReportSession } from "@prisma/client";
import { calculateBirthChart, RASHI_ENGLISH_NAMES } from "@/lib/birth-chart-calculator";

const MARGIN_MM = 18;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;

const SAFFRON: [number, number, number] = [234, 88, 12];
const INK: [number, number, number] = [42, 27, 18];
const CLAY: [number, number, number] = [138, 111, 92];

export function downloadReportPdf(session: ReportSession): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_MM;

  function ensureSpace(lineHeight: number) {
    if (y + lineHeight > PAGE_HEIGHT_MM - MARGIN_MM) {
      doc.addPage();
      y = MARGIN_MM;
    }
  }

  function heading(text: string) {
    ensureSpace(12);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...SAFFRON);
    doc.text(text, MARGIN_MM, y);
    y += 7;
  }

  function paragraph(text: string, options: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) {
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(options.size ?? 10.5);
    doc.setTextColor(...(options.color ?? INK));
    const lines: string[] = doc.splitTextToSize(text, CONTENT_WIDTH_MM);
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, MARGIN_MM, y);
      y += 5.5;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...SAFFRON);
  doc.text("Adi Jyotish Gurus", MARGIN_MM, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...CLAY);
  doc.text("Vedic Consultation Report", MARGIN_MM, y);
  y += 10;

  paragraph(`Seeker: ${session.userName}`, { bold: true });
  paragraph(`Astrologer: ${session.astrologerName} (${session.specialty})`);
  paragraph(`Date of Birth: ${session.dob}    Time of Birth: ${session.tob}`);
  paragraph(`Place of Birth: ${session.pob}`);
  paragraph(`Report Generated: ${new Date(session.createdAt).toLocaleDateString()}`);

  try {
    const chart = calculateBirthChart(session.dob, session.tob);
    heading("Birth Chart - Planetary Placements");
    paragraph(`Ascendant (Lagna): ${RASHI_ENGLISH_NAMES[chart.ascendantSignIndex]}`, { bold: true });
    for (const p of chart.placements) {
      paragraph(`${p.name}: ${RASHI_ENGLISH_NAMES[p.signIndex]} ${p.degreeInSign.toFixed(1)}deg (House ${p.houseNumber})`);
    }
  } catch {
    // Malformed dob/tob (shouldn't happen for a real session) - just skip the chart section.
  }

  heading("Vedic Reading & Kundli Analysis");
  paragraph(session.reportText ?? "Report text unavailable.");

  if (session.followUpQuestion) {
    heading("Follow-Up Question");
    paragraph(session.followUpQuestion, { bold: true });
    paragraph(session.followUpResponse ?? "");
  }

  ensureSpace(14);
  y += 6;
  paragraph(
    "Disclaimer: Adi Jyotish Gurus provides AI-generated consultations for spiritual guidance and entertainment purposes only. This does not constitute licensed financial, legal, or medical advice.",
    { size: 8, color: CLAY }
  );

  const safeAstrologerName = session.astrologerName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${safeAstrologerName}-consultation-${session.id.slice(0, 8)}.pdf`);
}
