var columnWidths = {"1":2.925,"2":6.15,"3":9.375,"4":12.6,"5":15.825,"6":19.05,"7":22.275,"8":25.5};
var generatedPDFs = [];

function wrapText(text, maxWidth, ctx) {
    var lines = [];
    var currentLine = '';
    
    for (var i = 0; i < text.length; i++) {
        var testLine = currentLine + text[i];
        var metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = text[i];
        } else {
            currentLine = testLine;
        }
    }
    
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    
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
    
    var padding = canvas.width * 0.1;
    var maxWidth = canvas.width - padding * 2;
    var maxHeight = canvas.height - padding * 2;
    var fontSize = 12;
    var lines = [];
    var lineHeight = 1.2;
    
    for (var size = 12; size < 500; size += 2) {
        ctx.font = 'bold ' + size + 'px Arial, sans-serif';
        lines = wrapText(text, maxWidth, ctx);
        var totalHeight = lines.length * size * lineHeight;
        
        if (lines.length > 1) {
            var firstLineWidth = ctx.measureText(lines[0]).width;
            if (firstLineWidth > maxWidth) {
                fontSize = size - 2;
                ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
                lines = wrapText(text, maxWidth, ctx);
                break;
            }
        }
        
        if (totalHeight > maxHeight) {
            fontSize = size - 2;
            ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
            lines = wrapText(text, maxWidth, ctx);
            break;
        }
        fontSize = size;
    }
    
    ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
    var totalTextHeight = lines.length * fontSize * lineHeight;
    var startY = (canvas.height - totalTextHeight) / 2 + fontSize * 0.8;
    
    for (var i = 0; i < lines.length; i++) {
        var yPos = startY + i * fontSize * lineHeight;
        ctx.fillText(lines[i], canvas.width / 2, yPos);
    }
    
    return canvas.toDataURL('image/jpeg', 1.0);
}

function generatePDFBlob(pdf) {
    var doc = new window.jspdf.jsPDF({
        orientation: pdf.width > pdf.height ? 'landscape' : 'portrait',
        unit: 'cm',
        format: [pdf.width, pdf.height]
    });
    doc.addImage(pdf.imageData, 'JPEG', 0, 0, pdf.width, pdf.height);
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
                var w = columnWidths[dims[1]];
                if (w) {
                    generatedPDFs.push({
                        title: line, 
                        imageData: createPDF(line, w, h), 
                        width: w, 
                        height: h
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
            card.innerHTML = '<h3>' + pdf.title + '</h3><p>' + pdf.height + ' cm x ' + pdf.width + ' cm</p><div class="pdf-preview"><img src="' + pdf.imageData + '"></div>';
            var btnDownload = document.createElement('button');
            btnDownload.className = 'btn-primary';
            btnDownload.textContent = 'Download PDF';
            btnDownload.dataset.index = i;
            btnDownload.onclick = function() {
                var p = generatedPDFs[this.dataset.index];
                var doc = new window.jspdf.jsPDF({
                    orientation: p.width > p.height ? 'landscape' : 'portrait', 
                    unit: 'cm', 
                    format: [p.width, p.height]
                });
                doc.addImage(p.imageData, 'JPEG', 0, 0, p.width, p.height);
                doc.save(p.title + '.pdf');
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
            var doc = new window.jspdf.jsPDF({
                orientation: p.width > p.height ? 'landscape' : 'portrait', 
                unit: 'cm', 
                format: [p.width, p.height]
            });
            doc.addImage(p.imageData, 'JPEG', 0, 0, p.width, p.height);
            doc.save(p.title + '.pdf');
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
