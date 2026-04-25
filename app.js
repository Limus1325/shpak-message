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

// 🔐 ШИФР (Шифрование +3, Расшифровка -3)
function encrypt(text) {
  return caesar(text, 3);
}

function decrypt(text) {
  return caesar(text, -3); // Ключ -3, как ты просил
}

function caesar(text, shift) {
  if (!text) return "";
  let result = "";
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    // ЛАТИНИЦА A-Z (26 символов)
    if (code >= 65 && code <= 90) {
      result += shiftChar(code, 65, 26, shift);
    }
    // ЛАТИНИЦА a-z (26 символов)
    else if (code >= 97 && code <= 122) {
      result += shiftChar(code, 97, 26, shift);
    }
    // КИРИЛЛИЦА А-Я (32 символа, включая Ё)
    else if (code >= 1040 && code <= 1071) {
      result += shiftChar(code, 1040, 32, shift);
    }
    // КИРИЛЛИЦА а-я (32 символа)
    else if (code >= 1072 && code <= 1103) {
      result += shiftChar(code, 1072, 32, shift);
    }
    // Ё (отдельно, так как выпадает из диапазона)
    else if (code === 1025) {
      // Сдвигаем Ё как А (индекс 0)
      let newCode = ((0 + shift) % 32 + 32) % 32 + 1040; 
      result += String.fromCharCode(newCode);
    }
    // ё (отдельно)
    else if (code === 1105) {
      let newCode = ((0 + shift) % 32 + 32) % 32 + 1072;
      result += String.fromCharCode(newCode);
    }
    // ЦИФРЫ 0-9 (10 символов)
    else if (code >= 48 && code <= 57) {
      result += shiftChar(code, 48, 10, shift);
    }
    // Остальные символы (пробелы, знаки) не меняем
    else {
      result += char;
    }
  }
  return result;
}

// Вспомогательная функция для сдвига с корректным отрицательным сдвигом
function shiftChar(code, base, size, shift) {
  const codeWithoutBase = code - base;
  // Формула: ((index + shift) % size + size) % size
  // Это гарантирует, что даже при сдвиге -3 результат будет положительным
  const shiftedIndex = ((codeWithoutBase + shift) % size + size) % size;
  return String.fromCharCode(base + shiftedIndex);
}

