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
// 🔐 ШИФР ЦЕЗАРЯ (+3 / -3)
// ==========================================
function caesarCipher(text, shift) {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    // A-Z
    if (code >= 65 && code <= 90) result += String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
    // a-z
    else if (code >= 97 && code <= 122) result += String.fromCharCode(((code - 97 + shift) % 26 + 26) % 26 + 97);
    // А-Я
    else if (code >= 1040 && code <= 1071) result += String.fromCharCode(((code - 1040 + shift) % 32 + 32) % 32 + 1040);
    // а-я
    else if (code >= 1072 && code <= 1103) result += String.fromCharCode(((code - 1072 + shift) % 32 + 32) % 32 + 1072);
    // Ёё
    else if (code === 1025) result += String.fromCharCode(((0 + shift) % 32 + 32) % 32 + 1040);
    else if (code === 1105) result += String.fromCharCode(((0 + shift) % 32 + 32) % 32 + 1072);
    // 0-9
    else if (code >= 48 && code <= 57) result += String.fromCharCode(((code - 48 + shift) % 10 + 10) % 10 + 48);
    else result += char;
  }
  return result;
}

function encrypt(text) { return caesarCipher(text, 3); }
function decrypt(text) { return caesarCipher(text, -3); }

// ==========================================
// 🎭 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==========================================
let currentUser = null;
let currentChatId = 'general'; // ID текущего чата
let chatsListener = null;
let messagesListener = null;

// Предустановленные пользователи
const DEFAULT_USERS = [
    { login: 'Vanya', pass: 'admin123', role: 'admin', name: 'Ваня (Директор)' },
    { login: 'Kirill', pass: 'dev123', role: 'dev', name: 'Кирилл (Разраб)' },
    { login: 'TEST', pass: '12345', role: 'user', name: 'Test User 1' },
    { login: 'TEST2', pass: '54321', role: 'user', name: 'Test User 2' }
];

// ==========================================
// 📂 ИНИЦИАЛИЗАЦИЯ БАЗЫ
// ==========================================
async function initDB() {
    // Создаем пользователей, если их нет
    for (const user of DEFAULT_USERS) {
        const snap = await db.ref('users/' + user.login).once('value');
        if (!snap.exists()) {
            await db.ref('users/' + user.login).set({
                password: encrypt(user.pass),
                role: user.role,
                displayName: user.name
            });
        }
    }

    // Создаем общий чат, если его нет
    const generalSnap = await db.ref('chats/general').once('value');
    if (!generalSnap.exists()) {
        await db.ref('chats/general').set({
            name: 'Общий чат',
            created: Date.now(),
            participants: { 'Vanya': true, 'Kirill': true, 'TEST': true, 'TEST2': true }
        });
    }
}
initDB();

// ==========================================
// 🔐 АВТОРИЗАЦИЯ
// ==========================================
function login() {
  const l = document.getElementById('login').value.trim();
  const p = document.getElementById('pass').value.trim();
  
  if (!l || !p) return alert('Введите логин и пароль');

  db.ref('users/' + l).once('value').then(snap => {
    if (!snap.exists()) return alert('❌ Пользователь не найден');
    
    if (snap.val().password === encrypt(p)) {
      currentUser = {
          login: l,
          role: snap.val().role,
          name: snap.val().displayName || l
      };
      localStorage.setItem('shpak_user_json', JSON.stringify(currentUser));
      startApp();
    } else {
      alert('❌ Неверный пароль');
    }
  });
}

function logout() {
  localStorage.removeItem('shpak_user_json');
  location.reload();
}

function startApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('sidebar').style.display = 'flex';
    document.getElementById('chat-area').style.display = 'flex';
    document.getElementById('sidebar-user-info').textContent = `👤 ${currentUser.name}`;
    
    loadChatsList();
    joinChat('general'); // По умолчанию входим в общий чат
}

// Проверка сессии
const savedUser = localStorage.getItem('shpak_user_json');
if (savedUser) {
    currentUser = JSON.parse(savedUser);
    startApp();
}

// ==========================================
// 💬 СИСТЕМА ЧАТОВ
// ==========================================

// Загрузка списка чатов в сайдбар
function loadChatsList() {
    const listDiv = document.getElementById('chat-list');
    listDiv.innerHTML = '';

    db.ref('chats').on('value', snap => {
        listDiv.innerHTML = '';
        snap.forEach(child => {
            const chat = child.val();
            const chatId = child.key;
            
            // Проверяем, есть ли текущий юзер в участниках
            if (chat.participants && chat.participants[currentUser.login]) {
                const div = document.createElement('div');
                div.className = `chat-item ${chatId === currentChatId ? 'active' : ''}`;
                div.onclick = () => joinChat(chatId);
                div.innerHTML = `
                    <div class="chat-avatar">📄</div>
                    <div class="chat-info">
                        <div class="chat-top">
                            <div class="chat-name">${chat.name}</div>
                        </div>
                        <div class="chat-last-message" id="last-msg-${chatId}">Загрузка...</div>
                    </div>
                `;
                listDiv.appendChild(div);
            }
        });
    });
}

// Вход в конкретный чат
function joinChat(chatId) {
    currentChatId = chatId;
    
    // Обновляем UI активного чата
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    // (Простой хак для подсветки, в реальном проекте лучше через ID)
    
    // Очищаем старые слушатели сообщений
    if (messagesListener) db.ref(`messages/${currentChatId}`).off('child_added', messagesListener);

    // Загружаем заголовок чата
    db.ref(`chats/${chatId}`).once('value').then(snap => {
        const chatName = snap.val().name;
        document.querySelector('.chat-header-name').textContent = chatName;
    });

    loadMessages(chatId);
}

