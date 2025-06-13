/**
 * An AudioWorkletProcessor that converts float32 audio samples to 16-bit PCM,
 * calculates RMS volume, and posts the data back to the main thread.
 * It also includes a mechanism to stop processing.
 */
class AudioProcessor extends AudioWorkletProcessor {
  
  _isStopped = false;

  constructor(options) {
    super(options);
    this.port.onmessage = (event) => {
      if (event.data === 'stop') {
        this._isStopped = true;
      }
    };
  }

  /**
   * Converts a Float32Array to a 16-bit PCM Int16Array.
   * @param {Float32Array} input - The input audio samples, ranging from -1.0 to 1.0.
   * @returns {Int16Array} The converted 16-bit PCM audio samples.
   */
  floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      // Convert to 16-bit signed integer.
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  process(inputs, outputs, parameters) {
    if (this._isStopped) {
      return false; // Stop processing.
    }

    // We expect one input, with one channel of Float32 samples.
    const input = inputs[0];
    const channel = input[0];

    if (!channel) {
      return true;
    }

    // --- RMS Calculation ---
    let sum = 0;
    for (let i = 0; i < channel.length; i++) {
        sum += channel[i] * channel[i];
    }
    const rms = Math.sqrt(sum / channel.length);

    // --- PCM Conversion ---
    const pcmData = this.floatTo16BitPCM(channel);
    
    // Post the data object back to the main thread.
    this.port.postMessage({ pcmData, rms });

    // Return true to indicate the processor should continue running.
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor); 