// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCCTgHTXjKC3Q0x3YRZtR6cikE-p2FoQ_0",
  authDomain: "shpak-message.firebaseapp.com",
  databaseURL: "https://shpak-message-default-rtdb.firebaseio.com",
  projectId: "shpak-message",
  storageBucket: "shpak-message.firebasestorage.app",
  messagingSenderId: "302522413165",
  appId: "1:302522413165:web:cbd2d65395c58289680f64"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ==========================================
// 🔐 ШИФР ЦЕЗАРЯ (Сдвиг +3 / -3)
// Работает с Русским, Английским и Цифрами
// ==========================================

const ALPHABET = {
  EN: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  RU: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
  DIGITS: "0123456789"
};

function caesarCipher(text, shift) {
  if (!text) return "";
  let result = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Проверяем латиницу
    if (ALPHABET.EN.includes(char.toUpperCase())) {
      const isUpper = char === char.toUpperCase();
      const base = isUpper ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "abcdefghijklmnopqrstuvwxyz";
      const index = base.indexOf(char);
      // Формула для сдвига с учетом отрицательных чисел
      const newIndex = ((index + shift) % 26 + 26) % 26;
      result += base[newIndex];
    }
    // Проверяем кириллицу (учитываем Ё и ё)
    else if (ALPHABET.RU.includes(char.toUpperCase()) || char === 'Ё' || char === 'ё') {
      const isUpper = char === char.toUpperCase();
      // Включает Ё и ё
      const ruUpper = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
      const ruLower = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
      const base = isUpper ? ruUpper : ruLower;
      const index = base.indexOf(char);
      // Длина алфавита 33 символа
      const newIndex = ((index + shift) % 33 + 33) % 33;
      result += base[newIndex];
    }
    // Проверяем цифры
    else if (ALPHABET.DIGITS.includes(char)) {
      const index = ALPHABET.DIGITS.indexOf(char);
      // Длина 10 цифр
      const newIndex = ((index + shift) % 10 + 10) % 10;
      result += ALPHABET.DIGITS[newIndex];
    }
    // Остальные символы (пробелы, знаки) не трогаем
    else {
      result += char;
    }
  }
  return result;
}

function encrypt(text) {
  return caesarCipher(text, 3); // Шифруем: +3
}

function decrypt(text) {
  return caesarCipher(text, -3); // Расшифровываем: -3
}

// ==========================================
// 🎭 UI ЭЛЕМЕНТЫ
// ==========================================

const authScreen = document.getElementById('auth-screen');
const sidebar = document.getElementById('sidebar');
const chatArea = document.getElementById('chat-area');
const loginInput = document.getElementById('login');
const passInput = document.getElementById('pass');
const msgInput = document.getElementById('msg-input');
const messagesDiv = document.getElementById('messages');
const emojiPicker = document.getElementById('emoji-picker');

// Ссылки на модальные окна
const photoModal = document.getElementById('photo-modal');
const menuDropdown = document.getElementById('menu-dropdown');
const sidebarMenu = document.getElementById('sidebar-menu');
const searchOverlay = document.getElementById('search-overlay');

let currentUser = null;

// ==========================================
// 📂 ЛОГИКА БАЗЫ ДАННЫХ
// ==========================================

// Создание тестовых аккаунтов при запуске
async function initTestAccounts() {
  const accounts = [
    { login: 'TEST', pass: '12345' },
    { login: 'TEST2', pass: '54321' }
  ];

  for (const acc of accounts) {
    // Логины в базе храним в открытом виде для поиска, пароли шифруем
    const snap = await db.ref('users/' + acc.login).once('value');
    if (!snap.exists()) {
      await db.ref('users/' + acc.login).set({
        password: encrypt(acc.pass),
        created: Date.now()
      });
      console.log(`✅ Создан аккаунт: ${acc.login}`);
    }
  }
}
initTestAccounts();

