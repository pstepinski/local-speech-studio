let continuousSttOrigin;
const translateContinuous = (key, variables) => window.speechStudioI18n.translate(key, variables);
const wakePhraseElement = document.querySelector("#wake-phrase");
const continuousToggle = document.querySelector("#continuous-toggle");
const continuousToggleLabel = continuousToggle.querySelector(".button-label");
const continuousStatus = document.querySelector("#continuous-service-status");
const continuousMessage = document.querySelector("#continuous-message");
const continuousResult = document.querySelector("#continuous-result");
const continuousText = document.querySelector("#continuous-text");
const copyContinuous = document.querySelector("#copy-continuous");
const wakeOrb = document.querySelector("#wake-orb");
const audioLevel = document.querySelector("#audio-level");

const DETECTION_WINDOW_SECONDS = 2.5;
const SILENCE_MILLISECONDS = 1400;
const SPEECH_RMS_THRESHOLD = 0.012;

let configuredWakePhrase = "OK Studio!";
let continuousStream;
let continuousContext;
let continuousSource;
let continuousProcessor;
let continuousMode = "off";
let detectionBuffers = [];
let detectionSamples = 0;
let detectionHadSpeech = false;
let utteranceBuffers = [];
let detectionInFlight = false;
let wakeDetectedAt = 0;
let lastLoudAt = 0;
let listenSession = 0;
let wakeConfigRetryTimer;

function setContinuousStatus(state, message) {
  continuousStatus.className = `status ${state}`.trim();
  continuousStatus.lastElementChild.textContent = message;
  continuousMessage.textContent = message;
  continuousMessage.classList.toggle("error", state === "error");
  wakeOrb.className = `wake-orb ${state}`.trim();
}

function normalizeWakeText(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pl")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\b(?:okay|okej)\b/gu, "ok")
    .trim();
}

function containsWakePhrase(transcript) {
  return normalizeWakeText(transcript).includes(normalizeWakeText(configuredWakePhrase));
}

function removeWakePhrase(transcript) {
  const words = configuredWakePhrase.match(/\p{L}+/gu) || [];
  if (!words.length) return transcript.trim();
  const escaped = words.map((word) => {
    if (normalizeWakeText(word) === "ok") return "(?:ok|okay|okej)";
    return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  const pattern = new RegExp(
    `^[\\s\\p{P}]*${escaped.join("[\\s\\p{P}]+")}[\\s\\p{P}]*`,
    "iu",
  );
  return transcript.replace(pattern, "").trim();
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeWav(buffers, sampleRate) {
  const length = buffers.reduce((total, buffer) => total + buffer.length, 0);
  const output = new ArrayBuffer(44 + length * 2);
  const view = new DataView(output);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, length * 2, true);

  let offset = 44;
  buffers.forEach((buffer) => {
    buffer.forEach((sample) => {
      const clipped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clipped < 0 ? clipped * 32768 : clipped * 32767, true);
      offset += 2;
    });
  });
  return new Blob([output], { type: "audio/wav" });
}

async function transcribeBlob(blob, language = "auto") {
  const data = new FormData();
  data.append("file", blob, "continuous-listening.wav");
  data.append("language", language);
  const response = await fetch(`${continuousSttOrigin}/v1/transcriptions`, {
    method: "POST",
    body: data,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || translateContinuous("whisperProcessingFailed"));
  }
  return response.json();
}

async function detectWakePhrase(buffers, sampleRate, session) {
  detectionInFlight = true;
  try {
    const payload = await transcribeBlob(encodeWav(buffers, sampleRate), "auto");
    if (session !== listenSession || continuousMode === "off") return;
    if (containsWakePhrase(payload.text)) {
      continuousMode = "capturing";
      wakeDetectedAt = Date.now();
      utteranceBuffers = [...buffers, ...detectionBuffers];
      detectionBuffers = [];
      detectionSamples = 0;
      detectionHadSpeech = false;
      setContinuousStatus("capturing", translateContinuous("wakeDetected"));
    } else {
      setContinuousStatus("ready", translateContinuous("listening", { phrase: configuredWakePhrase }));
    }
  } catch (error) {
    if (session === listenSession && continuousMode !== "off") {
      setContinuousStatus("error", error.message || translateContinuous("wakeDetectionFailed"));
    }
  } finally {
    detectionInFlight = false;
  }
}

async function finishUtterance(session) {
  if (continuousMode !== "capturing") return;
  continuousMode = "transcribing";
  const buffers = utteranceBuffers;
  utteranceBuffers = [];
  setContinuousStatus("capturing", translateContinuous("whisperSaving"));

  try {
    const payload = await transcribeBlob(
      encodeWav(buffers, continuousContext.sampleRate),
      "auto",
    );
    if (session !== listenSession || continuousMode === "off") return;
    const command = removeWakePhrase(payload.text);
    continuousText.value = command || payload.text;
    continuousResult.hidden = false;
    setContinuousStatus("ready", translateContinuous("listeningAgain", { phrase: configuredWakePhrase }));
  } catch (error) {
    if (session === listenSession && continuousMode !== "off") {
      setContinuousStatus("error", error.message || translateContinuous("utteranceFailed"));
    }
  } finally {
    if (session === listenSession && continuousMode !== "off") {
      continuousMode = "listening";
      detectionBuffers = [];
      detectionSamples = 0;
      detectionHadSpeech = false;
    }
  }
}

function processMicrophone(event, session) {
  if (session !== listenSession || continuousMode === "off") return;
  const samples = new Float32Array(event.inputBuffer.getChannelData(0));
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  const rms = Math.sqrt(energy / samples.length);
  audioLevel.style.width = `${Math.min(100, rms * 900)}%`;

  if (rms >= SPEECH_RMS_THRESHOLD) lastLoudAt = Date.now();

  if (continuousMode === "listening") {
    detectionBuffers.push(samples);
    detectionSamples += samples.length;
    detectionHadSpeech ||= rms >= SPEECH_RMS_THRESHOLD;
    if (
      detectionSamples >= continuousContext.sampleRate * DETECTION_WINDOW_SECONDS
      && !detectionInFlight
    ) {
      const windowBuffers = detectionBuffers;
      const shouldTranscribe = detectionHadSpeech;
      detectionBuffers = [];
      detectionSamples = 0;
      detectionHadSpeech = false;
      if (shouldTranscribe) {
        detectWakePhrase(windowBuffers, continuousContext.sampleRate, session);
      }
    }
  } else if (continuousMode === "capturing") {
    utteranceBuffers.push(samples);
    if (
      Date.now() - lastLoudAt >= SILENCE_MILLISECONDS
      && Date.now() - wakeDetectedAt >= 700
    ) {
      finishUtterance(session);
    }
  }
}

async function startContinuousListening() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!navigator.mediaDevices?.getUserMedia || !AudioContextClass) {
    setContinuousStatus("error", translateContinuous("continuousUnsupported"));
    return;
  }
  try {
    continuousStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    continuousContext = new AudioContextClass();
    await continuousContext.resume();
    continuousSource = continuousContext.createMediaStreamSource(continuousStream);
    continuousProcessor = continuousContext.createScriptProcessor(4096, 1, 1);
    const silentGain = continuousContext.createGain();
    silentGain.gain.value = 0;
    continuousSource.connect(continuousProcessor);
    continuousProcessor.connect(silentGain);
    silentGain.connect(continuousContext.destination);

    listenSession += 1;
    const session = listenSession;
    continuousMode = "listening";
    detectionBuffers = [];
    detectionSamples = 0;
    detectionHadSpeech = false;
    lastLoudAt = Date.now();
    continuousProcessor.onaudioprocess = (event) => processMicrophone(event, session);
    continuousToggle.classList.add("recording");
    continuousToggleLabel.textContent = translateContinuous("disableContinuous");
    setContinuousStatus("ready", translateContinuous("listening", { phrase: configuredWakePhrase }));
  } catch {
    setContinuousStatus("error", translateContinuous("microphoneDenied"));
  }
}

