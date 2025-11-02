var columnWidths = {"1":2.925,"2":6.15,"3":9.375,"4":12.6,"5":15.825,"6":19.05,"7":22.275,"8":25.5};
var fontSizes = {"1":12,"2":18,"3":30,"4":30,"5":30,"6":36,"7":48,"8":48};
var generatedPDFs = [];

function wrapTextAtBreaks(text, maxWidth, ctx) {
    var lines = [];
    var words = text.split('-');
    var currentLine = '';
    
    for (var i = 0; i < words.length; i++) {
        var word = words[i];
        var testLine = currentLine ? currentLine + '-' + word : word;
        var metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

function createPDF(text, width, height, columns) {
    var canvas = document.createElement('canvas');
    canvas.width = width * 37.795;
    canvas.height = height * 37.795;
    var ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    var padding = canvas.width * 0.1;
    var maxWidth = canvas.width - padding * 2;
    var maxHeight = canvas.height - padding * 2;
    var fontSize = fontSizes[String(columns)];
    var lineHeight = 1.3;
    
    ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
    var lines = wrapTextAtBreaks(text, maxWidth, ctx);
    var totalTextHeight = lines.length * fontSize * lineHeight;
    
    var minFontSize = Math.max(fontSize * 0.6, 18);
    
    while (totalTextHeight > maxHeight && fontSize > minFontSize) {
        fontSize = fontSize - 1;
        ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
        lines = wrapTextAtBreaks(text, maxWidth, ctx);
        totalTextHeight = lines.length * fontSize * lineHeight;
    }
    
    ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
    var startY = (canvas.height - totalTextHeight) / 2 + fontSize * 0.8;
    
    for (var i = 0; i < lines.length; i++) {
        var yPos = startY + i * fontSize * lineHeight;
        ctx.fillText(lines[i], canvas.width / 2, yPos);
    }
    
    return {
        imageData: canvas.toDataURL('image/jpeg', 1.0),
        textLines: lines,
        fontSize: fontSize,
        lineHeight: lineHeight
    };
}

function generatePDFBlob(pdf) {
    var doc = new window.jspdf.jsPDF({
        orientation: pdf.width > pdf.height ? 'landscape' : 'portrait',
        unit: 'cm',
        format: [pdf.width, pdf.height]
    });
    
    doc.setFillColor(255, 255, 0);
    doc.rect(0, 0, pdf.width, pdf.height, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    var pdfFontSize = pdf.pdfData.fontSize * 0.75;
    doc.setFontSize(pdfFontSize);
    
    var padding = pdf.width * 0.1;
    var lineHeightCm = pdfFontSize * 0.0353 * pdf.pdfData.lineHeight;
    var totalHeight = pdf.pdfData.textLines.length * lineHeightCm;
    var startY = (pdf.height - totalHeight) / 2 + pdfFontSize * 0.0353 * 0.8;
    
    for (var i = 0; i < pdf.pdfData.textLines.length; i++) {
        var yPos = startY + i * lineHeightCm;
        doc.text(pdf.pdfData.textLines[i], pdf.width / 2, yPos, {align: 'center'});
    }
    
    return doc.output('blob');
}

document.getElementById('generateBtn').onclick = function() {
    document.getElementById('error').style.display = 'none';
    var lines = document.getElementById('inputText').value.trim().split('\n');
    if (!lines[0]) { 
        document.getElementById('error').textContent = 'Enter at least one line'; 
        document.getElementById('error').style.display = 'block'; 
        return; 
    }
    
    this.disabled = true;
    this.textContent = 'Generating...';
    var btn = this;
    
    setTimeout(function() {
        generatedPDFs = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line) {
                var parts = line.split('-');
                var dimIndex = -1;
                for (var j = 0; j < parts.length; j++) {
                    if (parts[j].indexOf('X') > -1) { 
                        dimIndex = j; 
                        break; 
                    }
                }
                if (dimIndex < 0) continue;
                var dims = parts[dimIndex].split('X');
                var h = parseFloat(dims[0]);
                var cols = dims[1];
                var w = columnWidths[cols];
                if (w) {
                    var pdfData = createPDF(line, w, h, cols);
                    generatedPDFs.push({
                        title: line, 
                        imageData: pdfData.imageData,
                        pdfData: pdfData,
                        width: w, 
                        height: h,
                        columns: cols
                    });
                }
            }
        }
        
        var grid = document.getElementById('pdfGrid');
        grid.innerHTML = '';
        document.getElementById('pdfCount').textContent = generatedPDFs.length;
        document.getElementById('results').style.display = 'block';
        
        for (var i = 0; i < generatedPDFs.length; i++) {
            var pdf = generatedPDFs[i];
            var card = document.createElement('div');
            card.className = 'pdf-card';
            card.innerHTML = '<h3>' + pdf.title + '</h3><p>' + pdf.height + ' cm x ' + pdf.width + ' cm (Font: ' + pdf.pdfData.fontSize + 'pt)</p><div class="pdf-preview"><img src="' + pdf.imageData + '"></div>';
            var btnDownload = document.createElement('button');
            btnDownload.className = 'btn-primary';
            btnDownload.textContent = 'Download PDF';
            btnDownload.dataset.index = i;
            btnDownload.onclick = function() {
                var p = generatedPDFs[this.dataset.index];
                var blob = generatePDFBlob(p);
                saveAs(blob, p.title + '.pdf');
            };
            card.appendChild(btnDownload);
            grid.appendChild(card);
        }
        
        btn.disabled = false;
        btn.textContent = 'Generate PDFs';
    }, 100);
};

document.getElementById('downloadAllBtn').onclick = function() {
    var i = 0;
    function dl() {
        if (i < generatedPDFs.length) {
            var p = generatedPDFs[i];
            var blob = generatePDFBlob(p);
            saveAs(blob, p.title + '.pdf');
            i++;
            setTimeout(dl, 500);
        }
    }
    dl();
};

document.getElementById('downloadZipBtn').onclick = function() {
    if (generatedPDFs.length === 0) return;
    
    this.disabled = true;
    this.textContent = 'Creating ZIP...';
    var btn = this;
    
    setTimeout(function() {
        var zip = new JSZip();
        
        for (var i = 0; i < generatedPDFs.length; i++) {
            var pdf = generatedPDFs[i];
            var blob = generatePDFBlob(pdf);
            zip.file(pdf.title + '.pdf', blob);
        }
        
        zip.generateAsync({type: 'blob'}).then(function(content) {
            saveAs(content, 'pdfs-batch.zip');
            btn.disabled = false;
            btn.textContent = 'Download as ZIP';
        });
    }, 100);
};
