import PDFDocument from "pdfkit";

export const generatePdf = async (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: 50,
                info: {
                    Title: data.title,
                    Author: "Jupiter AI",
                    Creator: "Jupiter AI",
                }
            });

            const chunks = [];

            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", (err) => reject(err));

            doc
                .fontSize(26)
                .font("Times-Bold")
                .fillColor("#1E293B")
                .text(data.title, { align: "center" })
                .moveDown(0.5)
                .fontSize(14)
                .font("Times-Roman")
                .fillColor("#64748B")
                .text(data.subtitle, { align: "center" })
                .moveDown(1);

            data.sections.forEach((section) => {
                doc.fontSize(16)
                    .font("Times-Bold")
                    .fillColor("#1D4ED8")
                    .text(section.heading)
                    .moveDown(0.3)
                    .fontSize(12)
                    .font("Times-Roman")
                    .fillColor("#334155");

                section.points.forEach((point) => {
                    doc.text(`• ${point}`).moveDown(0.15);
                });
                doc.moveDown(0.5);
            });

            doc.end();

        } catch (err) {
            console.log("pdf generation error", err);
            reject(err);
        }
    });
};