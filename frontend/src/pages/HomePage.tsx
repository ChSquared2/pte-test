import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[#003057] mb-4">
          PTE Academic Simulator
        </h1>
        <p className="text-lg text-gray-600">
          Practice and prepare for the Pearson Test of English Academic
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/practice"
          className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border-t-4 border-[#0072CE]"
        >
          <h2 className="text-xl font-semibold text-[#003057] mb-3">Practice Mode</h2>
          <p className="text-gray-600 text-sm">
            Practice individual question types at your own pace. Choose from Speaking, Writing, Reading, or Listening sections.
          </p>
        </Link>

        <Link
          to="/exam"
          className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border-t-4 border-[#F2A900]"
        >
          <h2 className="text-xl font-semibold text-[#003057] mb-3">Full Exam</h2>
          <p className="text-gray-600 text-sm">
            Simulate the complete PTE Academic exam with real timing, sequential navigation, and scoring.
          </p>
        </Link>

        <Link
          to="/dashboard"
          className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border-t-4 border-[#00A651]"
        >
          <h2 className="text-xl font-semibold text-[#003057] mb-3">Dashboard</h2>
          <p className="text-gray-600 text-sm">
            Track your progress, view score trends, and identify areas that need improvement.
          </p>
        </Link>
      </div>

      <div className="mt-12 bg-white rounded-xl shadow-md p-8">
        <h2 className="text-xl font-semibold text-[#003057] mb-4">About PTE Academic</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div className="p-4">
            <div className="text-2xl font-bold text-[#0072CE]">3</div>
            <div className="text-sm text-gray-600">Sections</div>
          </div>
          <div className="p-4">
            <div className="text-2xl font-bold text-[#0072CE]">20+</div>
            <div className="text-sm text-gray-600">Question Types</div>
          </div>
          <div className="p-4">
            <div className="text-2xl font-bold text-[#0072CE]">~2 hrs</div>
            <div className="text-sm text-gray-600">Duration</div>
          </div>
          <div className="p-4">
            <div className="text-2xl font-bold text-[#0072CE]">10-90</div>
            <div className="text-sm text-gray-600">Score Range</div>
          </div>
        </div>
      </div>
    </div>
  );
}
