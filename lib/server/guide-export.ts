import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { guideFoundationCards, guideMenuMap, guideSections, roleMatrix } from "@/lib/data";
import { regulationReferences } from "@/lib/compliance";

function wrapText(text: string, maxChars = 92) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function buildGuideText(baseUrl: string) {
  const lines: string[] = [
    "KAKOR SENTINEL SUPPLY",
    "Panduan Operasional Lengkap",
    "",
    "Ringkasan akses:",
    `Web: ${baseUrl}/panduan`,
    `PDF: ${baseUrl}/api/guide/export?format=pdf`,
    "",
    "FONDASI SISTEM"
  ];

  guideFoundationCards.forEach((item) => {
    lines.push(`${item.title}: ${item.detail}`);
  });

  lines.push("", "PETA MENU");
  guideMenuMap.forEach((item) => {
    lines.push(`${item.menu}: ${item.detail}`);
  });

  lines.push("", "ROLE MATRIX");
  roleMatrix.forEach((item) => {
    lines.push(`${item.role}: ${item.can}`);
  });

  lines.push("", "REGULASI ACUAN");
  regulationReferences.forEach((item) => {
    lines.push(`${item.code}: ${item.title}. Berlaku ${item.effectiveDate}.`);
  });

  lines.push("", "PANDUAN RINCI");
  guideSections.forEach((section) => {
    lines.push("", `${section.title} - ${section.subtitle}`);
    section.content.forEach((paragraph) => lines.push(paragraph));
  });

  return lines.join("\n");
}

export async function createGuidePdfBuffer(baseUrl: string) {
  const pdf = await PDFDocument.create();
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const pageSize: [number, number] = [842, 595];
  const margin = 34;
  const maxWidth = 774;

  let page = pdf.addPage(pageSize);
  let y = 548;

  const addPage = () => {
    page = pdf.addPage(pageSize);
    y = 548;
  };

  const ensureSpace = (heightNeeded: number) => {
    if (y - heightNeeded < 52) {
      addPage();
    }
  };

  const drawParagraph = (text: string, fontSize = 10.5, color = rgb(0.18, 0.24, 0.3)) => {
    const lines = wrapText(text, 108);
    ensureSpace(lines.length * (fontSize + 3) + 8);
    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font: bodyFont,
        color,
        maxWidth
      });
      y -= fontSize + 3;
    }
    y -= 6;
  };

  const drawSectionTitle = (eyebrow: string, title: string) => {
    ensureSpace(40);
    page.drawText(eyebrow.toUpperCase(), {
      x: margin,
      y,
      size: 9,
      font: titleFont,
      color: rgb(0.09, 0.45, 0.52)
    });
    y -= 18;
    page.drawText(title, {
      x: margin,
      y,
      size: 18,
      font: titleFont,
      color: rgb(0.06, 0.16, 0.3)
    });
    y -= 22;
  };

  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageSize[0],
    height: pageSize[1],
    color: rgb(0.99, 0.995, 1)
  });
  page.drawRectangle({
    x: 0,
    y: 512,
    width: pageSize[0],
    height: 83,
    color: rgb(0.05, 0.14, 0.24)
  });
  page.drawText("KAKOR SENTINEL SUPPLY", {
    x: margin,
    y: 545,
    size: 24,
    font: titleFont,
    color: rgb(1, 1, 1)
  });
  page.drawText("Panduan Operasional Lengkap", {
    x: margin,
    y: 520,
    size: 12,
    font: bodyFont,
    color: rgb(0.86, 0.93, 0.99)
  });
  page.drawText(`Web: ${baseUrl}/panduan`, {
    x: 520,
    y: 545,
    size: 9,
    font: bodyFont,
    color: rgb(0.86, 0.93, 0.99)
  });
  page.drawText(`PDF: ${baseUrl}/api/guide/export?format=pdf`, {
    x: 472,
    y: 528,
    size: 9,
    font: bodyFont,
    color: rgb(0.86, 0.93, 0.99)
  });

  y = 480;

  drawSectionTitle("Pengantar", "Mengapa aplikasi ini dibuat");
  drawParagraph(
    "KAKOR SENTINEL SUPPLY dibangun untuk menghilangkan kehilangan obat tanpa jejak, mempercepat transaksi lapangan, dan memastikan setiap pergerakan obat dapat ditelusuri dari penerimaan hingga pemakaian."
  );
  drawParagraph(
    "Aplikasi disusun sebagai web app dan Progressive Web App agar dapat dibuka dari laptop maupun HP, dipakai dengan kamera untuk scan, serta tetap berjalan saat jaringan tidak stabil."
  );

  drawSectionTitle("Fondasi", "Dasar sistem");
  guideFoundationCards.forEach((item) => {
    drawParagraph(`${item.title}. ${item.detail}`, 10.5, rgb(0.2, 0.26, 0.32));
  });

  drawSectionTitle("Peta Menu", "Fungsi tiap menu");
  guideMenuMap.forEach((item) => {
    drawParagraph(`${item.menu}: ${item.detail}`);
  });

  drawSectionTitle("Role Matrix", "Hak akses petugas");
  roleMatrix.forEach((item) => {
    drawParagraph(`${item.role}: ${item.can}`);
  });

  drawSectionTitle("Regulasi", "Standar acuan");
  regulationReferences.forEach((item) => {
    drawParagraph(`${item.code} - ${item.title}. Berlaku ${item.effectiveDate}.`);
  });

  guideSections.forEach((section) => {
    drawSectionTitle(section.subtitle, section.title);
    section.content.forEach((paragraph) => drawParagraph(paragraph));
  });

  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawText(`Halaman ${index + 1} / ${pages.length}`, {
      x: 742,
      y: 22,
      size: 8,
      font: bodyFont,
      color: rgb(0.42, 0.48, 0.54)
    });
  });

  return {
    buffer: Buffer.from(await pdf.save()),
    filename: "panduan-kakor-sentinel-supply.pdf"
  };
}

export function createGuideText(baseUrl: string) {
  return buildGuideText(baseUrl);
}
