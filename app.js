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

// 🔐 ШИФР
function encrypt(text) {
  if (!text) return "";
  return caesar(text, 3);
}

function decrypt(text) {
  if (!text) return "";
  return caesar(text, -3);
}

function caesar(text, shift) {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // A-Z
    if (code >= 65 && code <= 90) result += String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
    // a-z
    else if (code >= 97 && code <= 122) result += String.fromCharCode(((code - 97 + shift) % 26 + 26) % 26 + 97);
    // А-Я
    else if (code >= 1040 && code <= 1071) result += String.fromCharCode(((code - 1040 + shift) % 32 + 32) % 32 + 1040);
    // а-я
    else if (code >= 1072 && code <= 1103) result += String.fromCharCode(((code - 1072 + shift) % 32 + 32) % 32 + 1072);
    // Ё
    else if (code === 1025) result += String.fromCharCode(((0 + shift) % 32 + 32) % 32 + 1040);
    // ё
    else if (code === 1105) result += String.fromCharCode(((0 + shift) % 32 + 32) % 32 + 1072);
    // 0-9
    else if (code >= 48 && code <= 57) result += String.fromCharCode(((code - 48 + shift) % 10 + 10) % 10 + 48);
    else result += text[i];
  }
  return result;
}

// 👥 ПОЛЬЗОВАТЕЛИ
const DEFAULT_USERS = {
  'Vanya': { pass: 'admin123', role: 'admin', name: 'Ваня (Директор)' },
  'Kirill': { pass: 'dev123', role: 'dev', name: 'Кирилл (Разраб)' },
  'TEST': { pass: '12345', role: 'user', name: 'Test User' },
  'TEST2': { pass: '54321', role: 'user', name: 'Test User 2' }
};

// 🌍 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let currentUser = null;
let currentChatId = 'general';

// 🚀 ИНИЦИАЛИЗАЦИЯ
async function initDB() {
  // Создаем пользователей
  for (const [login, data] of Object.entries(DEFAULT_USERS)) {
    const snap = await db.ref('users/' + login).once('value');
    if (!snap.exists()) {
      await db.ref('users/' + login).set({
        password: encrypt(data.pass),
        role: data.role,
        displayName: data.name
      });
      console.log('✅ Создан:', login);
    }
  }
  
  // Создаем общий чат
  const generalSnap = await db.ref('chats/general').once('value');
  if (!generalSnap.exists()) {
    await db.ref('chats/general').set({
      name: 'Общий чат',
      created: Date.now(),
      participants: { 'Vanya': true, 'Kirill': true, 'TEST': true, 'TEST2': true }
    });
    console.log('✅ Общий чат создан');
  }
}
initDB();

// 🔐 ВХОД
document.getElementById('btn-enter').onclick = function() {
  const login = document.getElementById('login').value.trim();
  const pass = document.getElementById('pass').value.trim();
  
  if (!login || !pass) return alert('Введите логин и пароль');
  
  db.ref('users/' + login).once('value').then(snap => {
    if (!snap.exists()) return alert('❌ Пользователь не найден');
    const userData = snap.val();
    if (userData.password === encrypt(pass)) {
      currentUser = { login, role: userData.role, name: userData.displayName || login };
      localStorage.setItem('shpak_user', JSON.stringify(currentUser));
      startApp();
    } else {
      alert('❌ Неверный пароль');
    }
  });
};

// 🚪 ВЫХОД
document.getElementById('btn-logout').onclick = function() {
  localStorage.removeItem('shpak_user');
  location.reload();
};

// 📱 ЗАПУСК ПРИЛОЖЕНИЯ
function startApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('chat-area').style.display = 'flex';
  document.getElementById('sidebar-user-info').textContent = '👤 ' + currentUser.name;
  
  loadChats();
  joinChat('general');
}

// Проверка сессии
const saved = localStorage.getItem('shpak_user');
if (saved) {
  currentUser = JSON.parse(saved);
  startApp();
}

// 💬 ЗАГРУЗКА СПИСКА ЧАТОВ
function loadChats() {
  const listDiv = document.getElementById('chat-list');
  
  db.ref('chats').on('value', snap => {
    listDiv.innerHTML = '';
    snap.forEach(child => {
      const chat = child.val();
      const chatId = child.key;
      
      if (chat.participants && chat.participants[currentUser.login]) {
        const div = document.createElement('div');
        div.className = 'chat-item' + (chatId === currentChatId ? ' active' : '');
        div.onclick = () => joinChat(chatId);
        div.innerHTML = `
          <div class="chat-avatar">📄</div>
          <div class="chat-info">
            <div class="chat-name">${chat.name}</div>
            <div class="chat-last-message" id="last-${chatId}">Загрузка...</div>
          </div>
        `;
        listDiv.appendChild(div);
      }
    });
  });
}

