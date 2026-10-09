// jsPDF and html2canvas are sizeable libraries only ever needed when someone
// actually exports a PDF, so they're loaded on demand (code-split into their
// own chunk) instead of bloating every page load for every user.
async function loadLibs() {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  return { jsPDF, html2canvas };
}

// Renders one DOM node (already sized to .report-page = 210mm x ~296mm) into a
// single A4 page of the given jsPDF document.
async function addNodeAsPage(html2canvas, pdf, node, isFirst) {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = await html2canvas(node, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pageWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  if (!isFirst) pdf.addPage("a4", "portrait");
  pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
}

// nodes: array of rendered .report-page DOM elements (already in the document,
// e.g. inside an off-screen container). fileName: e.g. "JSS1-First-Term.pdf"
export async function exportNodesToPdf(nodes, fileName) {
  const { jsPDF, html2canvas } = await loadLibs();
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  for (let i = 0; i < nodes.length; i++) {
    await addNodeAsPage(html2canvas, pdf, nodes[i], i === 0);
  }
  pdf.save(fileName);
}
