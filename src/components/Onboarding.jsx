// src/components/Onboarding.jsx
import { useState } from 'react';
import { useLearning } from '../context/LearningContext';
import {
  GraduationCap,
  Search,
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

const SUGGESTED_TOPICS = [
  { name: 'Python Programming', icon: BookOpen },
  { name: 'Photosynthesis', icon: BookOpen },
  { name: 'World War II', icon: BookOpen },
  { name: 'Calculus', icon: BookOpen },
  { name: 'Machine Learning', icon: BookOpen },
  { name: 'Music Theory', icon: BookOpen },
  { name: 'Organic Chemistry', icon: BookOpen },
  { name: 'Creative Writing', icon: BookOpen },
  { name: 'Astronomy', icon: BookOpen },
  { name: 'Economics', icon: BookOpen },
  { name: 'Human Anatomy', icon: BookOpen },
  { name: 'Philosophy', icon: BookOpen },
];

export default function Onboarding() {
  const { dispatch } = useLearning();
  const [topic, setTopic] = useState('');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  async function handleGenerate() {
    if (!topic.trim()) return setError('Please enter a topic');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/.netlify/functions/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), days }),
      });

      if (!res.ok) throw new Error('Failed to generate plan');
      const plan = await res.json();
      if (plan.error) throw new Error(plan.error);
      dispatch({ type: 'SET_PLAN', payload: plan });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-bg">
        <div className="floating-shape shape-1" />
        <div className="floating-shape shape-2" />
        <div className="floating-shape shape-3" />
        <div className="floating-shape shape-4" />
        <div className="floating-shape shape-5" />
      </div>

      <div className="onboarding-card">
        <div className="onboarding-header">
          <div className="logo-mark">
            <div className="logo-icon">
              <GraduationCap size={28} />
            </div>
            <h1>Learn<span>Path</span></h1>
          </div>
          <p className="tagline">Master any topic with AI-powered lessons</p>
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <h2>What do you want to learn?</h2>

            <div className="topic-input-group">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter any topic..."
                className="topic-input"
                onKeyDown={(e) => e.key === 'Enter' && topic.trim() && setStep(2)}
              />
              <Search className="topic-input-icon" size={20} />
            </div>

            <div className="suggested-topics">
              <p className="suggested-label">Popular topics</p>
              <div className="topic-chips">
                {SUGGESTED_TOPICS.map((t) => (
                  <button
                    key={t.name}
                    className={`topic-chip ${topic === t.name ? 'active' : ''}`}
                    onClick={() => { setTopic(t.name); setStep(2); }}
                  >
                    <t.icon className="chip-icon" size={14} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn-primary btn-lg btn-full"
              disabled={!topic.trim()}
              onClick={() => setStep(2)}
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h2>How many days to learn?</h2>
            <div className="step-topic-badge">
              <BookOpen size={16} /> {topic}
            </div>

            <div className="days-selector">
              <input
                type="range"
                min="3"
                max="30"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="days-slider"
              />
              <div className="days-display">
                <span className="days-number">{days}</span>
                <span className="days-label">days</span>
              </div>
            </div>

            <div className="days-presets">
              {[3, 5, 7, 14, 21, 30].map((d) => (
                <button
                  key={d}
                  className={`preset-btn ${days === d ? 'active' : ''}`}
                  onClick={() => setDays(d)}
                >
                  {d} days
                </button>
              ))}
            </div>

            <div className="plan-preview">
              <div className="preview-item">
                <BookOpen className="preview-icon" size={18} />
                ~{days * 2} lessons
              </div>
              <div className="preview-item">
                <FileText className="preview-icon" size={18} />
                {Math.floor(days / 3) || 1} quizzes + final
              </div>
              <div className="preview-item">
                <Clock className="preview-icon" size={18} />
                ~{days * 20} min total
              </div>
            </div>

            {error && (
              <div className="error-msg">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="step-buttons">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className="btn-primary btn-lg"
                onClick={handleGenerate}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? (
                  <span className="loading-content">
                    <Loader2 size={20} className="spinner" style={{ border: 'none', width: 'auto', height: 'auto', animation: 'spin 1s linear infinite' }} />
                    Generating your plan...
                  </span>
                ) : (
                  <>Start Learning <Sparkles size={18} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}