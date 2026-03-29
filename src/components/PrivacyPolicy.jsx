// src/components/PrivacyPolicy.jsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  var navigate = useNavigate();

  return (
    <div className="static-page">
      <div className="static-page-container">
        <button className="static-back-btn" onClick={function () { navigate(-1); }}>
          <ArrowLeft size={18} /> Back
        </button>

        <div className="static-page-header">
          <h1>Privacy Policy</h1>
          <p className="static-subtitle">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="static-page-content static-policy-content">
          <section className="static-section">
            <h2>1. Introduction</h2>
            <p>
              Welcome to LearnPath.ai. We respect your privacy and are committed to protecting
              your personal data. This privacy policy explains what information we collect,
              how we use it, and your rights regarding your data.
            </p>
          </section>

          <section className="static-section">
            <h2>2. Information We Collect</h2>
            <p>We collect the following types of information when you use our platform:</p>
            <ul>
              <li><strong>Account Information:</strong> Email address and authentication credentials when you sign up or log in.</li>
              <li><strong>Learning Data:</strong> Topics you choose, learning paths created, lesson progress, and quiz results.</li>
              <li><strong>Usage Data:</strong> XP earned, streaks, achievements, and general usage patterns to improve your experience.</li>
              <li><strong>API Keys (optional):</strong> If you choose to use the Bring Your Own Key (BYOK) feature, your API key is stored securely and encrypted.</li>
            </ul>
          </section>

          <section className="static-section">
            <h2>3. How We Use Your Data</h2>
            <p>Your data is used to:</p>
            <ul>
              <li>Create and manage your account.</li>
              <li>Generate personalized learning paths and lessons.</li>
              <li>Track your progress, streaks, and achievements.</li>
              <li>Improve the platform and user experience.</li>
              <li>Provide AI-powered content through third-party AI services.</li>
            </ul>
          </section>

          <section className="static-section">
            <h2>4. AI and Third-Party Services</h2>
            <p>
              LearnPath.ai uses third-party AI services (such as Groq) to generate lesson
              content and quizzes. When generating content, we send your chosen topic and
              lesson context to these AI services. We do <strong>not</strong> send your
              personal information (email, name, or account details) to AI providers.
            </p>
          </section>

          <section className="static-section">
            <h2>5. Data Sharing</h2>
            <p>
              We do <strong>not</strong> sell, rent, or share your personal data with third
              parties for marketing purposes. Your data is only used internally to operate
              and improve the platform, and with AI service providers strictly for content
              generation as described above.
            </p>
          </section>

          <section className="static-section">
            <h2>6. Data Security</h2>
            <p>
              We use industry-standard security measures to protect your data, including
              secure authentication through Supabase, encrypted connections (HTTPS), and
              secure storage of sensitive information like API keys.
            </p>
          </section>

          <section className="static-section">
            <h2>7. Data Retention and Deletion</h2>
            <p>
              Your data is retained as long as your account is active. You can delete your
              account at any time from the Profile page. When you delete your account,
              all your personal data — including your profile, learning paths, lessons,
              quiz results, and any stored API keys — will be permanently removed from
              our systems.
            </p>
          </section>

          <section className="static-section">
            <h2>8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data stored on the platform.</li>
              <li>Delete your account and all associated data at any time.</li>
              <li>Contact us with questions or concerns about your data.</li>
            </ul>
          </section>

          <section className="static-section">
            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Any changes will be
              reflected on this page with an updated date. We encourage you to review
              this policy periodically.
            </p>
          </section>

          <section className="static-section">
            <h2>10. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or your data, please
              contact us at developer email: mohsin.alaum10@gmail.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}