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

// 🔐 ШИФР (РАБОТАЕТ С КИРИЛЛИЦЕЙ И ЦИФРАМИ!)
function caesarDoubleEncrypt(text, s1 = 1, s2 = 2) {
  if (!text) return "";
  const totalShift = s1 + s2;
  let result = "";
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    // ЛАТИНИЦА A-Z
    if (code >= 65 && code <= 90) {
      result += String.fromCharCode(((code - 65 + totalShift) % 26) + 65);
    }
    // ЛАТИНИЦА a-z
    else if (code >= 97 && code <= 122) {
      result += String.fromCharCode(((code - 97 + totalShift) % 26) + 97);
    }
    // КИРИЛЛИЦА А-Я (1040-1071)
    else if (code >= 1040 && code <= 1071) {
      result += String.fromCharCode(((code - 1040 + totalShift) % 32) + 1040);
    }
    // КИРИЛЛИЦА а-я (1072-1103)
    else if (code >= 1072 && code <= 1103) {
      result += String.fromCharCode(((code - 1072 + totalShift) % 32) + 1072);
    }
    // Ё (1025)
    else if (code === 1025) {
      result += String.fromCharCode(((0 + totalShift) % 32) + 1040);
    }
    // ё (1105)
    else if (code === 1105) {
      result += String.fromCharCode(((0 + totalShift) % 32) + 1072);
    }
    // ЦИФРЫ 0-9 (48-57)
    else if (code >= 48 && code <= 57) {
      result += String.fromCharCode(((code - 48 + totalShift) % 10) + 48);
    }
    // Остальные символы
    else {
      result += char;
    }
  }
  return result;
}

function caesarDoubleDecrypt(text, s1 = 1, s2 = 2) {
  if (!text) return "";
  const totalShift = s1 + s2;
  const decryptShift = 32 - (totalShift % 32);
  let result = "";
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    if (code >= 65 && code <= 90) {
      result += String.fromCharCode(((code - 65 + decryptShift) % 26) + 65);
    } else if (code >= 97 && code <= 122) {
      result += String.fromCharCode(((code - 97 + decryptShift) % 26) + 97);
    } else if (code >= 1040 && code <= 1071) {
      result += String.fromCharCode(((code - 1040 + decryptShift) % 32) + 1040);
    } else if (code >= 1072 && code <= 1103) {
      result += String.fromCharCode(((code - 1072 + decryptShift) % 32) + 1072);
    } else if (code === 1025) {
      result += String.fromCharCode(((0 + decryptShift) % 32) + 1040);
    } else if (code === 1105) {
      result += String.fromCharCode(((0 + decryptShift) % 32) + 1072);
    } else if (code >= 48 && code <= 57) {
      result += String.fromCharCode(((code - 48 + decryptShift) % 10) + 48);
    } else {
      result += char;
    }
  }
  return result;
}

// 🧪 Тестовые аккаунты
async function createTestAccounts() {
  const accounts = [
    { login: 'TEST', pass: '12345' },
    { login: 'TEST2', pass: '54321' }
  ];
  
  for (const acc of accounts) {
    const encLogin = caesarDoubleEncrypt(acc.login);
    const encPass = caesarDoubleEncrypt(acc.pass);
    
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
  const login = loginInput.value.trim();
  const pass = passInput.value.trim();
  if (!login || !pass) return alert('Заполни логин и пароль!');
  
  const encLogin = caesarDoubleEncrypt(login);
  const encPass = caesarDoubleEncrypt(pass);
  
  db.ref('users/' + encLogin).once('value').then(snap => {
    if (!snap.exists()) {
      return alert('❌ Пользователь не найден\n\nПопробуй:\n- TEST / 12345\n- TEST2 / 54321');
    }
    
    if (snap.val().password === encPass) {
      currentUser = login;
      localStorage.setItem('shpak_user', login);
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
  
  const encText = caesarDoubleEncrypt(text);
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
function animateDecrypt(element, encryptedText, decryptedText, speed = 300) {
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
    
    lastMsg = { text: data.type === 'text' ? caesarDoubleDecrypt(data.text) : '📷 Фото', time: time, author: author };
    
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
      const decryptedText = caesarDoubleDecrypt(data.text);
      setTimeout(() => {
        animateDecrypt(textElement, encryptedText, decryptedText, 300);
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
