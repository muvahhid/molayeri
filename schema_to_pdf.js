const fs = require("fs");
const PDFDocument = require("pdfkit");

const schema = JSON.parse(
  fs.readFileSync("firestore_schema.json", "utf-8")
);

const doc = new PDFDocument({ margin: 40 });
doc.pipe(fs.createWriteStream("firestore_schema.pdf"));

doc.fontSize(18).text("Firestore Database Schema", { align: "center" });
doc.moveDown(1.5);

for (const collection in schema) {
  doc.fontSize(15).fillColor("#000").text(`📁 ${collection}`);
  doc.moveDown(0.5);

  const fields = schema[collection];
  for (const field in fields) {
    doc
      .fontSize(11)
      .fillColor("#333")
      .text(`• ${field}: `, { continued: true })
      .fillColor("#666")
      .text(fields[field].join(" | "));
  }

  doc.moveDown(1);
  doc
    .moveTo(doc.x, doc.y)
    .lineTo(550, doc.y)
    .strokeColor("#ddd")
    .stroke();
  doc.moveDown(1);
}

doc.end();
