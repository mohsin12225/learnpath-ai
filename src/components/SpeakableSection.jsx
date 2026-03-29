// src/components/SpeakableSection.jsx
import { useState, useEffect, useRef } from 'react';
import { Volume2, Square } from 'lucide-react';

var globalActiveSection = null;
var globalStopFn = null;

export default function SpeakableSection({ paragraphs, sectionId, sectionType }) {
  var [isSpeaking, setIsSpeaking] = useState(false);
  var [currentSentence, setCurrentSentence] = useState(-1);
  var [supported, setSupported] = useState(true);
  var [allSentences, setAllSentences] = useState([]);
  var [sentenceMap, setSentenceMap] = useState([]);
  var speakingRef = useRef(false);
  var idRef = useRef(sectionId);

  useEffect(function () {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    // Load voices
    window.speechSynthesis.getVoices();
  }, []);

  // Build sentence map from paragraphs
  useEffect(function () {
    var sentences = [];
    var map = []; // { paraIndex, sentenceStart, sentenceEnd }

    for (var p = 0; p < paragraphs.length; p++) {
      var text = paragraphs[p];
      if (!text || typeof text !== 'string') continue;

      var cleaned = text.replace(/\s+/g, ' ').trim();
      var parts = cleaned.split(/(?<=[.!?])\s+/);

      for (var s = 0; s < parts.length; s++) {
        var sentence = parts[s].trim();
        if (sentence.length > 1) {
          sentences.push(sentence);
          map.push({ paraIndex: p, text: sentence });
        }
      }
    }

    setAllSentences(sentences);
    setSentenceMap(map);
  }, [paragraphs]);

  // Cleanup on unmount
  useEffect(function () {
    return function () {
      stopSpeaking();
    };
  }, []);

  // Stop when section changes
  useEffect(function () {
    return function () {
      if (speakingRef.current) {
        stopSpeaking();
      }
    };
  }, [sectionId]);

  function getPreferredVoice() {
    var voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    var preferred = null;
    for (var v = 0; v < voices.length; v++) {
      var voice = voices[v];
      var name = voice.name.toLowerCase();
      if (voice.lang.startsWith('en') && (
        name.indexOf('natural') !== -1 ||
        name.indexOf('enhanced') !== -1 ||
        name.indexOf('samantha') !== -1 ||
        name.indexOf('daniel') !== -1 ||
        name.indexOf('google uk') !== -1 ||
        name.indexOf('google us') !== -1
      )) {
        preferred = voice;
        break;
      }
    }
    if (!preferred) {
      for (var v2 = 0; v2 < voices.length; v2++) {
        if (voices[v2].lang.startsWith('en')) {
          preferred = voices[v2];
          break;
        }
      }
    }
    return preferred;
  }

  function stopSpeaking() {
    speakingRef.current = false;
    setIsSpeaking(false);
    setCurrentSentence(-1);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (globalActiveSection === idRef.current) {
      globalActiveSection = null;
      globalStopFn = null;
    }
  }

  function speakFrom(index) {
    if (!speakingRef.current || index >= allSentences.length) {
      stopSpeaking();
      return;
    }

    setCurrentSentence(index);

    var utterance = new SpeechSynthesisUtterance(allSentences[index]);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1000;

    var voice = getPreferredVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = function () {
      if (!speakingRef.current) return;
      speakFrom(index + 1);
    };

    utterance.onerror = function (e) {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      if (!speakingRef.current) return;
      speakFrom(index + 1);
    };

    window.speechSynthesis.speak(utterance);
  }

  function handleToggle() {
    if (!supported || allSentences.length === 0) return;

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    // Stop any other active section
    if (globalStopFn && globalActiveSection !== idRef.current) {
      globalStopFn();
    }
    window.speechSynthesis.cancel();

    globalActiveSection = idRef.current;
    globalStopFn = stopSpeaking;
    speakingRef.current = true;
    setIsSpeaking(true);

    setTimeout(function () {
      if (speakingRef.current) {
        speakFrom(0);
      }
    }, 100);
  }

  if (!supported) {
    return (
      <div className="section-body">
        {paragraphs.map(function (para, idx) {
          return <p key={idx}>{para}</p>;
        })}
      </div>
    );
  }

  // Find which paragraph index is currently being spoken
  var activePara = -1;
  var activeText = '';
  if (isSpeaking && currentSentence >= 0 && currentSentence < sentenceMap.length) {
    activePara = sentenceMap[currentSentence].paraIndex;
    activeText = sentenceMap[currentSentence].text;
  }

  return (
    <div className="speakable-section">
      <div className={'section-body' + (sectionType === 'summary' ? ' section-body-takeaways' : '')}>
        {paragraphs.map(function (para, idx) {
          var isActivePara = isSpeaking && idx === activePara;
          var isSpokenPara = isSpeaking && activePara >= 0 && idx < activePara;
          var isTakeaway = sectionType === 'summary';

          if (isTakeaway) {
            return (
              <div
                key={idx}
                className={'takeaway-item' + (isActivePara ? ' speaking-para' : '') + (isSpokenPara ? ' spoken-para' : '')}
              >
                <span className="takeaway-bullet">✓</span>
                <span className="takeaway-text">
                  {isActivePara ? renderHighlightedPara(para, activeText) : para}
                </span>
              </div>
            );
          }

          if (isActivePara) {
            return (
              <p key={idx} className="speaking-para">
                {renderHighlightedPara(para, activeText)}
              </p>
            );
          }

          return (
            <p
              key={idx}
              className={isSpokenPara ? 'spoken-para' : ''}
            >
              {para}
            </p>
          );
        })}
      </div>

      <div className="speech-controls">
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

        {isSpeaking && allSentences.length > 0 && (
          <span className="speech-progress">
            {currentSentence + 1}/{allSentences.length}
          </span>
        )}
      </div>
    </div>
  );
}

function renderHighlightedPara(fullText, activeSentence) {
  if (!activeSentence || !fullText) return fullText;

  var index = fullText.indexOf(activeSentence);
  if (index === -1) {
    // Try partial match (first 30 chars)
    var partial = activeSentence.substring(0, 30);
    index = fullText.indexOf(partial);
    if (index === -1) {
      return <span className="highlight-sentence">{fullText}</span>;
    }
    // Highlight from partial match to end of sentence
    var before = fullText.substring(0, index);
    var rest = fullText.substring(index);
    return (
      <>
        {before && <span>{before}</span>}
        <span className="highlight-sentence">{rest}</span>
      </>
    );
  }

  var beforeText = fullText.substring(0, index);
  var highlightText = fullText.substring(index, index + activeSentence.length);
  var afterText = fullText.substring(index + activeSentence.length);

  return (
    <>
      {beforeText && <span className="spoken-text">{beforeText}</span>}
      <span className="highlight-sentence">{highlightText}</span>
      {afterText && <span>{afterText}</span>}
    </>
  );
}