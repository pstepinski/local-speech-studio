const form = document.querySelector("#speech-form");
const text = document.querySelector("#text");
const language = document.querySelector("#language");
const counter = document.querySelector("#counter");
const button = document.querySelector("#generate");
const buttonLabel = button.querySelector(".button-label");
const message = document.querySelector("#message");
const result = document.querySelector("#result");
const audio = document.querySelector("#audio");
const playbackRate = document.querySelector("#playback-rate");
const download = document.querySelector("#download");
const serviceStatus = document.querySelector("#service-status");
const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".tab-panel")];
const translate = (key, variables) => window.speechStudioI18n.translate(key, variables);

let ttsOrigin = "/api/tts";
let sttOrigin = "/api/stt";
const sttStatus = document.querySelector("#stt-service-status");
const transcriptionForm = document.querySelector("#transcription-form");
const audioFile = document.querySelector("#audio-file");
const recordButton = document.querySelector("#record-button");
const recordLabel = recordButton.querySelector(".record-label");
const recordingTime = document.querySelector("#recording-time");
const selectedAudioBox = document.querySelector("#selected-audio");
const selectedAudioName = document.querySelector("#selected-audio-name");
const recordingPreview = document.querySelector("#recording-preview");
const transcriptionLanguage = document.querySelector("#transcription-language");
const transcribeButton = document.querySelector("#transcribe");
const transcriptionMessage = document.querySelector("#transcription-message");
const transcriptionResult = document.querySelector("#transcription-result");
const transcriptionText = document.querySelector("#transcription-text");
const copyTranscription = document.querySelector("#copy-transcription");
const ttsDocsLink = document.querySelector("#tts-docs-link");
const sttDocsLink = document.querySelector("#stt-docs-link");

let audioUrl;
let selectedAudio;
let selectedAudioUrl;
let mediaRecorder;
let microphoneStream;
let recordingChunks = [];
let recordingTimer;
let recordingStartedAt;
let ttsRetryTimer;
let sttRetryTimer;

function updateCounter() {
  counter.textContent = `${text.value.length} / 5000`;
}

function setMessage(value, isError = false) {
  message.textContent = value;
  message.classList.toggle("error", isError);
}

function applyPlaybackRate() {
  const rate = Number(playbackRate.value);
  audio.defaultPlaybackRate = rate;
  audio.playbackRate = rate;
  audio.preservesPitch = true;
  audio.webkitPreservesPitch = true;
}

function openTab(selectedTab) {
  tabs.forEach((tab) => {
    const active = tab === selectedTab;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = panel.id !== selectedTab.dataset.panel;
  });
}

function setTranscriptionMessage(value, isError = false) {
  transcriptionMessage.textContent = value;
  transcriptionMessage.classList.toggle("error", isError);
}

function selectAudio(file) {
  selectedAudio = file;
  transcribeButton.disabled = false;
  selectedAudioBox.hidden = false;
  selectedAudioName.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  if (selectedAudioUrl) URL.revokeObjectURL(selectedAudioUrl);
  selectedAudioUrl = URL.createObjectURL(file);
  recordingPreview.src = selectedAudioUrl;
  transcriptionResult.hidden = true;
  setTranscriptionMessage("");
}

async function checkSttHealth() {
  try {
    const response = await fetch(`${sttOrigin}/health`);
    if (!response.ok) throw new Error();
    const data = await response.json();
    sttStatus.className = "status ready";
    sttStatus.lastElementChild.textContent = translate("sttReady", { device: data.device });
    return true;
  } catch {
    sttStatus.className = "status error";
    sttStatus.lastElementChild.textContent = translate("sttUnavailable");
    return false;
  }
}

async function refreshSttStatus() {
  window.clearTimeout(sttRetryTimer);
  if (!(await checkSttHealth())) {
    sttRetryTimer = window.setTimeout(refreshSttStatus, 5000);
  }
}

function updateRecordingClock() {
  const elapsed = Math.floor((Date.now() - recordingStartedAt) / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  recordingTime.textContent = translate("recording", { time: `${minutes}:${seconds}` });
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setTranscriptionMessage(translate("recordingUnsupported"), true);
    return;
  }

  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"]
      .find((type) => MediaRecorder.isTypeSupported(type));
    mediaRecorder = preferredType
      ? new MediaRecorder(microphoneStream, { mimeType: preferredType })
      : new MediaRecorder(microphoneStream);
    recordingChunks = [];
    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) recordingChunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", () => {
      const type = mediaRecorder.mimeType || "audio/webm";
      const extension = type.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(recordingChunks, { type });
      selectAudio(new File([blob], `nagranie-${Date.now()}.${extension}`, { type }));
      microphoneStream.getTracks().forEach((track) => track.stop());
      microphoneStream = undefined;
    });
    mediaRecorder.start(250);
    recordingStartedAt = Date.now();
    updateRecordingClock();
    recordingTimer = window.setInterval(updateRecordingClock, 1000);
    recordButton.classList.add("recording");
    recordLabel.textContent = translate("stopRecording");
    setTranscriptionMessage("");
  } catch {
    setTranscriptionMessage(translate("microphoneDenied"), true);
  }
}

function stopRecording() {
  window.clearInterval(recordingTimer);
  mediaRecorder.stop();
  recordButton.classList.remove("recording");
  recordLabel.textContent = translate("startRecording");
  recordingTime.textContent = translate("recordingFinished");
}

async function checkHealth() {
  try {
    const response = await fetch(`${ttsOrigin}/health`);
    if (!response.ok) throw new Error();
    serviceStatus.className = "status ready";
    serviceStatus.lastElementChild.textContent = translate("modelReady");
    return true;
  } catch {
    serviceStatus.className = "status error";
    serviceStatus.lastElementChild.textContent = translate("serviceUnavailable");
    return false;
  }
}

