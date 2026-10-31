(() => {
  const translations = {
    pl: {
      title: "Lokalne studio mowy",
      description: "Lokalne studio mowy: Chatterbox TTS i Whisper STT",
      switchLabel: "Język interfejsu",
      hero: "Tekst i głos.<br>W obie strony.",
      intro: "Lokalna synteza i transkrypcja. Twoje dane nie opuszczają komputera.",
      tabsLabel: "Wybierz narzędzie", ttsTab: "Tekst → mowa", sttTab: "Mowa → tekst", continuousTab: "Nasłuch ciągły",
      newRecording: "Nowe nagranie", narratorText: "Tekst lektora", textPlaceholder: "Wpisz tekst, który chcesz usłyszeć…",
      sampleText: "Cześć! To jest mój lokalny lektor Chatterbox.", language: "Język", polish: "Polski",
      generate: "Generuj nagranie", readySection: "02 / GOTOWE", yourRecording: "Twoje nagranie",
      playbackSpeed: "Prędkość odtwarzania", download: "Pobierz WAV",
      transcriptionSection: "01 / TRANSKRYPCJA", transcriptionHeading: "Zamień nagranie w tekst",
      chooseAudio: "Wybierz plik audio", recordMic: "Nagraj z mikrofonu", recordingReady: "Gotowy do nagrywania",
      startRecording: "Rozpocznij nagrywanie", selectedAudio: "WYBRANE AUDIO", recordingLanguage: "Język nagrania",
      detectAutomatically: "Wykryj automatycznie", transcribe: "Transkrybuj nagranie", recognizedText: "Rozpoznany tekst",
      copyText: "Kopiuj tekst", assistantSection: "01 / ASYSTENT GŁOSOWY", wakeHeading: "Nasłuchuj frazy aktywującej",
      wakePhrase: "FRAZA AKTYWUJĄCA", wakeDescription: "Po rozpoznaniu frazy nagrywanie potrwa do wyraźnej przerwy w mowie. Gotowa wypowiedź zostanie przepisana przez lokalny model Whisper.",
      microphoneLevel: "Poziom mikrofonu", enableContinuous: "Włącz ciągły nasłuch", microphoneOff: "Mikrofon jest wyłączony.",
      lastUtterance: "02 / OSTATNIA WYPOWIEDŹ", lastUtteranceText: "Tekst ostatniej wypowiedzi",
      sttReady: "Whisper gotowy · {device}", sttUnavailable: "Whisper niedostępny", recording: "Nagrywanie {time}",
      recordingUnsupported: "Ta przeglądarka nie obsługuje nagrywania audio.", microphoneDenied: "Nie udało się uzyskać dostępu do mikrofonu.",
      stopRecording: "Zatrzymaj nagrywanie", recordingFinished: "Nagranie zakończone", modelReady: "Model gotowy",
      serviceUnavailable: "Usługa niedostępna", copied: "Skopiowano", enterText: "Wpisz tekst do przeczytania.",
      generating: "Generowanie…", modelPreparing: "Model przygotowuje nagranie. To może chwilę potrwać.", generationFailed: "Nie udało się wygenerować nagrania.",
      recordingReadyMessage: "Nagranie jest gotowe.", connectionFailed: "Nie udało się połączyć z usługą.", chooseRecording: "Wybierz plik lub nagraj dźwięk.",
      transcribing: "Transkrypcja…", whisperAnalyzing: "Whisper analizuje nagranie. To może chwilę potrwać.", transcriptionFailed: "Nie udało się wykonać transkrypcji.",
      transcriptionReady: "Transkrypcja jest gotowa.", whisperConnectionFailed: "Nie udało się połączyć z Whisper.", configFailed: "Nie udało się wczytać konfiguracji GUI.",
      whisperProcessingFailed: "Whisper nie przetworzył nagrania.", wakeDetected: "Fraza wykryta — mów, zakończę po ciszy.", listening: "Nasłuchuję: „{phrase}”",
      wakeDetectionFailed: "Błąd rozpoznawania frazy.", whisperSaving: "Whisper zapisuje wypowiedź…", listeningAgain: "Gotowe — ponownie nasłuchuję: „{phrase}”",
      utteranceFailed: "Nie udało się przepisać wypowiedzi.", continuousUnsupported: "Ta przeglądarka nie obsługuje ciągłego nasłuchu.",
      disableContinuous: "Wyłącz ciągły nasłuch", listeningOff: "Nasłuch wyłączony", wakeConfigFailed: "Nie udało się pobrać frazy aktywującej.",
    },
    en: {
      title: "Local Speech Studio", description: "Local Speech Studio: Chatterbox TTS and Whisper STT", switchLabel: "Interface language",
      hero: "Text and voice.<br>Both ways.", intro: "Local synthesis and transcription. Your data never leaves your computer.",
      tabsLabel: "Choose a tool", ttsTab: "Text → speech", sttTab: "Speech → text", continuousTab: "Continuous listening",
      newRecording: "New recording", narratorText: "Narrator text", textPlaceholder: "Enter the text you want to hear…",
      sampleText: "Hello! This is my local Chatterbox narrator.", language: "Language", polish: "Polish",
      generate: "Generate recording", readySection: "02 / READY", yourRecording: "Your recording", playbackSpeed: "Playback speed", download: "Download WAV",
      transcriptionSection: "01 / TRANSCRIPTION", transcriptionHeading: "Turn a recording into text", chooseAudio: "Choose an audio file",
      recordMic: "Record from microphone", recordingReady: "Ready to record", startRecording: "Start recording", selectedAudio: "SELECTED AUDIO",
      recordingLanguage: "Recording language", detectAutomatically: "Detect automatically", transcribe: "Transcribe recording", recognizedText: "Recognized text",
      copyText: "Copy text", assistantSection: "01 / VOICE ASSISTANT", wakeHeading: "Listen for the wake phrase", wakePhrase: "WAKE PHRASE",
      wakeDescription: "After the phrase is recognized, recording continues until a clear pause in speech. The local Whisper model then transcribes the utterance.",
      microphoneLevel: "Microphone level", enableContinuous: "Enable continuous listening", microphoneOff: "The microphone is off.",
      lastUtterance: "02 / LAST UTTERANCE", lastUtteranceText: "Last utterance text",
      sttReady: "Whisper ready · {device}", sttUnavailable: "Whisper unavailable", recording: "Recording {time}", recordingUnsupported: "This browser does not support audio recording.",
      microphoneDenied: "Microphone access failed.", stopRecording: "Stop recording", recordingFinished: "Recording finished", modelReady: "Model ready",
      serviceUnavailable: "Service unavailable", copied: "Copied", enterText: "Enter text to read.", generating: "Generating…",
      modelPreparing: "The model is preparing the recording. This may take a moment.", generationFailed: "The recording could not be generated.",
      recordingReadyMessage: "The recording is ready.", connectionFailed: "Could not connect to the service.", chooseRecording: "Choose a file or record audio.",
      transcribing: "Transcribing…", whisperAnalyzing: "Whisper is analyzing the recording. This may take a moment.", transcriptionFailed: "The transcription could not be completed.",
      transcriptionReady: "The transcription is ready.", whisperConnectionFailed: "Could not connect to Whisper.", configFailed: "Could not load the GUI configuration.",
      whisperProcessingFailed: "Whisper could not process the recording.", wakeDetected: "Wake phrase detected — speak; recording will stop after silence.", listening: "Listening for: “{phrase}”",
      wakeDetectionFailed: "Wake phrase detection failed.", whisperSaving: "Whisper is transcribing the utterance…", listeningAgain: "Done — listening again for: “{phrase}”",
      utteranceFailed: "The utterance could not be transcribed.", continuousUnsupported: "This browser does not support continuous listening.",
      disableContinuous: "Disable continuous listening", listeningOff: "Listening is off", wakeConfigFailed: "Could not load the wake phrase.",
    },
  };

  const bindings = [
    [".hero h1", "hero", "html"], [".intro", "intro"], [".tabs", "tabsLabel", "aria-label"],
    ["#tts-tab", "ttsTab"], ["#stt-tab", "sttTab"], ["#continuous-tab", "continuousTab"],
    ["#studio-heading", "newRecording"], ["label[for='text']", "narratorText"], ["#text", "textPlaceholder", "placeholder"],
    ["label[for='language']", "language"], ["#language option[value='pl']", "polish"], ["#generate .button-label", "generate"],
    ["#result .section-number", "readySection"], ["#result-heading", "yourRecording"], ["label[for='playback-rate']", "playbackSpeed"],
    ["#playback-rate", "playbackSpeed", "aria-label"], ["#download", "download", "leading"],
    ["#stt-panel .studio-header .section-number", "transcriptionSection"], ["#stt-panel .studio-header h2", "transcriptionHeading"],
    [".upload-card strong", "chooseAudio"], [".record-card strong", "recordMic"], ["#recording-time", "recordingReady"],
    ["#record-button .record-label", "startRecording"], ["#selected-audio .section-number", "selectedAudio"],
    ["label[for='transcription-language']", "recordingLanguage"], ["#transcription-language option[value='auto']", "detectAutomatically"],
    ["#transcription-language option[value='pl']", "polish"], ["#transcribe .button-label", "transcribe"],
    ["#transcription-result h2", "recognizedText"], ["#copy-transcription", "copyText"], ["#transcription-text", "recognizedText", "aria-label"],
    ["#continuous-panel .studio-header .section-number", "assistantSection"], ["#continuous-panel .studio-header h2", "wakeHeading"],
    [".wake-copy .section-number", "wakePhrase"], [".wake-copy > p:not(.section-number)", "wakeDescription"], [".audio-meter", "microphoneLevel", "aria-label"],
    ["#continuous-toggle .button-label", "enableContinuous"], ["#continuous-message", "microphoneOff"],
    ["#continuous-result .section-number", "lastUtterance"], ["#continuous-result h2", "recognizedText"], ["#copy-continuous", "copyText"],
    ["#continuous-text", "lastUtteranceText", "aria-label"],
  ];

  let language = localStorage.getItem("speech-studio-language") || (navigator.language.startsWith("pl") ? "pl" : "en");
  if (!translations[language]) language = "en";

  function translate(key, variables = {}) {
    return Object.entries(variables).reduce(
      (value, [name, replacement]) => value.replaceAll(`{${name}}`, replacement),
      translations[language][key] ?? key,
    );
  }

  function applyTranslations() {
    document.documentElement.lang = language;
    document.title = translate("title");
    document.querySelector("meta[name='description']")?.setAttribute("content", translate("description"));
    document.querySelector(".language-switch")?.setAttribute("aria-label", translate("switchLabel"));
    bindings.forEach(([selector, key, property = "text"]) => {
      const element = document.querySelector(selector);
      if (!element) return;
      if (property === "html") element.innerHTML = translate(key);
      else if (property === "placeholder") element.placeholder = translate(key);
      else if (property === "aria-label") element.setAttribute("aria-label", translate(key));
      else if (property === "leading") element.childNodes[0].textContent = `${translate(key)} `;
      else element.textContent = translate(key);
    });
    const textArea = document.querySelector("#text");
    if (textArea && (!textArea.dataset.sampleLanguage || textArea.value === translations[textArea.dataset.sampleLanguage].sampleText)) {
      textArea.value = translate("sampleText");
      textArea.dataset.sampleLanguage = language;
    }
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    });
  }

  function setLanguage(nextLanguage) {
    if (!translations[nextLanguage] || nextLanguage === language) return;
    language = nextLanguage;
    localStorage.setItem("speech-studio-language", language);
    applyTranslations();
    window.dispatchEvent(new CustomEvent("speech-studio-language-change", { detail: { language } }));
  }

  window.speechStudioI18n = { translate, getLanguage: () => language, setLanguage, applyTranslations };
  document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language)));
  applyTranslations();
})();
