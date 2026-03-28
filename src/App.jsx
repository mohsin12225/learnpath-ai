
// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { AuthProvider, useAuth } from './context/AuthContext';
// import { LearningProvider, useLearning } from './context/LearningContext';
// import { ModalProvider } from './context/ModalContext';
// import AuthPage from './components/AuthPage';
// import PathSelector from './components/PathSelector';
// import Dashboard from './components/Dashboard';
// import LessonView from './components/LessonView';
// import ProgressView from './components/ProgressView';
// import AchievementsView from './components/AchievementsView';
// import ProfileView from './components/ProfileView';
// import SubscriptionView from './components/SubscriptionView';
// import { Loader2 } from 'lucide-react';

// function AppRouter() {
//   var auth = useAuth();
//   var learning = useLearning();

//   if (!auth.initialized || auth.loading) {
//     return (
//       <div className="app-loader">
//         <Loader2 className="app-loader-icon" size={40} />
//         <p>Loading...</p>
//       </div>
//     );
//   }

//   if (!auth.isAuthenticated) {
//     return <AuthPage />;
//   }

//   if (!learning.selectedPath) {
//     return (
//       <Routes>
//         <Route path="/subscription" element={<SubscriptionView />} />
//         <Route path="/profile" element={<ProfileView />} />
//         <Route path="*" element={<PathSelector />} />
//       </Routes>
//     );
//   }

//   return (
//     <Routes>
//       <Route path="/" element={<Dashboard />} />
//       <Route path="/lesson/:lessonId" element={<LessonView />} />
//       <Route path="/progress" element={<ProgressView />} />
//       <Route path="/achievements" element={<AchievementsView />} />
//       <Route path="/profile" element={<ProfileView />} />
//       <Route path="/subscription" element={<SubscriptionView />} />
//       <Route path="/paths" element={<PathSelector />} />
//       <Route path="*" element={<Navigate to="/" replace />} />
//     </Routes>
//   );
// }

// export default function App() {
//   return (
//     <AuthProvider>
//       <LearningProvider>
//         <ModalProvider>
//           <BrowserRouter>
//             <AppRouter />
//           </BrowserRouter>
//         </ModalProvider>
//       </LearningProvider>
//     </AuthProvider>
//   );
// }

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LearningProvider, useLearning } from './context/LearningContext';
import { ModalProvider } from './context/ModalContext';
import AuthPage from './components/AuthPage';
import PathSelector from './components/PathSelector';
import Dashboard from './components/Dashboard';
import LessonView from './components/LessonView';
import ProgressView from './components/ProgressView';
import AchievementsView from './components/AchievementsView';
import ProfileView from './components/ProfileView';
import SubscriptionView from './components/SubscriptionView';
import AboutUs from './components/AboutUs';
import PrivacyPolicy from './components/PrivacyPolicy';
import { Loader2 } from 'lucide-react';

function AppRouter() {
  var auth = useAuth();
  var learning = useLearning();

  if (!auth.initialized || auth.loading) {
    return (
      <div className="app-loader">
        <Loader2 className="app-loader-icon" size={40} />
        <p>Loading...</p>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <Routes>
        <Route path="/about" element={<AboutUs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  if (!learning.selectedPath) {
    return (
      <Routes>
        <Route path="/subscription" element={<SubscriptionView />} />
        <Route path="/profile" element={<ProfileView />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<PathSelector />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/lesson/:lessonId" element={<LessonView />} />
      <Route path="/progress" element={<ProgressView />} />
      <Route path="/achievements" element={<AchievementsView />} />
      <Route path="/profile" element={<ProfileView />} />
      <Route path="/subscription" element={<SubscriptionView />} />
      <Route path="/paths" element={<PathSelector />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LearningProvider>
        <ModalProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </ModalProvider>
      </LearningProvider>
    </AuthProvider>
  );
}