// 🧪 Тестовые аккаунты
async function createTestAccounts() {
  const accounts = [
    { login: 'TEST', pass: '12345' },
    { login: 'TEST2', pass: '54321' }
  ];
  
  for (const acc of accounts) {
    // При регистрации тоже шифруем пароль
    const encLogin = encrypt(acc.login); 
    const encPass = encrypt(acc.pass);
    
    try {
      const snap = await db.ref('users/' + encLogin).once('value');
      if (!snap.exists()) {
        await db.ref('users/' + encLogin).set({
          password: encPass,
          created: Date.now(),
          isDirector: false,
          isTest: true,
          username: acc.login
        });
        console.log(`✅ АККАУНТ СОЗДАН: ${acc.login} / ${acc.pass}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка:`, error);
    }
  }
}

createTestAccounts();

// 🎭 Элементы
const authScreen = document.getElementById('auth-screen');
const sidebar = document.getElementById('sidebar');
const chatArea = document.getElementById('chat-area');
const loginInput = document.getElementById('login');
const passInput = document.getElementById('pass');
const msgInput = document.getElementById('msg-input');
const messagesDiv = document.getElementById('messages');
const lastMsgText = document.getElementById('last-msg-text');
const lastMsgTime = document.getElementById('last-msg-time');
const emojiPicker = document.getElementById('emoji-picker');

let currentUser = null;

// 🔐 Вход
function login() {
  const loginVal = loginInput.value.trim();
  const passVal = passInput.value.trim();
  if (!loginVal || !passVal) return alert('Заполни логин и пароль!');
  
  const encLogin = encrypt(loginVal);
  const encPass = encrypt(passVal);
  
  db.ref('users/' + encLogin).once('value').then(snap => {
    if (!snap.exists()) {
      return alert('❌ Пользователь не найден\n\nПопробуй:\n- TEST / 12345\n- TEST2 / 54321');
    }
    
    // Сравниваем зашифрованный пароль из базы с введенным зашифрованным
    if (snap.val().password === encPass) {
      currentUser = loginVal;
      localStorage.setItem('shpak_user', loginVal);
      showChat();
    } else {
      alert('❌ Неверный пароль');
    }
  }).catch(error => {
    alert('❌ Ошибка: ' + error.message);
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
  
  const encText = encrypt(text); // Шифруем при отправке
  db.ref('messages').push({
    author: currentUser,
    text: encText,
    timestamp: Date.now(),
    isDirector: currentUser.toLowerCase() === 'ваня',
    type: 'text'
  });
  msgInput.value = '';
}

// 📎 Прикрепить фото
function attachFile() {
  document.getElementById('file-input').click();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Image = e.target.result;
    
    db.ref('messages').push({
      author: currentUser,
      image: base64Image,
      timestamp: Date.now(),
      isDirector: currentUser.toLowerCase() === 'ваня',
      type: 'image'
    });
  };
  reader.readAsDataURL(file);
}

// 😊 Эмодзи
function toggleEmojiPicker() {
  if (emojiPicker.style.display === 'none') {
    emojiPicker.style.display = 'block';
  } else {
    emojiPicker.style.display = 'none';
  }
}

function insertEmoji(emoji) {
  msgInput.value += emoji;
  msgInput.focus();
  emojiPicker.style.display = 'none';
}

// 🔍 Поиск
function showSearch() {
  alert('🔍 Поиск по сообщениям\n\nФункция в разработке!');
}

// ⋮ Меню
function showMenu() {
  alert('⚙️ Меню\n\nНастройки будут доступны скоро!');
}

function toggleMenu() {
  alert('☰ Меню чатов\n\nФункция в разработке!');
}

// 🎬 АНИМАЦИЯ РАСШИФРОВКИ
function animateDecrypt(element, encryptedText, decryptedText, speed = 150) { // Ускорил до 150мс для красоты
  let currentIndex = 0;
  element.classList.add('decrypting');
  
  const interval = setInterval(() => {
    if (currentIndex < decryptedText.length) {
      const currentText = decryptedText.substring(0, currentIndex + 1);
      const remainingEncrypted = encryptedText.substring(currentIndex + 1);
      element.textContent = currentText + remainingEncrypted;
      currentIndex++;
    } else {
      element.textContent = decryptedText;
      element.classList.remove('decrypting');
      clearInterval(interval);
    }
  }, speed);
}

// 📥 Загрузка чата
function loadChat() {
  messagesDiv.innerHTML = '';
  let lastMsg = null;
  
  db.ref('messages').limitToLast(100).on('child_added', snap => {
    const data = snap.val();
    if (!data) return;
    
    const author = data.author || "Аноним";
    const time = new Date(data.timestamp).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});
    const isOutgoing = author === currentUser;
    const isDirector = data.isDirector;
    
    lastMsg = { text: data.type === 'text' ? decrypt(data.text) : '📷 Фото', time: time, author: author };
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'} ${isDirector ? 'director' : ''}`;
    
    let html = '';
    if (!isOutgoing) {
      html += `<div class="message-author">${author}</div>`;
    }
    
    if (data.type === 'image') {
      html += `<div class="photo-preview"><img src="${data.image}" alt="Photo"></div>`;
    } else {
      html += `<div class="message-text"></div>`;
    }
    
    html += `<div class="message-meta">`;
    html += `<span class="message-time">${time}</span>`;
    if (isOutgoing) {
      html += `<span class="message-status">✓✓</span>`;
    }
    html += `</div>`;
    
    msgDiv.innerHTML = html;
    messagesDiv.appendChild(msgDiv);
    
    // 🔥 АНИМАЦИЯ ДЛЯ ТЕКСТОВЫХ СООБЩЕНИЙ
    if (data.type === 'text') {
      const textElement = msgDiv.querySelector('.message-text');
      const encryptedText = data.text;
      const decryptedText = decrypt(data.text); // Используем новый decrypt (-3)
      setTimeout(() => {
        animateDecrypt(textElement, encryptedText, decryptedText, 150);
      }, 100);
    }
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    if (lastMsg) {
      lastMsgText.textContent = `${lastMsg.author}: ${lastMsg.text}`;
      lastMsgTime.textContent = lastMsg.time;
    }
  });
}

function showChat() {
  authScreen.style.display = 'none';
  sidebar.style.display = 'flex';
  chatArea.style.display = 'flex';
  document.getElementById('sidebar-user-info').textContent = `👤 ${currentUser}`;
  loadChat();
}

// Проверка сессии
const session = localStorage.getItem('shpak_user');
if (session) {
  currentUser = session;
  showChat();
}

// Enter для входа
passInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});
