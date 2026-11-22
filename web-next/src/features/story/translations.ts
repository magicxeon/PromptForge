import i18n from "../../app/i18n";
import en from "../../locales/en/story.json";
import th from "../../locales/th/story.json";
import enPlan from "../../locales/en/storyPlan.json";
import thPlan from "../../locales/th/storyPlan.json";
i18n.addResourceBundle("en","story",en);
i18n.addResourceBundle("th","story",th);
i18n.addResourceBundle("en","storyPlan",enPlan);
i18n.addResourceBundle("th","storyPlan",thPlan);
i18n.addResourceBundle("en","cinematic",{
  "cinematic.writingBilling.busy": "Another writing request is in progress. Wait for its result before starting again.",
  "cinematic.writingBilling.expired": "This quote expired or changed. Close this dialog and request a new quote.",
  "cinematic.writingBilling.pending": "This writing operation needs status recovery. Do not generate it again.",
  "cinematic.writingBilling.consentUnavailable": "Credit confirmation is unavailable. Reopen the Cinematic workspace and try again.",
  "cinematic.writingBilling.storageUnavailable": "Writing recovery could not be saved. No new AI request was sent. Check browser storage and try again.",
  "cinematic.writingBilling.previousRequest": "A previous writing request needs recovery. Restore its original inputs before retrying; no new charge was started.",
  "cinematic.writingBilling.failed": "The previous writing request failed and its refund is settled. You may request a new quote."
});
i18n.addResourceBundle("th","cinematic",{
  "cinematic.writingBilling.busy": "มีคำสั่งช่วยเขียนกำลังดำเนินการ โปรดรอผลก่อนเริ่มใหม่",
  "cinematic.writingBilling.expired": "ราคานี้หมดอายุหรือเปลี่ยนแล้ว โปรดปิดหน้าต่างและขอราคาใหม่",
  "cinematic.writingBilling.pending": "งานเขียนนี้ต้องตรวจสอบสถานะเพื่อกู้คืนผล โปรดอย่าสั่งสร้างซ้ำ",
  "cinematic.writingBilling.consentUnavailable": "เปิดการยืนยันเครดิตไม่ได้ โปรดเปิดพื้นที่ Cinematic ใหม่แล้วลองอีกครั้ง",
  "cinematic.writingBilling.storageUnavailable": "บันทึกข้อมูลกู้คืนงานเขียนไม่ได้ จึงยังไม่ส่งคำสั่ง AI ใหม่ โปรดตรวจพื้นที่เก็บข้อมูลของเบราว์เซอร์แล้วลองอีกครั้ง",
  "cinematic.writingBilling.previousRequest": "มีคำสั่งงานเขียนก่อนหน้าที่ต้องกู้คืน โปรดคืนข้อมูลเดิมก่อนลองอีกครั้ง โดยยังไม่เริ่มคิดเครดิตใหม่",
  "cinematic.writingBilling.failed": "คำสั่งงานเขียนก่อนหน้าล้มเหลวและคืนเครดิตเรียบร้อยแล้ว คุณสามารถขอราคาใหม่ได้"
});