// 🚪 ВОЙТИ В ЧАТ
function joinChat(chatId) {
  currentChatId = chatId;
  
  // Обновляем активный чат в списке
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  const activeItem = Array.from(document.querySelectorAll('.chat-item')).find(el => el.onclick.toString().includes(chatId));
  if (activeItem) activeItem.classList.add('active');
  
  // Загружаем название чата
  db.ref('chats/' + chatId).once('value').then(snap => {
    document.getElementById('chat-header-name').textContent = snap.val().name;
  });
  
  // Загружаем сообщения
  loadMessages(chatId);
}

// 📜 ЗАГРУЗКА СООБЩЕНИЙ
function loadMessages(chatId) {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';
  
  db.ref('messages/' + chatId).limitToLast(50).on('child_added', snap => {
    const data = snap.val();
    renderMessage(data, snap.key, chatId);
  });
}

// 🎨 ОТРИСОВКА СООБЩЕНИЯ
function renderMessage(data, key, chatId) {
  const messagesDiv = document.getElementById('messages');
  const isMe = data.author === currentUser.login;
  const time = new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message' + (isMe ? ' outgoing' : ' incoming');
  msgDiv.setAttribute('data-key', key);
  
  // Кнопка удаления для админов
  let deleteBtn = '';
  if (currentUser.role === 'admin' || currentUser.role === 'dev') {
    deleteBtn = '<span style="float:right;cursor:pointer;color:#d4753a;" onclick="deleteMessage(\'' + chatId + '\',\'' + key + '\')">🗑️</span>';
  }
  
  let content = '';
  if (data.type === 'image') {
    content = '<img src="' + data.image + '" class="photo-preview" onclick="openPhotoModal(\'' + data.image + '\',\'' + data.author + '\',\'' + time + '\')">';
  } else {
    content = '<div class="message-text"></div>';
  }
  
  msgDiv.innerHTML = `
    ${!isMe ? '<div class="message-author">' + data.author + ' ' + deleteBtn + '</div>' : '<div style="text-align:right">' + deleteBtn + '</div>'}
    ${content}
    <div class="message-meta"><span class="message-time">${time}</span></div>
  `;
  
  messagesDiv.appendChild(msgDiv);
  
  if (data.type === 'text') {
    const textEl = msgDiv.querySelector('.message-text');
    animateDecrypt(textEl, data.text, decrypt(data.text), 50);
  }
  
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  
  // Обновляем последнее сообщение в сайдбаре
  const lastText = data.type === 'text' ? decrypt(data.text).substring(0, 25) : '📷 Фото';
  const lastEl = document.getElementById('last-' + chatId);
  if (lastEl) lastEl.textContent = data.author + ': ' + lastText;
}

// 🗑️ УДАЛИТЬ СООБЩЕНИЕ
function deleteMessage(chatId, msgKey) {
  if (currentUser.role !== 'admin' && currentUser.role !== 'dev') return;
  db.ref('messages/' + chatId + '/' + msgKey).remove();
}

// 💬 ОТПРАВИТЬ СООБЩЕНИЕ
function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text || !currentUser) return;
  
  db.ref('messages/' + currentChatId).push({
    author: currentUser.login,
    text: encrypt(text),
    timestamp: Date.now(),
    type: 'text'
  });
  input.value = '';
  input.focus();
}

document.getElementById('btn-send').onclick = sendMessage;
document.getElementById('msg-input').addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

// 🎬 АНИМАЦИЯ РАСШИФРОВКИ
function animateDecrypt(el, encrypted, decrypted, speed) {
  let i = 0;
  el.classList.add('decrypting');
  const interval = setInterval(() => {
    if (i < decrypted.length) {
      el.textContent = decrypted.substring(0, i+1) + encrypted.substring(i+1);
      i++;
    } else {
      el.textContent = decrypted;
      el.classList.remove('decrypting');
      clearInterval(interval);
    }
  }, speed);
}

// 📎 ПРИКРЕПИТЬ ФОТО
function attachFile() {
  document.getElementById('file-input').click();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    db.ref('messages/' + currentChatId).push({
      author: currentUser.login,
      image: e.target.result,
      timestamp: Date.now(),
      type: 'image'
    });
  };
  reader.readAsDataURL(file);
}

// 🖼️ ПРОСМОТР ФОТО
function openPhotoModal(src, author, time) {
  document.getElementById('modal-image').src = src;
  document.getElementById('modal-info').textContent = '📷 ' + author + ' • ' + time;
  document.getElementById('photo-modal').style.display = 'flex';
}

