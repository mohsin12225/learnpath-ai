// src/components/SubscriptionView.jsx
import { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { api } from '../api';
import {
  Crown, Zap, Check, Key, BookOpen, Shield,
  Loader2, ArrowRight, Sparkles,
} from 'lucide-react';

var FREE_FEATURES = [
  'Up to 3 learning paths',
  'AI-generated lessons',
  'Quiz & final test system',
  'XP, streaks & achievements',
  'Progress tracking',
];

var PRO_FEATURES = [
  'Everything in Free',
  'Bring Your Own API Key (BYOK)',
  'Use your own Groq API key',
  'Faster AI responses',
  'Priority support (coming soon)',
  'Unlimited potential',
];

export default function SubscriptionView() {
  var auth = useAuth();
  var user = auth.user;
  var updateUserLocal = auth.updateUserLocal;
  var refreshUser = auth.refreshUser;
  var modal = useModal();

  var [loading, setLoading] = useState(false);

  var currentPlan = (user && user.plan) || 'free';
  var isPro = currentPlan === 'pro';

  async function handleUpgrade() {
    if (isPro) return;

    modal.showConfirm(
      'This is a test upgrade. In production, this will use real payments.',
      {
        title: 'Upgrade to Pro',
        type: 'info',
        confirmLabel: 'Activate Pro (Test)',
        confirmVariant: 'primary',
        cancelLabel: 'Cancel',
        onConfirm: async function () {
          setLoading(true);
          try {
            var result = await api('upgrade-plan', {
              method: 'POST',
              body: JSON.stringify({ plan: 'pro' }),
            });
            updateUserLocal(result.user);
            refreshUser();
          } catch (err) {
            modal.showAlert(err.message || 'Upgrade failed', {
              title: 'Error',
              type: 'error',
            });
          } finally {
            setLoading(false);
          }
        },
      }
    );
  }

  async function handleDowngrade() {
    if (!isPro) return;

    modal.showConfirm(
      'Downgrading will disable BYOK. Your API key will be kept but not used.',
      {
        title: 'Downgrade to Free',
        type: 'warning',
        confirmLabel: 'Downgrade',
        confirmVariant: 'danger',
        cancelLabel: 'Keep Pro',
        onConfirm: async function () {
          setLoading(true);
          try {
            var result = await api('upgrade-plan', {
              method: 'POST',
              body: JSON.stringify({ plan: 'free' }),
            });
            updateUserLocal(result.user);
            refreshUser();
          } catch (err) {
            modal.showAlert(err.message || 'Downgrade failed', {
              title: 'Error',
              type: 'error',
            });
          } finally {
            setLoading(false);
          }
        },
      }
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content page-content">
        <h1 className="page-title">
          <Crown className="page-title-icon" size={24} /> Subscription
        </h1>

        <p className="subscription-subtitle">
          Choose the plan that works for you.
        </p>

        <div className="subscription-cards">
          {/* Free Plan */}
          <div className={'sub-card' + (!isPro ? ' sub-card-active' : '')}>
            <div className="sub-card-header">
              <div className="sub-card-icon sub-card-icon-free">
                <Zap size={24} />
              </div>
              <h2 className="sub-card-title">Free</h2>
              <p className="sub-card-price">
                <span className="sub-card-amount">$0</span>
                <span className="sub-card-period">/forever</span>
              </p>
            </div>

            <ul className="sub-card-features">
              {FREE_FEATURES.map(function (f, i) {
                return (
                  <li key={i}>
                    <Check size={16} className="sub-feature-check" />
                    <span>{f}</span>
                  </li>
                );
              })}
            </ul>

            <div className="sub-card-action">
              {!isPro ? (
                <button className="btn-secondary btn-full" disabled>
                  Current Plan
                </button>
              ) : (
                <button
                  className="btn-secondary btn-full"
                  onClick={handleDowngrade}
                  disabled={loading}
                >
                  {loading ? <Loader2 size={16} className="spin" /> : null}
                  Downgrade to Free
                </button>
              )}
            </div>
          </div>

          {/* Pro Plan */}
          <div className={'sub-card sub-card-pro' + (isPro ? ' sub-card-active' : '')}>
            {!isPro && (
              <div className="sub-card-badge">
                <Sparkles size={12} /> RECOMMENDED
              </div>
            )}

            <div className="sub-card-header">
              <div className="sub-card-icon sub-card-icon-pro">
                <Crown size={24} />
              </div>
              <h2 className="sub-card-title">Pro</h2>
              <p className="sub-card-price">
                <span className="sub-card-amount">$0</span>
                <span className="sub-card-period">Free mode</span>
              </p>
            </div>

            <ul className="sub-card-features">
              {PRO_FEATURES.map(function (f, i) {
                return (
                  <li key={i}>
                    <Check size={16} className="sub-feature-check sub-feature-check-pro" />
                    <span>{f}</span>
                  </li>
                );
              })}
            </ul>

            <div className="sub-card-action">
              {isPro ? (
                <button className="btn-primary btn-full" disabled>
                  <Crown size={16} /> Current Plan
                </button>
              ) : (
                <button
                  className="btn-primary btn-full"
                  onClick={handleUpgrade}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>
        </div>

        {isPro && (
          <div className="subscription-byok-hint">
            <Key size={16} />
            <span>
              You can now set up your API key in{' '}
              <a href="/profile">Profile Settings</a>.
            </span>
          </div>
        )}
      </main>
    </div>
  );
}