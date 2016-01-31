var channel_buffers = [],
    downsample_ratio = 1,
    sample_rate;

this.onmessage = function(e){
    switch(e.data.command){
        case 'init':
            init(e.data.config);
            break;
        case 'recordChannelBuffer':
            recordChannelBuffer(e.data.channel_buffer);
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

function init(config){
    sample_rate = config.sample_rate_dst;
    downsample_ratio = config.downsample_ratio;
}

function recordChannelBuffer(channel_buffer){
    channel_buffers.push(channel_buffer);
}

function clear(){
    channel_buffers = [];
}

function exportWAV(){
    var merged = mergeBuffers(channel_buffers);
    var downsampled = downsample(merged, downsample_ratio);
    var encoded = encodeWAV(downsampled);
    this.postMessage(
        {
            command: 'exportWAV',
            blob: new Blob([encoded.dataView], { type: 'audio/wav' }),
            buffer: new Uint8Array(encoded.buffer)
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
    if(channel_buffers.length){
        var arr = new Float32Array(channel_buffers[channel_buffers.length-1].length);
        arr.set(channel_buffers[channel_buffers.length-1], 0);
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

function mergeBuffers(bufs){
    var total_buf_len = 0;
    var buf_n = bufs.length;
    for(var i = 0; i < buf_n; ++i){
        total_buf_len += bufs[i].length;
    }

    var result_buffer = new Float32Array(total_buf_len);
    var offset = 0;
    for (var i = 0; i < bufs.length; i++){
        result_buffer.set(bufs[i], offset);
        offset += bufs[i].length;
    }
    return result_buffer;
}

function downsample(src, ratio){
    var length = src.length/ratio;
    var dst = new Float32Array(length);
    var idx_dst = 0, idx_src = 0;
    while (idx_dst < length){
        var avg = 0;
        for(var i = 0; i < ratio; ++i){
            avg += src[idx_src+i];
        }
        dst[idx_dst++] = avg/ratio;
        idx_src+=ratio;
    }
    return dst;
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
    view.setUint32(24, sample_rate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sample_rate * 2, true);               ////****
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
