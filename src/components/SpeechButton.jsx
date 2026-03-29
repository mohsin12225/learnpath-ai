// src/components/SpeechButton.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, Square } from 'lucide-react';

// Global tracker — only one speech at a time across all buttons
var globalSpeakingId = null;
var globalStopCallback = null;

export default function SpeechButton({ text, sectionId }) {
  var [isSpeaking, setIsSpeaking] = useState(false);
  var [currentSentence, setCurrentSentence] = useState(-1);
  var [supported, setSupported] = useState(true);
  var utterancesRef = useRef([]);
  var sentenceIndexRef = useRef(0);
  var speakingRef = useRef(false);
  var instanceId = useRef(sectionId + '-' + Math.random().toString(36).substr(2, 9));

  // Check if SpeechSynthesis is supported
  useEffect(function () {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setSupported(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(function () {
    return function () {
      stopSpeaking();
    };
  }, []);

  // Listen for global stop events (when another button starts)
  useEffect(function () {
    function handleGlobalStop() {
      if (globalSpeakingId !== instanceId.current && speakingRef.current) {
        forceStop();
      }
    }

    window.addEventListener('speech-stop-others', handleGlobalStop);
    return function () {
      window.removeEventListener('speech-stop-others', handleGlobalStop);
    };
  }, []);

  function splitIntoSentences(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];

    // Clean up the text
    var cleaned = rawText
      .replace(/\n+/g, '. ')
      .replace(/•/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    // Split by sentence-ending punctuation
    var parts = cleaned.split(/(?<=[.!?])\s+/);
    var sentences = [];

    for (var i = 0; i < parts.length; i++) {
      var s = parts[i].trim();
      if (s.length > 2) {
        sentences.push(s);
      }
    }

    return sentences.length > 0 ? sentences : [cleaned];
  }

  function forceStop() {
    speakingRef.current = false;
    setIsSpeaking(false);
    setCurrentSentence(-1);
    utterancesRef.current = [];

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function stopSpeaking() {
    if (globalSpeakingId === instanceId.current) {
      globalSpeakingId = null;
    }
    forceStop();
  }

  function speakSentences(sentences, startIndex) {
    if (!speakingRef.current || startIndex >= sentences.length) {
      // Done speaking
      setIsSpeaking(false);
      setCurrentSentence(-1);
      speakingRef.current = false;
      globalSpeakingId = null;
      return;
    }

    var utterance = new SpeechSynthesisUtterance(sentences[startIndex]);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to pick a good voice
    var voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Prefer natural/enhanced English voices
      var preferred = null;
      for (var v = 0; v < voices.length; v++) {
        var voice = voices[v];
        var name = voice.name.toLowerCase();
        if (voice.lang.startsWith('en') && (
          name.indexOf('natural') !== -1 ||
          name.indexOf('enhanced') !== -1 ||
          name.indexOf('samantha') !== -1 ||
          name.indexOf('daniel') !== -1 ||
          name.indexOf('google') !== -1
        )) {
          preferred = voice;
          break;
        }
      }
      if (!preferred) {
        // Fallback to any English voice
        for (var v2 = 0; v2 < voices.length; v2++) {
          if (voices[v2].lang.startsWith('en')) {
            preferred = voices[v2];
            break;
          }
        }
      }
      if (preferred) {
        utterance.voice = preferred;
      }
    }

    sentenceIndexRef.current = startIndex;
    setCurrentSentence(startIndex);

    utterance.onend = function () {
      if (!speakingRef.current) return;
      speakSentences(sentences, startIndex + 1);
    };

    utterance.onerror = function (e) {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.error('Speech error:', e.error);
      if (!speakingRef.current) return;
      // Try next sentence on error
      speakSentences(sentences, startIndex + 1);
    };

    window.speechSynthesis.speak(utterance);
  }

  function handleToggle() {
    if (!supported) return;

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    // Stop any other speaking instance
    window.speechSynthesis.cancel();
    globalSpeakingId = instanceId.current;
    window.dispatchEvent(new Event('speech-stop-others'));

    var sentences = splitIntoSentences(text);
    if (sentences.length === 0) return;

    utterancesRef.current = sentences;
    speakingRef.current = true;
    setIsSpeaking(true);
    setCurrentSentence(0);

    // Small delay to let cancel() finish
    setTimeout(function () {
      if (speakingRef.current) {
        speakSentences(sentences, 0);
      }
    }, 100);
  }

  if (!supported) return null;

  return (
    <button
      className={'speech-btn ' + (isSpeaking ? 'speech-btn-active' : '')}
      onClick={handleToggle}
      title={isSpeaking ? 'Stop reading' : 'Read aloud'}
      type="button"
    >
      {isSpeaking ? (
        <Square size={14} />
      ) : (
        <Volume2 size={14} />
      )}
      <span className="speech-btn-label">
        {isSpeaking ? 'Stop' : 'Listen'}
      </span>
    </button>
  );
}

// Export helper to get current sentence for highlighting
export function useSpeechHighlight(sectionId) {
  // This is handled via props in the parent
  return null;
}