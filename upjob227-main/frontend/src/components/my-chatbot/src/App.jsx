import React from 'react';
import { ChatWidget } from './ChatWidget'; // import มา

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center p-10 bg-white rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          หาทำ Chatbot
        </h1>
        <p className="text-gray-600">
          ลองกดปุ่มแชทที่มุมขวาล่างดูสิครับ 😎😎😎
        </p>
      </div>

      {/* แปะไว้ตรงไหนก็ได้ใน App */}
      <ChatWidget />
    </div>
  );
}

export default App;