import React, { useState } from 'react';
import QuestionCard from './QuestionCard';
import { getModulesByGrade } from '../data/mathModules';

const ALL_GRADES = ['KG-1', '2-3', '4-5', '6-7', '7-8', '9+'];

const GRADE_INFO = {
  'KG-1': { name: 'Kindergarten - 1st Grade', color: 'from-pink-400 to-red-400', icon: '🎈' },
  '2-3': { name: '2nd - 3rd Grade', color: 'from-orange-400 to-yellow-400', icon: '🌟' },
  '4-5': { name: '4th - 5th Grade', color: 'from-green-400 to-teal-400', icon: '🎯' },
  '6-7': { name: '6th - 7th Grade', color: 'from-blue-400 to-cyan-400', icon: '🚀' },
  '7-8': { name: '7th - 8th Grade', color: 'from-purple-400 to-indigo-400', icon: '⚡' },
  '9+': { name: '9th Grade and Above', color: 'from-indigo-500 to-purple-600', icon: '🏆' },
};

// Convert numeric grade (1-12) to grade range string (KG-1, 2-3, etc.)
const convertGradeFormat = (grade) => {
  if (typeof grade === 'string') {
    // Already in correct format
    if (GRADE_INFO[grade]) return grade;
  }
  
  const gradeNum = parseInt(grade);
  
  if (gradeNum <= 1) return 'KG-1';
  if (gradeNum <= 3) return '2-3';
  if (gradeNum <= 5) return '4-5';
  if (gradeNum <= 7) return '6-7';
  if (gradeNum <= 8) return '7-8';
  return '9+';
};

export default function ModuleSelector({ userId, userGrade, userProfile }) {
  const [mode, setMode] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(convertGradeFormat(userGrade) || '4-5');
  const [selectedModules, setSelectedModules] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);

  if (mode) {
    return (
      <QuestionCard
        userId={userId}
        userGrade={selectedGrade}
        mode={mode}
        selectedModules={selectedModules}
        onNext={() => setQuestionCount(questionCount + 1)}
        onEndSession={() => {
          setMode(null);
          setQuestionCount(0);
        }}
      />
    );
  }

  const currentGradeModules = getModulesByGrade(selectedGrade)?.modules || [];
  const allModuleNames = currentGradeModules.map(m => m.name);

  const toggleModule = (moduleName) => {
    setSelectedModules(prev =>
      prev.includes(moduleName)
        ? prev.filter(m => m !== moduleName)
        : [...prev, moduleName]
    );
  };

  const selectAllModules = () => {
    setSelectedModules(allModuleNames);
  };

  const clearAllModules = () => {
    setSelectedModules([]);
  };

  return (
    <div className="h-[calc(100vh-52px)] bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-2 overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-2 flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-0.5 drop-shadow-lg">
            📚 Choose Your Modules
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-white opacity-90 drop-shadow">
            Hi {userProfile?.name}! Select a grade & modules 👋
          </p>
        </div>

        {/* Grade + Modules on one page */}
        <div className="flex flex-col flex-1 gap-2 overflow-hidden">
          {/* Grades Section */}
          <div className="bg-white rounded-xl p-2 shadow-lg flex-shrink-0">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 mb-2">
              🎓 Select Your Grade
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {ALL_GRADES.map(grade => {
                const info = GRADE_INFO[grade];
                const isSelected = grade === selectedGrade;
                const gradeModules = getModulesByGrade(grade)?.modules || [];
                const moduleCount = gradeModules.length;
                
                return (
                  <button
                    key={grade}
                    onClick={() => { setSelectedGrade(grade); setSelectedModules([]); }}
                    aria-label={`Select ${info.name}`}
                    aria-pressed={isSelected}
                    className={`p-2 rounded-lg border-2 text-left transition flex flex-col ${
                      isSelected
                        ? `bg-gradient-to-r ${info.color} text-white border-2 border-white shadow-lg`
                        : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl sm:text-3xl lg:text-4xl mb-1">{info.icon}</div>
                    <div>
                      <div className={`font-bold text-xs sm:text-sm lg:text-base ${isSelected ? 'text-white' : 'text-gray-800'} leading-tight`}>
                        {grade}
                      </div>
                      <div className={`text-xs leading-tight ${isSelected ? 'text-white opacity-90' : 'text-gray-600'}`}>
                        {info.name}
                      </div>
                      <div className={`text-xs leading-tight mt-1 ${isSelected ? 'text-white opacity-80' : 'text-gray-500'}`}>
                        {moduleCount} 📚
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modules Section */}
          <div className="bg-white rounded-xl p-2 shadow-lg flex flex-col flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-800">
                📚 Modules for {selectedGrade}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={selectAllModules}
                  className="px-2 py-1 text-xs sm:text-sm bg-green-500 text-white font-semibold rounded hover:bg-green-600 transition"
                >
                  ✅ All
                </button>
                <button
                  onClick={clearAllModules}
                  className="px-2 py-1 text-xs sm:text-sm bg-red-500 text-white font-semibold rounded hover:bg-red-600 transition"
                >
                  ❌ Clear
                </button>
              </div>
            </div>

            {/* Module Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 overflow-y-auto flex-1 mb-2 content-start">
              {currentGradeModules.map((module, index) => {
                const isSelected = selectedModules.includes(module.name);
                const moduleColors = [
                  'from-pink-400 to-rose-400',
                  'from-orange-400 to-amber-400',
                  'from-green-400 to-emerald-400',
                  'from-blue-400 to-cyan-400',
                  'from-purple-400 to-violet-400',
                  'from-teal-400 to-green-400',
                  'from-indigo-400 to-blue-400',
                  'from-yellow-400 to-orange-400',
                  'from-rose-400 to-pink-400',
                  'from-cyan-400 to-teal-400',
                ];
                const moduleIcons = ['📐', '➕', '➖', '✖️', '➗', '🔢', '📊', '🧩', '🔺', '💡', '📏', '🎲', '⚡', '🏆', '🧮'];
                const color = moduleColors[index % moduleColors.length];
                const icon = moduleIcons[index % moduleIcons.length];

                return (
                  <button
                    key={module.name}
                    onClick={() => toggleModule(module.name)}
                    aria-label={`${isSelected ? 'Deselect' : 'Select'} ${module.name} module`}
                    aria-pressed={isSelected}
                    className={`p-2 rounded-lg border-2 text-left transition flex flex-col ${
                      isSelected
                        ? `bg-gradient-to-r ${color} text-white border-white shadow-lg`
                        : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-xl sm:text-2xl mb-1">{isSelected ? '✅' : icon}</div>
                    <div className={`font-bold text-xs sm:text-sm leading-tight ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                      {module.name}
                    </div>
                    <div className={`text-xs leading-tight mt-0.5 ${isSelected ? 'text-white opacity-80' : 'text-gray-500'}`}>
                      {module.topics.length} topics
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedModules.length === 0 && (
              <p className="text-xs text-red-600 font-semibold mb-2 flex-shrink-0">
                ⚠️ Select at least one module
              </p>
            )}

            {/* Start Buttons */}
            <div className="grid grid-cols-2 gap-2 flex-shrink-0">
              <button
                onClick={() => selectedModules.length > 0 && setMode('play')}
                disabled={selectedModules.length === 0}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50 text-xs sm:text-sm"
              >
                🎯 Play Mode
              </button>
              <button
                onClick={() => selectedModules.length > 0 && setMode('test')}
                disabled={selectedModules.length === 0}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50 text-xs sm:text-sm"
              >
                📝 Test Mode
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
