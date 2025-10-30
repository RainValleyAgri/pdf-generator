import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";
import { saveAs } from "https://cdn.jsdelivr.net/npm/file-saver@2.0.5/+esm";

var columnWidths = {"1":2.925,"2":6.15,"3":9.375,"4":12.6,"5":15.825,"6":19.05,"7":22.275,"8":25.5};
var generatedPDFs = [];

// Hyphen-aware wrapping
function wrapHyphenText(ctx, text, maxWidth) {
    const parts = text.split('-');
    let lines = [];
    let current = parts[0];

    for (let i = 1; i < parts.length; i++) {
        const test = current + '-' + parts[i];
        if (ctx.measureText(test).width <= maxWidth) {
            current = test;
        } else {
            lines.push(current);
            current = parts[i];
        }
    }
    lines.push(current);
    return lines;
}

function createPDF(text, width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = width * 37.795;
    canvas.height = height * 37.795;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let fontSize = Math.min(canvas.width, canvas.height) / 6;
    let fontFamily = '"Open Sans Condensed", "Arial Narrow", Arial, Helvetica, sans-serif';
    ctx.font = `700 ${fontSize}px ${fontFamily}`;

    let maxWidth = canvas.width * 0.9;
    let lines = wrapHyphenText(ctx, text, maxWidth);

    while (lines.some(line => ctx.measureText(line).width > maxWidth) && fontSize > 10) {
        fontSize -= 2;
        ctx.font = `700 ${fontSize}px ${fontFamily}`;
        lines = wrapHyphenText(ctx, text, maxWidth);
    }

    let lineHeight = fontSize * 1.2;
    let totalHeight = lineHeight * lines.length;
    let startY = (canvas.height - totalHeight) / 2 + fontSize / 2;

    lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
    });

    return canvas.toDataURL('image/jpeg', 1.0);
}

document.getElementById('generateBtn').onclick = function() {
    document.getElementById('error').style.display = 'none';

    var lines = document.getElementById('inputText').value.trim().split('\n');
    if (!lines[0]) {
        document.getElementById('error').textContent = 'Enter at least one line';
        document.getElementById('error').style.display = 'block';
        return;
    }

    generatedPDFs = [];

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        var match = line.match(/(\d+)X(\d+)/);
        if (!match) return;

        var h = parseFloat(match[1]);
        var w = columnWidths[match[2]];
        if (!w) return;

        generatedPDFs.push({
            title: line,
            imageData: createPDF(line, w, h),
            width: w,
            height: h
        });
    });

    document.getElementById('pdfCount').textContent = generatedPDFs.length;
    document.getElementById('results').style.display = 'block';

    var grid = document.getElementById('pdfGrid');
    grid.innerHTML = '';

    generatedPDFs.forEach((pdf, index) => {
        var card = document.createElement('div');
        card.className = 'pdf-card';
        card.innerHTML = `
            <h3>${pdf.title}</h3>
            <p>${pdf.height} cm x ${pdf.width} cm</p>
            <div class="pdf-preview"><img src="${pdf.imageData}"></div>
        `;
        var btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.textContent = 'Download PDF';
        btn.onclick = function() {
            var p = generatedPDFs[index];
            var doc = new window.jspdf.jsPDF({
                orientation: p.width > p.height ? 'landscape' : 'portrait',
                unit: 'cm',
                format: [p.width, p.height]
            });
            doc.addImage(p.imageData, 'JPEG', 0, 0, p.width, p.height);
            doc.save(p.title + '.pdf');
        };
        card.appendChild(btn);
        grid.appendChild(card);
    });
};

// ZIP download (with date)
document.getElementById("downloadAllBtn").onclick = async function () {
    if (generatedPDFs.length === 0) return;

    const zip = new JSZip();
    const dateTag = new Date().toISOString().split('T')[0];
    const zipName = `Rainvalley-Ads-${dateTag}.zip`;

    for (let p of generatedPDFs) {
        const doc = new window.jspdf.jsPDF({
            orientation: p.width > p.height ? "landscape" : "portrait",
            unit: "cm",
            format: [p.width, p.height],
        });
        doc.addImage(p.imageData, "JPEG", 0, 0, p.width, p.height);
        zip.file(p.title + ".pdf", doc.output("blob"));
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, zipName);
};