async function stopContinuousListening() {
  listenSession += 1;
  continuousMode = "off";
  continuousProcessor?.disconnect();
  continuousSource?.disconnect();
  continuousStream?.getTracks().forEach((track) => track.stop());
  await continuousContext?.close();
  continuousProcessor = undefined;
  continuousSource = undefined;
  continuousStream = undefined;
  detectionBuffers = [];
  utteranceBuffers = [];
  audioLevel.style.width = "0%";
  continuousToggle.classList.remove("recording");
  continuousToggleLabel.textContent = translateContinuous("enableContinuous");
  setContinuousStatus("", translateContinuous("listeningOff"));
}

async function loadWakeConfiguration(config) {
  if (!config.enable_continuous) return;
  window.clearTimeout(wakeConfigRetryTimer);
  continuousSttOrigin = config.stt_url;
  try {
    const response = await fetch(`${continuousSttOrigin}/config`);
    if (!response.ok) throw new Error();
    const config = await response.json();
    configuredWakePhrase = config.wake_phrase;
    wakePhraseElement.textContent = configuredWakePhrase;
  } catch {
    setContinuousStatus("error", translateContinuous("wakeConfigFailed"));
    wakeConfigRetryTimer = window.setTimeout(
      () => loadWakeConfiguration(config),
      5000,
    );
  }
}

continuousToggle.addEventListener("click", () => {
  if (continuousMode === "off") startContinuousListening();
  else stopContinuousListening();
});

copyContinuous.addEventListener("click", async () => {
  await navigator.clipboard.writeText(continuousText.value);
  copyContinuous.textContent = translateContinuous("copied");
  window.setTimeout(() => { copyContinuous.textContent = translateContinuous("copyText"); }, 1500);
});

window.addEventListener("beforeunload", () => {
  continuousStream?.getTracks().forEach((track) => track.stop());
});

window.addEventListener("speech-studio-language-change", () => {
  if (continuousMode === "off") {
    continuousToggleLabel.textContent = translateContinuous("enableContinuous");
    setContinuousStatus("", translateContinuous("listeningOff"));
  } else if (continuousMode === "listening") {
    continuousToggleLabel.textContent = translateContinuous("disableContinuous");
    setContinuousStatus("ready", translateContinuous("listening", { phrase: configuredWakePhrase }));
  }
});

setContinuousStatus("", translateContinuous("listeningOff"));

if (window.speechStudioConfig) {
  loadWakeConfiguration(window.speechStudioConfig);
} else {
  window.addEventListener(
    "speech-studio-config-ready",
    (event) => loadWakeConfiguration(event.detail),
    { once: true },
  );
}
