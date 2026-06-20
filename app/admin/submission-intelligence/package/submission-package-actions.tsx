"use client";

import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmissionPackageActions({ candidateName }: { candidateName: string }) {
  function exportDocx() {
    const node = document.getElementById("submission-package");
    if (!node) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${candidateName}</title></head><body>${node.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${candidateName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-submission-package.docx`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> PDF / Print</Button>
      <Button variant="outline" onClick={exportDocx}><FileText className="h-4 w-4" /> DOCX Export</Button>
      <Button onClick={() => window.print()}><Download className="h-4 w-4" /> Export Package</Button>
    </div>
  );
}
