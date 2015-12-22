var gm = require('gm');
var chance = new (require('chance'))();

module.exports = function (text, width, height, bg, fg, filetype) {
    text = text || chance.word();
    width = width || 256;
    height = height || 256;
    bg = bg || chance.color({ format: 'hex' });
    fg = fg || chance.color({ format: 'hex' });
    filetype = filetype || 'jpg';

    var fontSize;
    if (width / height > text.length) {
        // text should be laid in landscape mode
        fontSize = Math.floor(height * 0.95);
    } else {
        fontSize = Math.floor(width / text.length * 0.95);
    } 
    
    
    return gm(width, height, bg).font('DejaVuSans')
    .fontSize(fontSize).fill(fg).drawText(0, 0, text, 'center').stream(filetype);
};
