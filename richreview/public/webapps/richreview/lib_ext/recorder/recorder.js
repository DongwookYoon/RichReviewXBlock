(function(window){
    'use strict';

    var WORKER_PATH = 'lib_ext/recorder/recorderWorker.js';
    var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || r2.audioRecorder.RECORDER_BUFFER_LEN;
    this.context = source.context;
    this.node = (
            this.context.createScriptProcessor ||
            this.context.createJavaScriptNode
        ).call(this.context, bufferLen, 1, 1);
    var worker = new Worker(config.workerPath || WORKER_PATH);
    r2.audioRecorder.RECORDER_SOURCE_SAMPLE_RATE = this.context.sampleRate;
    r2.audioRecorder.RECORDER_SAMPLE_RATE = r2.audioRecorder.RECORDER_SOURCE_SAMPLE_RATE > 22050? r2.audioRecorder.RECORDER_SOURCE_SAMPLE_RATE/2 : r2.audioRecorder.RECORDER_SOURCE_SAMPLE_RATE;
    worker.postMessage({
        command: 'init',
        config: {
            sampleRate: r2.audioRecorder.RECORDER_SAMPLE_RATE//this.context.sampleRate
        }
    });
    var recording = false,
    currCallback;

    this.node.onaudioprocess = function(e){
        if (!recording) return;
        var chunkData = e.inputBuffer.getChannelData(0);
        worker.postMessage({
            command: 'record',
            buffer: [
            chunkData
            //e.inputBuffer.getChannelData(1)
            ]
        });
        if (r2.audioRecorder.liveRecording) {
            currCallback = r2.audioRecorder.onAudio || config.callback;
            if (!currCallback) throw new Error('Callback not set');
            worker.postMessage({
                command: 'exportChunk',
                buffer: new Float32Array(chunkData)
            });
        }
    };

    this.configure = function(cfg){
        for (var prop in cfg){
            if (cfg.hasOwnProperty(prop)){
                config[prop] = cfg[prop];
            }
        }
    };

    this.record = function(){
        recording = true;
    };

    this.stop = function(){
        recording = false;
    };

    this.clear = function(){
        worker.postMessage({ command: 'clear' });
    };

    this.getBuffer = function(cb) {
        currCallback = cb || config.callback;
        cb(null);
        //worker.postMessage({ command: 'getBuffer' })
    };

    this.getDbs = function(cb) {
        currCallback = cb || config.callback;
        worker.postMessage({ command: 'getDbs' })
    };

    this.exportWAV = function(cb, type){
        currCallback = cb || config.callback;
        type = type || config.type || 'audio/wav';
        if (!currCallback) throw new Error('Callback not set');
        worker.postMessage({
            command: 'exportWAV',
            type: type
        });
    };

    this.parseWav = function(wav) {
        function readInt(i, bytes) {
            var ret = 0,
            shft = 0;
            while (bytes) {
                ret += wav[i] << shft;
                shft += 8;
                i++;
                bytes--;
            }
            return ret;
        }
        if (readInt(20, 2) != 1) throw 'Invalid compression code, not PCM';
        if (readInt(22, 2) != 1) throw 'Invalid number of channels, not 1';
        return {
        sampleRate: readInt(24, 4),
        bitsPerSample: readInt(34, 2),
        samples: wav.subarray(44)
        };
    };

    worker.onmessage = function(e){
        var blob = e.data.blob;
        var buffer = e.data.buffer;
        if (blob) {
            currCallback(blob, buffer);
        }
        else {
            currCallback(e.data);
        }
    };

    source.connect(this.node);
    this.node.connect(this.context.destination);    //this should not be necessary
    };

    Recorder.forceDownload = function(blob, filename){
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = window.document.createElement('a');
    link.href = url;
    link.download = filename || 'output.wav';
    var click = document.createEvent("Event");
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
    };

    window.Recorder = Recorder;

})(window);
