import type { StringPart } from "../ui-strings";

/**
 * Values that live in module-scope constant maps (option lists, briefing
 * stat cards, badge labels) and are translated at the render site with
 * `t(item.label)` rather than at the declaration, since a hook can't be
 * called at module scope.
 *
 * Uzbek payment brands (Click, Payme, Humo Terminal, Uzum Bank) are proper
 * nouns and stay identical in all three languages.
 */
export const part7: StringPart = {
  "Active students": ["Faol o'quvchilar", "Активные студенты"],
  "Analytics & reporting": ["Tahlil va hisobotlar", "Аналитика и отчёты"],
  Arts: ["San'at", "Искусство"],
  "Attendance to mark": ["Belgilanadigan davomat", "Посещаемость к отметке"],
  "Auto (system preference)": ["Avtomatik (tizim sozlamasi)", "Авто (системная настройка)"],
  "Balance due": ["To'lanadigan qoldiq", "К оплате"],
  "Bank Transfer": ["Bank o'tkazmasi", "Банковский перевод"],
  "Bug / Issue": ["Xatolik / Muammo", "Ошибка / Проблема"],
  "Classes today": ["Bugungi darslar", "Занятия сегодня"],
  Click: ["Click", "Click"],
  Dark: ["Tungi", "Тёмная"],
  English: ["Ingliz tili", "Английский"],
  Essay: ["Insho", "Эссе"],
  Excused: ["Uzrli", "Уважительная"],
  "Feature Idea": ["Yangi g'oya", "Идея функции"],
  "Fill in Blank": ["Bo'sh joyni to'ldirish", "Заполните пропуск"],
  Health: ["Salomatlik", "Здоровье"],
  "Homework due": ["Muddati kelgan uy vazifasi", "Домашние задания к сдаче"],
  "Homework module": ["Uy vazifasi moduli", "Модуль домашних заданий"],
  "Humo Terminal": ["Humo Terminal", "Humo Terminal"],
  "IT & Computer": ["IT va kompyuter", "IT и компьютеры"],
  Light: ["Kunduzgi", "Светлая"],
  "Low attendance alerts": ["Past davomat ogohlantirishlari", "Оповещения о низкой посещаемости"],
  Mathematics: ["Matematika", "Математика"],
  "Multi-branch reports": ["Ko'p filialli hisobotlar", "Отчёты по филиалам"],
  "Multiple Choice": ["Ko'p variantli", "Множественный выбор"],
  Music: ["Musiqa", "Музыка"],
  "New today": ["Bugun yangi", "Новые сегодня"],
  "Newcomers to convert": ["Konversiya qilinadigan yangilar", "Новички к конверсии"],
  Other: ["Boshqa", "Другое"],
  "Overdue payments": ["Muddati o'tgan to'lovlar", "Просроченные платежи"],
  Overview: ["Umumiy ko'rinish", "Обзор"],
  Payme: ["Payme", "Payme"],
  "Payment reminders (SMS/WhatsApp)": ["To'lov eslatmalari (SMS/WhatsApp)", "Напоминания об оплате (SMS/WhatsApp)"],
  "Pending approvals": ["Tasdiqlash kutilmoqda", "Ожидают одобрения"],
  "Pending conversions": ["Kutilayotgan konversiyalar", "Ожидающие конверсии"],
  "Pending payments": ["Kutilayotgan to'lovlar", "Ожидающие платежи"],
  Profile: ["Profil", "Профиль"],
  Question: ["Savol", "Вопрос"],
  Russian: ["Rus tili", "Русский"],
  Schedules: ["Jadvallar", "Расписания"],
  Science: ["Fan", "Наука"],
  "Short Answer": ["Qisqa javob", "Краткий ответ"],
  Sports: ["Sport", "Спорт"],
  Strong: ["Kuchli", "Надёжный"],
  "Study centers": ["O'quv markazlari", "Учебные центры"],
  "Test Prep": ["Testga tayyorgarlik", "Подготовка к тестам"],
  "Tests to review": ["Ko'rib chiqiladigan testlar", "Тесты на проверку"],
  "Total revenue": ["Jami daromad", "Общий доход"],
  "Total students": ["Jami o'quvchilar", "Всего студентов"],
  "True/False": ["To'g'ri/Noto'g'ri", "Верно/Неверно"],
  Uzbek: ["O'zbek tili", "Узбекский"],
  "Uzbek (O'zbekcha)": ["O'zbekcha", "Узбекский (O'zbekcha)"],
  "Uzum Bank": ["Uzum Bank", "Uzum Bank"],
  Weak: ["Zaif", "Слабый"],
};
