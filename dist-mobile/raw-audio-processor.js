/**
 * Raw Audio Processor for ElevenLabs ConvAI Widget
 * AudioWorklet processor for handling real-time audio processing
 */

class RawAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.sampleRate = options.processorOptions?.sampleRate || 24000;
    this.bufferSize = options.processorOptions?.bufferSize || 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (input.length > 0) {
      const inputChannel = input[0];
      const outputChannel = output[0];

      // Process audio data
      for (let i = 0; i < inputChannel.length; i++) {
        // Store input in buffer
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;

        // Send buffer to main thread when full
        if (this.bufferIndex >= this.bufferSize) {
          this.port.postMessage({
            type: 'audiodata',
            data: new Float32Array(this.buffer)
          });
          this.bufferIndex = 0;
        }

        // Pass through audio
        if (outputChannel) {
          outputChannel[i] = inputChannel[i];
        }
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('raw-audio-processor', RawAudioProcessor);