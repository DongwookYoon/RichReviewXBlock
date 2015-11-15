var recLength = 0,
  recBuffersL = [],
  recBuffersR = [],
  sampleRate;

this.onmessage = function(e){
  switch(e.data.command){
    case 'init':
      init(e.data.config);
      break;
    case 'record':
      record(e.data.buffer);
      break;
    case 'exportWAV':
      exportWAV(e.data.type);
      break;
    case 'exportChunk':
        exportChunk(e.data.buffer);
        break;
    case 'getBuffer':
      getBuffer();
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
  sampleRate = config.sampleRate;
}

function record(inputBuffer){
  recBuffersL.push(inputBuffer[0]);
  //recBuffersR.push(inputBuffer[1]);
  recLength += inputBuffer[0].length;
  //console.log(recBuffersL);
}

function exportWAV(type){
  var bufferL = mergeBuffers(recBuffersL, recLength);
  var bufferR = mergeBuffers(recBuffersR, recLength);
  var interleaved = interleave(bufferL, bufferR);
  var encodedData = encodeWAV(interleaved);
    var dataview = encodedData.dataView;
    var buffer = new Uint8Array(encodedData.buffer);
  //var dataview = encodeWAV(bufferL);
  var audioBlob = new Blob([dataview], { type: type });
  this.postMessage({blob: audioBlob, buffer: buffer});
}

/**
 * exportChunk is for converting intermediate samples of audio into blobs - in L16 format.
 * @param samples - an array of floating-point sound data
 */
function exportChunk(samples) {
  //console.log(samples);
  var buffer = new ArrayBuffer(samples.length * 2);
  var view = new DataView(buffer);

  floatTo16BitPCM(view, 0, samples);
  //var audioBlob = new Blob([view], { type: "audio/l16" });
  this.postMessage({blob: buffer});
}


function getBuffer() {
  var buffers = [];
  buffers.push( mergeBuffers(recBuffersL, recLength) );
  //buffers.push( mergeBuffers(recBuffersR, recLength) );
  this.postMessage(buffers);
}


var rootMeanSquare = function (l, bgn, end){
  var i = bgn;
  var accum = 0;
  while(i < end){
    accum += l[i]*l[i];
    i++
  }
  return Math.sqrt(accum/ (end-bgn));
};

function getDbs() {
   var buffers = [];
   if(recBuffersL.length){
     var arr = new Float32Array(recBuffersL[recBuffersL.length-1].length);
     arr.set(recBuffersL[recBuffersL.length-1], 0);
     buffers.push(rootMeanSquare(arr, arr.length-512, arr.length));
   }
  else{
     buffers.push(0);
   }
   this.postMessage(buffers);
}

function clear(){
  recLength = 0;
  recBuffersL = [];
  recBuffersR = [];
}

function mergeBuffers(recBuffers, recLength){
  var result = new Float32Array(recLength);
  var offset = 0;
  for (var i = 0; i < recBuffers.length; i++){
    result.set(recBuffers[i], offset);
    offset += recBuffers[i].length;
  }
  return result;
}

function interleave(inputL, inputR){
  var length = inputL.length/2;// + inputR.length;
  var result = new Float32Array(length);

  var index = 0,
    inputIndex = 0;

  while (index < length){
    result[index++] = 0.25*(inputL[inputIndex])+0.25*(inputL[inputIndex+1]);
    //result[index++] = inputR[inputIndex];
    inputIndex+=2;
  }
  return result;
}

/* Make sure to pass normalize=false for streaming recordings. Otherwise each chunk of the audio will be
normalized to itself.*/
function floatTo16BitPCM(output, offset, input, normalize){
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
    min = -1.0;
    max = 1.0;
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
  var buffer = new ArrayBuffer(44 + samples.length * 2);
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

  floatTo16BitPCM(view, 44, samples);                     ////****
  //floatTo08BitPCM(view, 44, samples);                     ////****
  return {dataView: view, buffer: buffer};
}
