const { execSync } = require('child_process');
const fs = require('fs');

// 1. JSX 컴파일
console.log('Compiling JSX...');
execSync(
  'npx babel js/config.js js/utils.js js/ui.js js/DatePicker.js js/StudentMyPage.js js/StudentManager.js js/WrongAnswerManager.js js/CurriculumManager.js js/LessonManager.js js/TeacherView.js js/LoginPage.js js/App.js --out-dir js/compiled',
  { stdio: 'inherit' }
);

// 2. index.html 패치 (babel standalone 제거 + compiled 파일로 교체)
console.log('Patching index.html...');
let html = fs.readFileSync('index.html', 'utf8');

// babel standalone 제거
html = html.replace(/<script src="https:\/\/unpkg\.com\/@babel\/standalone\/babel\.min\.js"><\/script>\n?/, '');

// type="text/babel" → compiled 파일로 교체
html = html.replace(
  /<script type="text\/babel" src="js\/([^"?]+\.js)\?v=[^"]*"><\/script>/g,
  (match, filename) => `<script src="js/compiled/${filename}?v=20260406b"></script>`
);

fs.writeFileSync('index.html', html);
console.log('Build complete!');
