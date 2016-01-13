var recLength = 0,
    channel_buffer_list = [],
    sampleRate;

this.onmessage = function(e){
    switch(e.data.command){
        case 'init':
            init(e.data.sample_rate);
            break;
        case 'record':
            record(e.data.channel_buffer);
            break;
        case 'exportWAV':
            exportWAV();
            break;
        case 'exportChunk':
            exportChunk(e.data.channel_buffer);
            break;
        case 'getDbs':
            getDbs();
            break;
        case 'clear':
            clear();
            break;
    }
};

function init(sample_rate){
    sampleRate = sample_rate;
}

function record(channel_buffer){
    channel_buffer_list.push(channel_buffer);
    recLength += channel_buffer.length;
}

function clear(){
    recLength = 0;
    channel_buffer_list = [];
}

function exportWAV(){
    var bufferL = mergeBuffers(channel_buffer_list, recLength);
    var interleaved = interleave(bufferL);
    var encodedData = encodeWAV(interleaved);
    this.postMessage(
        {
            command: 'exportWAV',
            blob: new Blob([encodedData.dataView], { type: 'audio/wav' }),
            buffer: new Uint8Array(encodedData.buffer)
        }
    );
}

function exportChunk(buffer) { // buffer: Float32Array
    var buffer_bytes = new ArrayBuffer(buffer.length * 2);
    var view = new DataView(buffer_bytes);

    floatTo16BitPCM(view, 0, buffer);
    this.postMessage(
        {
            command: 'exportChunk',
            chunk_buffer: buffer_bytes
        }
    );
}

function getDbs() {
    var dbs = [];
    if(channel_buffer_list.length){
        var arr = new Float32Array(channel_buffer_list[channel_buffer_list.length-1].length);
        arr.set(channel_buffer_list[channel_buffer_list.length-1], 0);
        dbs.push(rootMeanSquare(arr, arr.length-1024, arr.length));
    }
    else{
        dbs.push(0);
    }
    this.postMessage(
        {
            command: 'getDbs',
            dbs: dbs
        }
    );
}

var rootMeanSquare = function (l, bgn, end){
    var i = bgn;
    var accum = 0;
    while(i < end){
        accum += l[i]*l[i];
        i+=32;
    }
    return Math.sqrt(accum/ ((end-bgn)/32));
};

function mergeBuffers(buffer_list, recLength){
    var result_buffer = new Float32Array(recLength);
    var offset = 0;
    for (var i = 0; i < buffer_list.length; i++){
        result_buffer.set(buffer_list[i], offset);
        offset += buffer_list[i].length;
    }
    return result_buffer;
}

function interleave(inputL){
    var length = inputL.length/2;
    var result = new Float32Array(length);
    var index = 0, inputIndex = 0;
    while (index < length){
        result[index++] = 0.5*(inputL[inputIndex])+0.5*(inputL[inputIndex+1]);
        inputIndex+=2;
    }
    return result;
}

function floatTo16BitPCM(output, offset, input, normalize){
    var min, max, i;
    if (normalize) {
        min = input[0];
        max = input[0];
        for (i = 0; i < input.length; i++){
            min = Math.min(input[i], min);
            max = Math.max(input[i], max);
        }
    }
    else {
        min = -1.0;
        max = 1.0;
    }
    for (i = 0; i < input.length; i++, offset+=2){
        var s = Math.max(-1, Math.min(1, 2*(input[i]-min)/(max-min)-1));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view, offset, string){
    for (var i = 0; i < string.length; i++){
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function encodeWAV(samples){
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);       ////****
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);               ////****
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);                            ////****
    /* bits per sample */
    view.setUint16(34, 16, true);                           ////****
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);           ////****
    /* data */
    floatTo16BitPCM(view, 44, samples);                     ////****

    return {dataView: view, buffer: buffer};
}