// Загрузка сообщений конкретного чата
function loadMessages(chatId) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';

    messagesListener = db.ref(`messages/${chatId}`).limitToLast(50).on('child_added', snap => {
        const data = snap.val();
        renderMessage(data, snap.key);
    });
}

// Отрисовка одного сообщения
function renderMessage(data, key) {
    const messagesDiv = document.getElementById('messages');
    const isMe = data.author === currentUser.login;
    const time = new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isMe ? 'outgoing' : 'incoming'}`;
    msgDiv.setAttribute('data-key', key);

    // Кнопка удаления для Админа/Разраба
    let deleteBtn = '';
    if (currentUser.role === 'admin' || currentUser.role === 'dev') {
        deleteBtn = `<span style="float:right; cursor:pointer; color:red;" onclick="deleteMessage('${currentChatId}', '${key}')">🗑️</span>`;
    }

    let contentHtml = '';
    if (data.type === 'image') {
        contentHtml = `<img src="${data.image}" class="photo-preview" onclick="openPhotoModal('${data.image}', '${data.author}', '${time}')">`;
    } else {
        contentHtml = `<div class="message-text"></div>`;
    }

    msgDiv.innerHTML = `
        ${!isMe ? `<div class="message-author">${data.author} ${deleteBtn}</div>` : `<div style="text-align:right">${deleteBtn}</div>`}
        ${contentHtml}
        <div class="message-meta">
            <span class="message-time">${time}</span>
        </div>
    `;
    
    messagesDiv.appendChild(msgDiv);

    if (data.type === 'text') {
        const textEl = msgDiv.querySelector('.message-text');
        animateDecrypt(textEl, data.text, decrypt(data.text), 50);
    }
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Удаление сообщения (только для админов)
function deleteMessage(chatId, msgKey) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'dev') return;
    if (confirm('Удалить это сообщение?')) {
        db.ref(`messages/${chatId}/${msgKey}`).remove();
    }
}

// Отправка сообщения в ТЕКУЩИЙ чат
function sendMessage() {
    const text = document.getElementById('msg-input').value.trim();
    if (!text || !currentUser) return;
    
    db.ref(`messages/${currentChatId}`).push({
        author: currentUser.login,
        text: encrypt(text),
        timestamp: Date.now(),
        type: 'text'
    });
    document.getElementById('msg-input').value = '';
}

// ==========================================
// 🆕 СОЗДАНИЕ НОВЫХ ЧАТОВ
// ==========================================

function showNewChatModal() {
    const modal = document.getElementById('new-chat-modal');
    const list = document.getElementById('user-select-list');
    list.innerHTML = '';
    
    // Загружаем всех пользователей для выбора
    db.ref('users').once('value').then(snap => {
        snap.forEach(child => {
            const uLogin = child.key;
            if (uLogin !== currentUser.login) { // Не показываем себя
                const div = document.createElement('div');
                div.className = 'user-select-item';
                div.innerHTML = `
                    <input type="checkbox" value="${uLogin}" class="user-checkbox">
                    <span>${uLogin}</span>
                `;
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
    
    const checkboxes = document.querySelectorAll('.user-checkbox:checked');
    if (checkboxes.length === 0) return alert('Выберите хотя бы одного участника');
    
    const participants = { [currentUser.login]: true };
    checkboxes.forEach(cb => {
        participants[cb.value] = true;
    });
    
    const newChatRef = db.ref('chats').push();
    newChatRef.set({
        name: name,
        created: Date.now(),
        participants: participants
    });
    
    closeNewChatModal();
    // Автоматически переходим в новый чат
    joinChat(newChatRef.key);
}

// ==========================================
// 🖼️ ФОТО И ЭМОДЗИ (Без изменений логики)
// ==========================================
function attachFile() { document.getElementById('file-input').click(); }
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        db.ref(`messages/${currentChatId}`).push({
            author: currentUser.login,
            image: e.target.result,
            timestamp: Date.now(),
            type: 'image'
        });
    };
    reader.readAsDataURL(file);
}

function openPhotoModal(src, author, time) {
    document.getElementById('modal-image').src = src;
    document.getElementById('modal-info').textContent = `📷 Фото от ${author} • ${time}`;
    document.getElementById('photo-modal').style.display = 'flex';
}
function closePhotoModal(e) {
    if (e && e.target.id !== 'photo-modal' && e.target.className !== 'close-modal') return;
    document.getElementById('photo-modal').style.display = 'none';
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}
function insertEmoji(emoji) {
    document.getElementById('msg-input').value += emoji;
    document.getElementById('emoji-picker').style.display = 'none';
}

// ==========================================
// 🔍 ПОИСК И МЕНЮ (Базовая логика)
// ==========================================
function showSearch() { alert('Поиск по текущему чату: в разработке'); }
function showMenu() { 
    const menu = document.getElementById('menu-dropdown');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}
function clearChat() {
    if (currentUser.role === 'admin' || currentUser.role === 'dev') {
        if(confirm('Очистить весь чат?')) db.ref(`messages/${currentChatId}`).remove();
    } else {
        alert('Только Админ или Разработчик могут очищать чат');
    }
}
function showAbout() {
    alert(`shpak Message v2.0\nUser: ${currentUser.name}\nRole: ${currentUser.role}`);
}

// Привязка кнопок
document.getElementById('btn-enter').onclick = login;
document.getElementById('btn-logout').onclick = logout;
document.getElementById('btn-send').onclick = sendMessage;
document.getElementById('msg-input').addEventListener('keypress', e => { if(e.key==='Enter') sendMessage(); });
