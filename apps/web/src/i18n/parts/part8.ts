import type { StringPart } from "../ui-strings";

/**
 * Second-pass strings: JSX text preceded by an expression (e.g. a spinner),
 * portal links carrying a trailing arrow, and prop names the first sweep
 * didn't know about (subtitle, demoHint, ...).
 *
 * The "Demo login:" hints keep their credentials verbatim in every language —
 * only the leading label is translated.
 */
export const part8: StringPart = {
  "Access your classes and attendance": ["Darslar va davomatingizni ko'ring", "Доступ к занятиям и посещаемости"],
  Apply: ["Qo'llash", "Применить"],
  Assign: ["Biriktirish", "Назначить"],
  Confirm: ["Tasdiqlash", "Подтвердить"],
  "Create Receptionist": ["Qabulxona xodimi yaratish", "Создать администратора"],
  "Create Student": ["O'quvchi yaratish", "Создать студента"],
  "Create Teacher": ["O'qituvchi yaratish", "Создать учителя"],
  "Create charge": ["Hisob yaratish", "Создать начисление"],
  "Demo login: admin@studycenter.uz / AdminPass123!": [
    "Demo kirish: admin@studycenter.uz / AdminPass123!",
    "Демо-вход: admin@studycenter.uz / AdminPass123!",
  ],
  "Demo login: john@democenter.com / TeacherPass123!": [
    "Demo kirish: john@democenter.com / TeacherPass123!",
    "Демо-вход: john@democenter.com / TeacherPass123!",
  ],
  "Demo login: owner@democenter.com / DemoPass123!": [
    "Demo kirish: owner@democenter.com / DemoPass123!",
    "Демо-вход: owner@democenter.com / DemoPass123!",
  ],
  "Demo login: reception@democenter.com / ReceptionPass123!": [
    "Demo kirish: reception@democenter.com / ReceptionPass123!",
    "Демо-вход: reception@democenter.com / ReceptionPass123!",
  ],
  "Essay questions have no fixed correct answer — the teacher grades these manually.": [
    "Insho savollarida aniq to'g'ri javob yo'q — ularni o'qituvchi qo'lda baholaydi.",
    "У эссе нет фиксированного правильного ответа — учитель оценивает их вручную.",
  ],
  "Estimated monthly amount is calculated from the teacher's actual enrolled students once saved.": [
    "Taxminiy oylik summa saqlangandan so'ng o'qituvchining haqiqiy o'quvchilari asosida hisoblanadi.",
    "Примерная месячная сумма рассчитывается по фактическим студентам учителя после сохранения.",
  ],
  "Estimated monthly amount is calculated from the teacher's actual weekly schedule once saved.": [
    "Taxminiy oylik summa saqlangandan so'ng o'qituvchining haqiqiy haftalik jadvali asosida hisoblanadi.",
    "Примерная месячная сумма рассчитывается по фактическому недельному расписанию учителя после сохранения.",
  ],
  "Generate Parent Password": ["Ota-ona parolini yaratish", "Создать пароль родителя"],
  "Generate Test with AI": ["AI bilan test yaratish", "Создать тест с ИИ"],
  Login: ["Kirish", "Вход"],
  "Manage newcomers and payments": ["Yangi o'quvchilar va to'lovlarni boshqaring", "Управляйте новичками и платежами"],
  "Manage your study center": ["O'quv markazingizni boshqaring", "Управляйте своим учебным центром"],
  "My Tests →": ["Mening testlarim →", "Мои тесты →"],
  "Parent Portal →": ["Ota-ona portali →", "Портал родителя →"],
  "Platform Admin →": ["Platforma admini →", "Администратор платформы →"],
  "Reception Portal →": ["Qabulxona portali →", "Портал приёмной →"],
  "Record payment": ["To'lovni qayd etish", "Записать платёж"],
  Register: ["Ro'yxatdan o'tish", "Зарегистрироваться"],
  Save: ["Saqlash", "Сохранить"],
  "Save Branding": ["Brendingni saqlash", "Сохранить брендинг"],
  "Save Test": ["Testni saqlash", "Сохранить тест"],
  "Save attendance": ["Davomatni saqlash", "Сохранить посещаемость"],
  "Save changes": ["O'zgarishlarni saqlash", "Сохранить изменения"],
  "Save note": ["Izohni saqlash", "Сохранить заметку"],
  "Set Password": ["Parolni o'rnatish", "Установить пароль"],
  "Sign in": ["Kirish", "Войти"],
  "Student Portal →": ["O'quvchi portali →", "Портал студента →"],
  "Study Center OS Management": ["Study Center OS boshqaruvi", "Управление Study Center OS"],
  "Teacher Portal →": ["O'qituvchi portali →", "Портал учителя →"],
  "Your account was created by your study center. Please set a secure password.": [
    "Hisobingiz o'quv markazingiz tomonidan yaratilgan. Iltimos, xavfsiz parol o'rnating.",
    "Ваш аккаунт создан учебным центром. Пожалуйста, установите надёжный пароль.",
  ],
  "Your objective answers are graded. Essay questions are pending teacher review.": [
    "Test javoblaringiz baholandi. Insho savollari o'qituvchi ko'rigini kutmoqda.",
    "Ваши тестовые ответы оценены. Эссе ожидают проверки учителя.",
  ],
  "Your teacher dashboard access has not been activated yet. Ask an admin to activate it.": [
    "O'qituvchi paneliga kirishingiz hali faollashtirilmagan. Adminni faollashtirishni so'rang.",
    "Ваш доступ к панели учителя ещё не активирован. Попросите администратора активировать его.",
  ],
  "Welcome to": ["Xush kelibsiz —", "Добро пожаловать в"],
  "Staff Members": ["Xodimlar", "Сотрудники"],
  "charges overdue": ["hisob muddati o'tgan", "просроченных начислений"],
  "Don't show again today": ["Bugun boshqa ko'rsatilmasin", "Не показывать сегодня"],
  "New study center?": ["Yangi o'quv markazimi?", "Новый учебный центр?"],
};