// 🔐 Вход
function login() {
  const l = loginInput.value.trim();
  const p = passInput.value.trim();
  
  if (!l || !p) return alert('Введите логин и пароль');

  db.ref('users/' + l).once('value').then(snap => {
    if (!snap.exists()) return alert('❌ Пользователь не найден');
    
    const storedPass = snap.val().password;
    const inputPass = encrypt(p);

    if (storedPass === inputPass) {
      currentUser = l;
      localStorage.setItem('shpak_user', l);
      authScreen.style.display = 'none';
      sidebar.style.display = 'flex';
      chatArea.style.display = 'flex';
      document.getElementById('sidebar-user-info').textContent = `👤 ${l}`;
      loadChat();
    } else {
      alert('❌ Неверный пароль');
    }
  });
}

// 🚪 Выход
document.getElementById('btn-logout').onclick = () => {
  localStorage.removeItem('shpak_user');
  location.reload();
};

// 💬 Отправка сообщения
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !currentUser) return;
  
  // Ограничение длины строки (20-30 символов), если пользователь не ставит пробелы
  const lines = text.match(/.{1,30}/g);
  const finalText = lines ? lines.join('\n') : text;

  db.ref('messages').push({
    author: currentUser,
    text: encrypt(finalText), // Шифруем перед отправкой
    timestamp: Date.now(),
    type: 'text'
  });
  msgInput.value = '';
  msgInput.focus();
}

// 📎 Прикрепление фото
function attachFile() {
  document.getElementById('file-input').click();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    db.ref('messages').push({
      author: currentUser,
      image: e.target.result, // Base64
      timestamp: Date.now(),
      type: 'image'
    });
  };
  reader.readAsDataURL(file);
}

// ==========================================
// 📜 ЗАГРУЗКА ЧАТА
// ==========================================