async function loadLanguages() {
  const selectedLanguage = language.value;
  const names = new Intl.DisplayNames([window.speechStudioI18n.getLanguage()], { type: "language" });
  try {
    const response = await fetch(`${ttsOrigin}/languages`);
    if (!response.ok) return;
    const data = await response.json();
    language.replaceChildren(
      ...data.languages.map((code) => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = `${names.of(code) ?? code} (${code})`;
        option.selected = code === selectedLanguage || (!selectedLanguage && code === "pl");
        return option;
      }),
    );
    return true;
  } catch {
    // Polish and English defaults remain available if this optional call fails.
    return false;
  }
}

async function refreshTtsStatus() {
  window.clearTimeout(ttsRetryTimer);
  const [healthy, languagesLoaded] = await Promise.all([
    checkHealth(),
    loadLanguages(),
  ]);
  if (!healthy || !languagesLoaded) {
    ttsRetryTimer = window.setTimeout(refreshTtsStatus, 5000);
  }
}

text.addEventListener("input", updateCounter);
playbackRate.addEventListener("change", applyPlaybackRate);
audio.addEventListener("loadedmetadata", applyPlaybackRate);
tabs.forEach((tab) => tab.addEventListener("click", () => openTab(tab)));
audioFile.addEventListener("change", () => {
  if (audioFile.files[0]) selectAudio(audioFile.files[0]);
});
recordButton.addEventListener("click", () => {
  if (mediaRecorder?.state === "recording") stopRecording();
  else startRecording();
});
copyTranscription.addEventListener("click", async () => {
  await navigator.clipboard.writeText(transcriptionText.value);
  copyTranscription.textContent = translate("copied");
  window.setTimeout(() => { copyTranscription.textContent = translate("copyText"); }, 1500);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = text.value.trim();
  if (!value) {
    setMessage(translate("enterText"), true);
    text.focus();
    return;
  }

  button.disabled = true;
  buttonLabel.textContent = translate("generating");
  setMessage(translate("modelPreparing"));
  result.hidden = true;

  try {
    const response = await fetch(`${ttsOrigin}/v1/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value, language: language.value }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || translate("generationFailed"));
    }

    const blob = await response.blob();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(blob);
    audio.src = audioUrl;
    applyPlaybackRate();
    download.href = audioUrl;
    download.download = `chatterbox-${language.value}.wav`;
    result.hidden = false;
    setMessage(translate("recordingReadyMessage"));
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    setMessage(error.message || translate("connectionFailed"), true);
  } finally {
    button.disabled = false;
    buttonLabel.textContent = translate("generate");
  }
});

transcriptionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedAudio) {
    setTranscriptionMessage(translate("chooseRecording"), true);
    return;
  }

  transcribeButton.disabled = true;
  transcribeButton.querySelector(".button-label").textContent = translate("transcribing");
  transcriptionResult.hidden = true;
  setTranscriptionMessage(translate("whisperAnalyzing"));

  const data = new FormData();
  data.append("file", selectedAudio, selectedAudio.name);
  data.append("language", transcriptionLanguage.value);

  try {
    const response = await fetch(`${sttOrigin}/v1/transcriptions`, {
      method: "POST",
      body: data,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || translate("transcriptionFailed"));
    }
    const payload = await response.json();
    transcriptionText.value = payload.text;
    transcriptionResult.hidden = false;
    setTranscriptionMessage(translate("transcriptionReady"));
    transcriptionResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    setTranscriptionMessage(error.message || translate("whisperConnectionFailed"), true);
  } finally {
    transcribeButton.disabled = false;
    transcribeButton.querySelector(".button-label").textContent = translate("transcribe");
  }
});

function applyFeatureVisibility(config) {
  const visibility = {
    "tts-tab": config.enable_tts,
    "stt-tab": config.enable_stt,
    "continuous-tab": config.enable_continuous,
  };
  tabs.forEach((tab) => {
    const visible = visibility[tab.id];
    tab.hidden = !visible;
    document.querySelector(`#${tab.dataset.panel}`).hidden = !visible;
  });

  ttsDocsLink.hidden = !config.enable_tts;
  sttDocsLink.hidden = !config.enable_stt;
  const firstVisibleTab = tabs.find((tab) => !tab.hidden);
  if (firstVisibleTab) openTab(firstVisibleTab);
  else document.querySelector(".tabs").hidden = true;
}

async function initializeGui() {
  updateCounter();
  try {
    const response = await fetch("/config");
    if (!response.ok) throw new Error("Brak konfiguracji GUI");
    const config = await response.json();
    ttsOrigin = config.tts_url;
    sttOrigin = config.stt_url;
    window.speechStudioConfig = config;
    applyFeatureVisibility(config);
    ttsDocsLink.href = `${ttsOrigin}/docs`;
    sttDocsLink.href = `${sttOrigin}/docs`;
    if (config.enable_tts) refreshTtsStatus();
    if (config.enable_stt) refreshSttStatus();
    window.dispatchEvent(new CustomEvent("speech-studio-config-ready", { detail: config }));
  } catch {
    setMessage(translate("configFailed"), true);
  }
}

initializeGui();

window.addEventListener("speech-studio-language-change", () => {
  updateCounter();
  if (window.speechStudioConfig?.enable_tts) refreshTtsStatus();
  if (window.speechStudioConfig?.enable_stt) refreshSttStatus();
  if (mediaRecorder?.state !== "recording" && recordingTime.textContent) {
    recordingTime.textContent = selectedAudio ? translate("recordingFinished") : translate("recordingReady");
    recordLabel.textContent = translate("startRecording");
  }
});
