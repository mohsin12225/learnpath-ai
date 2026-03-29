
// import Sidebar from './Sidebar';
// import StatsPanel from './StatsPanel';
// import LessonPath from './LessonPath';
// import { useLearning } from '../context/LearningContext';
// import { GraduationCap } from 'lucide-react';

// export default function Dashboard() {
//   const { selectedPath } = useLearning();

//   return (
//     <div className="app-layout">
//       <Sidebar />
//       <main className="main-content">
//         <div className="dashboard-header">
//           <h1 className="course-title">
//             <GraduationCap className="title-icon" size={28} />
//             {selectedPath?.topic}
//           </h1>
//           <p className="course-desc">{selectedPath?.description}</p>
//         </div>
//         <LessonPath />
//       </main>
//       <StatsPanel />
//     </div>
//   );
// }

import Sidebar from './Sidebar';
import StatsPanel from './StatsPanel';
import LessonPath from './LessonPath';
import MobileMenu from './MobileMenu';
import { useLearning } from '../context/LearningContext';
import { GraduationCap } from 'lucide-react';

export default function Dashboard() {
  const { selectedPath } = useLearning();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="dashboard-header">
          <div className="dashboard-header-text">
            <h1 className="course-title">
              <GraduationCap className="title-icon" size={28} />
              {selectedPath?.topic}
            </h1>
            <p className="course-desc">{selectedPath?.description}</p>
          </div>
          <MobileMenu />
        </div>
        <LessonPath />
      </main>
      <StatsPanel />
    </div>
  );
}