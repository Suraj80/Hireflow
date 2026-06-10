const PDFDocument = require("pdfkit");

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "Not set");

const formatMoney = (amount, currency) =>
  amount === null || typeof amount === "undefined" ? "Not listed" : `${currency} ${Number(amount).toLocaleString()}`;

const decodeEntities = (text) =>
  text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const htmlToPlainText = (html = "") =>
  decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li>/gi, "- ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
  ).trim();

const slugify = (value) =>
  String(value || "offer")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "offer";

const drawLabelValue = (doc, label, value) => {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value || "Not set");
};

const streamOfferPdf = (res, offer) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: `${offer.title} Offer`,
        Author: offer.companyName || "HireFlow",
        Subject: "Offer Letter",
      },
    });

    const fileName = `${slugify(offer.candidateName)}-${slugify(offer.title)}-offer-v${offer.version}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.on("error", reject);
    doc.on("end", resolve);
    if (typeof res.on === "function") {
      res.on("error", reject);
    }

    doc.pipe(res);

    doc.font("Helvetica-Bold").fontSize(22).text(offer.companyName || "HireFlow");
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(18).text("Offer Letter");
    doc.moveDown(1);

    drawLabelValue(doc, "Candidate", offer.candidateName);
    drawLabelValue(doc, "Role", offer.title);
    drawLabelValue(doc, "Department", offer.department);
    drawLabelValue(doc, "Location", offer.location);
    drawLabelValue(doc, "Status", offer.status);
    drawLabelValue(doc, "Version", `v${offer.version}`);
    drawLabelValue(doc, "Compensation", formatMoney(offer.salaryAmount, offer.currency));
    drawLabelValue(doc, "Bonus", formatMoney(offer.bonusAmount, offer.currency));
    drawLabelValue(doc, "Equity", offer.equity || "Not listed");
    drawLabelValue(doc, "Start date", formatDate(offer.startDate));
    drawLabelValue(doc, "Expires on", formatDate(offer.expiresAt));

    doc.moveDown(1.2);
    doc.font("Helvetica-Bold").fontSize(14).text("Offer details");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(11).text(htmlToPlainText(offer.letterHtml) || "No offer letter content provided.", {
      lineGap: 3,
      align: "left",
    });

    if (offer.notes) {
      doc.moveDown(1);
      doc.font("Helvetica-Bold").fontSize(14).text("Internal notes");
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(11).text(offer.notes, {
        lineGap: 3,
        align: "left",
      });
    }

    doc.end();
  });

module.exports = {
  streamOfferPdf,
};
