var columnWidths = {"1":2.925,"2":6.15,"3":9.375,"4":12.6,"5":15.825,"6":19.05,"7":22.275,"8":25.5};
var generatedPDFs = [];

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
    var fontSize = 12;
    var padding = canvas.width * 0.1;
    for (var size = 12; size < 500; size += 2) {
        ctx.font = 'bold ' + size + 'px Georgia';
        if (ctx.measureText(text).width > canvas.width - padding * 2) { fontSize = size - 2; break; }
        fontSize = size;
    }
    ctx.font = 'bold ' + fontSize + 'px Georgia';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/jpeg', 1.0);
}

document.getElementById('generateBtn').onclick = function() {
    document.getElementById('error').style.display = 'none';
    var lines = document.getElementById('inputText').value.trim().split('\n');
    if (!lines[0]) { document.getElementById('error').textContent = 'Enter at least one line'; document.getElementById('error').style.display = 'block'; return; }
    generatedPDFs = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line) {
            var parts = line.split('-');
            var dimIndex = -1;
            for (var j = 0; j < parts.length; j++) if (parts[j].includes('X')) { dimIndex = j; break; }
            if (dimIndex < 0) continue;
            var dims = parts[dimIndex].split('X');
            var h = parseFloat(dims[0]);
            var w = columnWidths[dims[1]];
            if (w) generatedPDFs.push({title: line, imageData: createPDF(line, w, h), width: w, height: h});
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
        var btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.textContent = 'Download PDF';
        btn.dataset.index = i;
        btn.onclick = function() {
            var p = generatedPDFs[this.dataset.index];
            var doc = new window.jspdf.jsPDF({orientation: p.width > p.height ? 'landscape' : 'portrait', unit: 'cm', format: [p.width, p.height]});
            doc.addImage(p.imageData, 'JPEG', 0, 0, p.width, p.height);
            doc.save(p.title + '.pdf');
        };
        card.appendChild(btn);
        grid.appendChild(card);
    }
};

document.getElementById('downloadAllBtn').onclick = function() {
    var i = 0;
    function dl() {
        if (i < generatedPDFs.length) {
            var p = generatedPDFs[i];
            var doc = new window.jspdf.jsPDF({orientation: p.width > p.height ? 'landscape' : 'portrait', unit: 'cm', format: [p.width, p.height]});
            doc.addImage(p.imageData, 'JPEG', 0, 0, p.width, p.height);
            doc.save(p.title + '.pdf');
            i++;
            setTimeout(dl, 500);
        }
    }
    dl();
};
