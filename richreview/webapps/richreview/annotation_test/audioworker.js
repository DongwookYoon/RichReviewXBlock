/**
 * Created by venkatesh-sivaraman on 7/7/15.
 */

var buffer = [];
var sampleRate = 0;

this.onmessage = function(e){
    switch(e.data.command){
        case 'init':
            init(e.data.config);
            break;
        case 'record':
            record(e.data.buffer, e.data.overlap);
            break;
        case 'exportWAV':
            exportWAV(e.data.type);
            break;
    }
};

function init(config){
    sampleRate = config.sampleRate;
}

function record(inputBuffer, overlap){
    if (!overlap) {
        overlap = 0;
    }
    //buffer.push(inputBuffer[0]);
    var start = 0;
    if (overlap) {
        for (start = 0; start < overlap; start++) {
            buffer[buffer.length - overlap + start] += inputBuffer[0][start];
        }
    }
    for (var i = start; i < inputBuffer[0].length; i++) {
        buffer.push(inputBuffer[0][i]);
    }
}

function exportWAV(type){
    var dataView = encodeWAV(buffer);
    var audioBlob = new Blob([dataView], { type: type });
    this.postMessage(audioBlob);
}

/* Make sure to pass normalize=false for streaming recordings. Otherwise each chunk of the audio will be
 normalized to itself.*/
function floatTo16BitPCM(output, offset, input, normalize){
    if (normalize == undefined) {

    }
    var min, max;
    if (normalize) {
        min = input[0];
        max = input[0];
        for (var i = 0; i < input.length; i++){
            min = Math.min(input[i], min);
            max = Math.max(input[i], max);
        }
    }
    else {
        min = -1.0
        max = 1.0
    }
    for (var i = 0; i < input.length; i++, offset+=2){
        var s = Math.max(-1, Math.min(1, 2*(input[i]-min)/(max-min)-1));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function floatTo08BitPCM(output, offset, input){
    for (var i = 0; i < input.length; i++, offset+=1){
        /*
         var s = Math.max(0, Math.min(255, (input[i]*0.4+0.5) * 255));
         output.setUint8(offset, s );

         */
        var s = Math.max(-1, Math.min(1, input[i]));
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
        s = s/256+128;
        output.setUint8(offset, s, true);
    }
}

function writeString(view, offset, string){
    for (var i = 0; i < string.length; i++){
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * Takes the audio samples and encodes them into a DataView object
 * @param samples
 */
function encodeWAV(samples){

    var buffer = new ArrayBuffer(44 + samples.length);
    //var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);       ////****
    //view.setUint32(4, 36 + samples.length * 1, true);       ////****
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    //view.setUint16(22, 2, true);
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    //view.setUint32(28, sampleRate * 4, true);
    view.setUint32(28, sampleRate * 2, true);               ////****
    //view.setUint32(28, sampleRate * 1, true);               ////****
    /* block align (channel count * bytes per sample) */
    //view.setUint16(32, 4, true);
    view.setUint16(32, 2, true);                            ////****
    //view.setUint16(32, 1, true);                            ////****
    /* bits per sample */
    view.setUint16(34, 16, true);                           ////****
    //view.setUint16(34, 8, true);                           ////****
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);           ////****
    //view.setUint32(40, samples.length * 1, true);           ////****
    var offset = 44;
    for (var i = 0; i < samples.length; i++, offset+=1){
        view.setInt8(offset, samples[i]);
    }
    return view;
}
