# TabHarbor 1.1.0

إضافة لإدارة جلسات التبويب وحافظة النصوص والصور على Chrome وEdge.

## التحميل والتثبيت

- **Chrome:** حمّل `tabharbor-chrome-1.1.0.zip`.
- **Edge:** حمّل `tabharbor-edge-1.1.0.zip`.
- فك الضغط، وافتح صفحة الإضافات في متصفحك.
- فعّل **Developer mode** ثم اختر **Load unpacked** وحدد المجلد الذي يحتوي `manifest.json`.
- شرح كامل وصور: [README](https://github.com/turky015-oss/TabHarbor#readme).

## المميزات

حفظ واستعادة الجلسات، نسخ احتياطي تلقائي، مفضلة وبحث ومعاينات، استيراد وتصدير جلسات JSON، واجهة عربية وإنجليزية، وحافظة نصوص وصور محلية اختيارية.

الحفظ التلقائي للحافظة متوقف افتراضيًا ويحتاج إذنًا عند التفعيل. يعمل أثناء تشغيل المتصفح، ويفحص كل ثانيتين تقريبًا، ولا يسترجع محتوى استُبدل قبل التقاطه. أوقف التسجيل قبل نسخ معلومات حساسة.

## التحديث

استبدل ملفات البناء في مجلد الإضافة المثبّت نفسه، ثم اضغط **Reload** في صفحة الإضافات. احتفظ بالتثبيت الحالي للحفاظ على بياناته.

## English

Choose the Chrome or Edge ZIP, extract it, enable Developer mode on the browser Extensions page, select Load unpacked, and choose the directory containing `manifest.json`. Clipboard history is local, optional, off by default, and cannot recover content overwritten before capture. No browser-store listing is claimed.

Validation: 42 unit tests plus real-extension session, interaction and clipboard integration suites passed in Chrome for Testing and Microsoft Edge. Native runtime permission prompts remain a manual release check; the clipboard test fixture pregrants optional permissions.
