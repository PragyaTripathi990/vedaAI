declare module "html2pdf.js" {
  interface Html2PdfOpts {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: Record<string, unknown>;
    pagebreak?: { mode?: string[] };
  }
  interface Html2Pdf {
    set: (opts: Html2PdfOpts) => Html2Pdf;
    from: (el: HTMLElement) => Html2Pdf;
    save: () => Promise<void>;
  }
  const html2pdf: () => Html2Pdf;
  export default html2pdf;
}