function loadChat() {
  messagesDiv.innerHTML = '';
  
  db.ref('messages').limitToLast(50).on('child_added', snap => {
    const data = snap.val();
    if (!data) return;

    const isMe = data.author === currentUser;
    const time = new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    
    // Создаем контейнер сообщения
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isMe ? 'outgoing' : 'incoming'}`;
    msgDiv.setAttribute('data-key', snap.key); // Для поиска

    let contentHtml = '';
    
    // Если это фото
    if (data.type === 'image') {
      contentHtml = `<img src="${data.image}" class="photo-preview" onclick="openPhotoModal('${data.image}', '${data.author}', '${time}')">`;
    } 
    // Если это текст
    else {
      contentHtml = `<div class="message-text"></div>`;
    }

    // Собираем HTML сообщения
    msgDiv.innerHTML = `
      ${!isMe ? `<div class="message-author">${data.author}</div>` : ''}
      ${contentHtml}
      <div class="message-meta">
        <span class="message-time">${time}</span>
        ${isMe ? '<span class="message-status">✓✓</span>' : ''}
      </div>
    `;
    
    messagesDiv.appendChild(msgDiv);

    // 🎬 Анимация расшифровки для текста
    if (data.type === 'text') {
      const textEl = msgDiv.querySelector('.message-text');
      const encrypted = data.text;
      const decrypted = decrypt(encrypted);
      
      // Небольшая задержка для красоты
      setTimeout(() => animateDecrypt(textEl, encrypted, decrypted, 50), 50);
    }
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Обновление превью последнего сообщения в сайдбаре
    const lastText = data.type === 'text' ? decrypt(data.text).substring(0, 20) + '...' : '📷 Фото';
    document.getElementById('last-msg-text').textContent = `${data.author}: ${lastText}`;
    document.getElementById('last-msg-time').textContent = time;
  });
}

// 🎬 Функция анимации (побуквенно)
function animateDecrypt(element, encrypted, decrypted, speed) {
  let i = 0;
  element.classList.add('decrypting');
  
  const interval = setInterval(() => {
    if (i < decrypted.length) {
      // Показываем расшифрованную часть + остаток шифра
      element.textContent = decrypted.substring(0, i + 1) + encrypted.substring(i + 1);
      i++;
    } else {
      element.textContent = decrypted;
      element.classList.remove('decrypting');
      clearInterval(interval);
    }
  }, speed);
}

// ==========================================
// 🖼️ ПРОСМОТР ФОТО
// ==========================================

function openPhotoModal(src, author, time) {
  const img = document.getElementById('modal-image');
  const info = document.getElementById('modal-info');
  img.src = src;
  info.textContent = `📷 Фото от ${author} • ${time}`;
  photoModal.style.display = 'flex';
}

function closePhotoModal(e) {
  if (e && e.target.className !== 'close-modal' && e.target !== photoModal) return;
  photoModal.style.display = 'none';
}

// ==========================================
// 🔍 ПОИСК ПО СООБЩЕНИЯМ
// ==========================================

function showSearch() {
  searchOverlay.style.display = 'block';
  document.getElementById('search-messages').focus();
  document.getElementById('search-results').innerHTML = '';
}

function closeSearch() {
  searchOverlay.style.display = 'none';
}

function searchMessages(query) {
  const resultsDiv = document.getElementById('search-results');
  if (query.length < 2) {
    resultsDiv.innerHTML = '';
    return;
  }

  db.ref('messages').limitToLast(50).once('value').then(snap => {
    resultsDiv.innerHTML = '';
    let found = false;
    
    snap.forEach(child => {
      const msg = child.val();
      if (msg.type === 'text') {
        const text = decrypt(msg.text);
        if (text.toLowerCase().includes(query.toLowerCase())) {
          found = true;
          const div = document.createElement('div');
          div.className = 'search-result-item';
          div.innerHTML = `<strong>${msg.author}:</strong> ${text.substring(0, 50)}...`;
          div.onclick = () => {
            const el = document.querySelector(`[data-key="${child.key}"]`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.style.border = '2px solid var(--accent)';
              setTimeout(() => el.style.border = '', 2000);
            }
            closeSearch();
          };
          resultsDiv.appendChild(div);
        }
      }
    });

    if (!found) {
      resultsDiv.innerHTML = '<div style="padding:10px; text-align:center;">Ничего не найдено</div>';
    }
  });
}

// ==========================================
// ☰ и ⋮ МЕНЮ
// ==========================================

function toggleSidebarMenu() {
  sidebarMenu.style.display = sidebarMenu.style.display === 'none' ? 'block' : 'none';
  menuDropdown.style.display = 'none';
}

function showMenu() {
  menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
  sidebarMenu.style.display = 'none';
}

function showAbout() {
  alert('📄 shpak Message v1.0\n\nБумажный мессенджер с шифрованием.\n\nДиректор: Ваня\nРазработчик: Кирилл');
}

function clearChat() {
  if (confirm('Удалить все сообщения?')) {
    db.ref('messages').remove();
    closeAllMenus();
  }
}

function closeAllMenus() {
  menuDropdown.style.display = 'none';
  sidebarMenu.style.display = 'none';
}

// Закрытие меню при клике снаружи
document.addEventListener('click', (e) => {
  if (!e.target.closest('.header-btn') && !e.target.closest('.menu-dropdown')) {
    menuDropdown.style.display = 'none';
  }
  if (!e.target.closest('.menu-btn') && !e.target.closest('.sidebar-menu')) {
    sidebarMenu.style.display = 'none';
  }
});

// ==========================================
// 😊 ЭМОДЗИ
// ==========================================

function toggleEmojiPicker() {
  emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
}

function insertEmoji(emoji) {
  msgInput.value += emoji;
  msgInput.focus();
}

// Enter для отправки
msgInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

passInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});

// Проверка сессии при загрузке
if (localStorage.getItem('shpak_user')) {
  currentUser = localStorage.getItem('shpak_user');
  authScreen.style.display = 'none';
  sidebar.style.display = 'flex';
  chatArea.style.display = 'flex';
  document.getElementById('sidebar-user-info').textContent = `👤 ${currentUser}`;
  loadChat();
}