function closePhotoModal(e) {
  if (!e || e.target.id === 'photo-modal' || e.target.className === 'close-modal') {
    document.getElementById('photo-modal').style.display = 'none';
  }
}

// 😊 ЭМОДЗИ
function toggleEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

function insertEmoji(emoji) {
  document.getElementById('msg-input').value += emoji;
  document.getElementById('emoji-picker').style.display = 'none';
}

// ⋮ МЕНЮ
function toggleMenu() {
  const menu = document.getElementById('menu-dropdown');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  document.getElementById('sidebar-menu').style.display = 'none';
}

function showProfile() {
  closeAllMenus();
  alert('👤 Профиль\n\nЛогин: ' + currentUser.login + '\nИмя: ' + currentUser.name + '\nРоль: ' + currentUser.role);
}

function clearChat() {
  closeAllMenus();
  if (currentUser.role === 'admin' || currentUser.role === 'dev') {
    if (confirm('🗑️ Очистить весь чат?')) {
      db.ref('messages/' + currentChatId).remove();
    }
  } else {
    alert('Только администраторы могут очищать чат');
  }
}

function showAbout() {
  closeAllMenus();
  alert('📄 shpak Message v2.0\n\nБумажный мессенджер с шифрованием\n\nДиректор: Ваня\nРазработчик: Кирилл');
}

function closeAllMenus() {
  document.getElementById('menu-dropdown').style.display = 'none';
  document.getElementById('sidebar-menu').style.display = 'none';
}

// ☰ БОКОВОЕ МЕНЮ
function toggleSidebarMenu() {
  const menu = document.getElementById('sidebar-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  document.getElementById('menu-dropdown').style.display = 'none';
}

// 🔍 ПОИСК
function showSearch() {
  document.getElementById('search-overlay').style.display = 'block';
  document.getElementById('search-input').focus();
}

function closeSearch() {
  document.getElementById('search-overlay').style.display = 'none';
  document.getElementById('search-results').innerHTML = '';
}

function handleSearch(query) {
  const resultsDiv = document.getElementById('search-results');
  if (query.length < 2) {
    resultsDiv.innerHTML = '';
    return;
  }
  
  db.ref('messages/' + currentChatId).limitToLast(50).once('value').then(snap => {
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
          div.innerHTML = '<strong>' + msg.author + ':</strong> ' + text.substring(0, 50);
          div.onclick = () => {
            const el = document.querySelector('[data-key="' + child.key + '"]');
            if (el) {
              el.scrollIntoView({behavior: 'smooth', block: 'center'});
              el.style.border = '2px solid var(--accent)';
              setTimeout(() => el.style.border = '', 2000);
            }
            closeSearch();
          };
          resultsDiv.appendChild(div);
        }
      }
    });
    if (!found) resultsDiv.innerHTML = '<div style="padding:10px;text-align:center;">Ничего не найдено</div>';
  });
}

// ➕ СОЗДАНИЕ ЧАТА
function showNewChatModal() {
  closeAllMenus();
  const modal = document.getElementById('new-chat-modal');
  const list = document.getElementById('user-select-list');
  list.innerHTML = '';
  
  db.ref('users').once('value').then(snap => {
    snap.forEach(child => {
      const login = child.key;
      if (login !== currentUser.login) {
        const div = document.createElement('div');
        div.className = 'user-select-item';
        div.innerHTML = '<input type="checkbox" value="' + login + '" class="user-chk"> ' + login;
        list.appendChild(div);
      }
    });
  });
  
  modal.style.display = 'flex';
}

function closeNewChatModal() {
  document.getElementById('new-chat-modal').style.display = 'none';
}

function createNewChat() {
  const name = document.getElementById('new-chat-name').value.trim();
  if (!name) return alert('Введите название чата');
  
  const checkboxes = document.querySelectorAll('.user-chk:checked');
  if (checkboxes.length === 0) return alert('Выберите участников');
  
  const participants = { [currentUser.login]: true };
  checkboxes.forEach(cb => participants[cb.value] = true);
  
  const newChatRef = db.ref('chats').push();
  newChatRef.set({
    name: name,
    created: Date.now(),
    participants: participants
  });
  
  closeNewChatModal();
  joinChat(newChatRef.key);
}

// Закрытие меню при клике снаружи
document.addEventListener('click', e => {
  if (!e.target.closest('.header-btn') && !e.target.closest('.menu-dropdown')) {
    document.getElementById('menu-dropdown').style.display = 'none';
  }
  if (!e.target.closest('.menu-btn') && !e.target.closest('.sidebar-menu')) {
    document.getElementById('sidebar-menu').style.display = 'none';
  }
});
