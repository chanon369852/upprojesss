import React, { useEffect } from 'react';
import { createChat } from '@n8n/chat';
import '@n8n/chat/dist/style.css';

export const ChatWidget = () => {
  useEffect(() => {
    createChat({
      // 1. เอา Production URL จาก n8n มาใส่ตรงนี้
      webhookUrl: 'https://sand78.app.n8n.cloud/webhook-test/99f1100e-e91a-4ea9-aa8a-531aa06ada36', 
      
      // 2. ตั้งค่าให้เป็นแบบ Popup มุมขวาล่าง (Window Mode)
      mode: 'window', 
      
      // 3. ข้อความเริ่มต้น
      initialMessages: [
        'สวัสดีครับ ผมเป็น จินนี่ ถามอะไรมาได้เลย!',
      ], 
      // 
      // 4. ปรับแต่งหน้าตา (Optional)
      i18n: {
        en: {
          title: 'Sand test it',
          subtitle: 'Apec',
          inputPlaceholder: 'พิมพ์คำถามของคุณ...',
        },
      },
    });
  }, []);

  return null; 
};