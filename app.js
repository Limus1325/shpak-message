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

// 🔐 ШИФР ЦЕЗАРЯ (+3 / -3)
function encrypt(text) {
  if (!text) return "";
  let res = "";
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 65 && c <= 90) res += String.fromCharCode(((c - 65 + 3) % 26 + 26) % 26 + 65);
    else if (c >= 97 && c <= 122) res += String.fromCharCode(((c - 97 + 3) % 26 + 26) % 26 + 97);
    else if (c >= 1040 && c <= 1071) res += String.fromCharCode(((c - 1040 + 3) % 32 + 32) % 32 + 1040);
    else if (c >= 1072 && c <= 1103) res += String.fromCharCode(((c - 1072 + 3) % 32 + 32) % 32 + 1072);
    else if (c === 1025) res += String.fromCharCode(((0 + 3) % 32 + 32) % 32 + 1040);
    else if (c === 1105) res += String.fromCharCode(((0 + 3) % 32 + 32) % 32 + 1072);
    else if (c >= 48 && c <= 57) res += String.fromCharCode(((c - 48 + 3) % 10 + 10) % 10 + 48);
    else res += text[i];
  }
  return res;
}

function decrypt(text) {
  if (!text) return "";
  let res = "";
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 65 && c <= 90) res += String.fromCharCode(((c - 65 - 3) % 26 + 26) % 26 + 65);
    else if (c >= 97 && c <= 122) res += String.fromCharCode(((c - 97 - 3) % 26 + 26) % 26 + 97);
    else if (c >= 1040 && c <= 1071) res += String.fromCharCode(((c - 1040 - 3) % 32 + 32) % 32 + 1040);
    else if (c >= 1072 && c <= 1103) res += String.fromCharCode(((c - 1072 - 3) % 32 + 32) % 32 + 1072);
    else if (c === 1025) res += String.fromCharCode(((0 - 3) % 32 + 32) % 32 + 1040);
    else if (c === 1105) res += String.fromCharCode(((0 - 3) % 32 + 32) % 32 + 1072);
    else if (c >= 48 && c <= 57) res += String.fromCharCode(((c - 48 - 3) % 10 + 10) % 10 + 48);
    else res += text[i];
  }
  return res;
}

// 🔒 ЗАШИФРОВАННЫЕ УЧЕТНЫЕ ДАННЫЕ (Base64 Obfuscation)
// В исходном коде нет открытых паролей. Декодируются только в runtime.
const ENCODED_USERS = [
  { l: 'TE1VU1NT', p: 'MjlJN28yMjBP', r: 'root', n: 'Kirill (Creator)' },
  { l: 'R0VORVJBTCBESVJFQ1RPUg==', p: 'YzVndjFhMm4zaTRhNQ==', r: 'admin', n: 'Vanya (Director)' },
  { l: 'VEVTVA==', p: 'MTIzNDU=', r: 'user', n: 'Test User' },
  { l: 'VEVTVDI=', p: 'NTQzMjE=', r: 'user', n: 'Test User 2' }
];

let currentUser = null;
let currentChatId = 'general';
let msgListener = null;

// 🚀 ИНИЦИАЛИЗАЦИЯ БД
async function initDB() {
  for (const u of ENCODED_USERS) {
    const login = atob(u.l); // Декодируем логин
    const pass = atob(u.p);  // Декодируем пароль
    
    const snap = await db.ref('users/' + login).once('value');
    if (!snap.exists()) {
      await db.ref('users/' + login).set({
        password: encrypt(pass), // Шифруем перед записью в Firebase
        role: u.r,
        displayName: u.n
      });
    }
  }
  
  const gen = await db.ref('chats/general').once('value');
  if (!gen.exists()) {
    await db.ref('chats/general').set({
      name: 'Общий чат',
      created: Date.now(),
      participants: { 'LIMUSSS': true, 'GENERAL DIRECTOR': true, 'TEST': true, 'TEST2': true }
    });
  }
}
initDB();

// 🔐 АВТОРИЗАЦИЯ
function login() {
  const l = document.getElementById('login').value.trim();
  const p = document.getElementById('pass').value.trim();
  if (!l || !p) return alert('Введите логин и пароль');

  db.ref('users/' + l).once('value').then(snap => {
    if (!snap.exists()) return alert('❌ Пользователь не найден');
    if (snap.val().password === encrypt(p)) {
      currentUser = { login: l, role: snap.val().role, name: snap.val().displayName || l };
      localStorage.setItem('shpak_user', JSON.stringify(currentUser));
      startApp();
    } else {
      alert('❌ Неверный пароль');
    }
  }).catch(err => alert('❌ Ошибка сети: ' + err.message));
}

function logout() {
  localStorage.removeItem('shpak_user');
  location.reload();
}

function startApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('chat-area').style.display = 'flex';
  document.getElementById('sidebar-user-info').textContent = '👤 ' + currentUser.name;
  
  // Активируем панель GOD MODE только для ROOT
  if (currentUser.role === 'root') {
    document.getElementById('root-panel').style.display = 'flex';
  }

  loadChatsList();
  switchChat('general');
}

// Авто-вход
const saved = localStorage.getItem('shpak_user');
if (saved) {
  try {
    currentUser = JSON.parse(saved);
    startApp();
  } catch(e) { localStorage.removeItem('shpak_user'); }
}

// ==========================================
// 💬 ЧАТЫ
// ==========================================
function loadChatsList() {
  const list = document.getElementById('chat-list');
  db.ref('chats').on('value', snap => {
    list.innerHTML = '';
    snap.forEach(child => {
      const chat = child.val();
      if (chat.participants && chat.participants[currentUser.login]) {
        const div = document.createElement('div');
        div.className = 'chat-item' + (child.key === currentChatId ? ' active' : '');
        div.onclick = () => switchChat(child.key);
        div.innerHTML = `
          <div class="chat-avatar">📄</div>
          <div class="chat-info">
            <div class="chat-name">${chat.name}</div>
            <div class="chat-last" id="last-${child.key}">Загрузка...</div>
          </div>`;
        list.appendChild(div);
      }
    });
  });
}

function switchChat(chatId) {
  currentChatId = chatId;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  const items = document.querySelectorAll('.chat-item');
  items.forEach(item => {
    if (item.onclick.toString().includes(chatId)) item.classList.add('active');
  });

  db.ref('chats/' + chatId).once('value').then(s => {
    document.getElementById('chat-header-name').textContent = s.val().name;
  });

  loadMessages(chatId);
}

// ==========================================
// 📜 СООБЩЕНИЯ
// ==========================================
function loadMessages(chatId) {
  const container = document.getElementById('messages');
  container.innerHTML = '';
  if (msgListener) db.ref('messages/' + currentChatId).off('child_added', msgListener);

  msgListener = db.ref('messages/' + chatId).limitToLast(60).on('child_added', snap => {
    renderMessage(snap.val(), snap.key, chatId);
  });
}

function renderMessage(data, key, chatId) {
  const container = document.getElementById('messages');
  const isMe = data.author === currentUser.login;
  const time = new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  
  const div = document.createElement('div');
  const isRootMsg = data.role === 'root';
  div.className = `message ${isMe ? 'outgoing' : 'incoming'} ${isRootMsg ? 'root-message' : ''}`;
  div.dataset.key = key;

  let delBtn = '';
  if (currentUser.role === 'admin' || currentUser.role === 'root') {
    delBtn = `<span class="del-btn" onclick="deleteMsg('${chatId}','${key}')">🗑️</span>`;
  }

  let content = '';
  if (data.type === 'image') {
    content = `<img src="${data.image}" class="photo-preview" onclick="openPhoto('${data.image}','${data.author}','${time}')">`;
  } else {
    content = '<div class="msg-text"></div>';
  }

  div.innerHTML = `
    ${!isMe ? `<div class="msg-author">${data.author} ${delBtn}</div>` : `<div class="msg-head-right">${delBtn}</div>`}
    ${content}
    <div class="msg-meta"><span>${time}</span></div>
  `;
  container.appendChild(div);

  if (data.type === 'text') {
    const txtEl = div.querySelector('.msg-text');
    animateDecrypt(txtEl, data.text, decrypt(data.text), 40);
  }
  container.scrollTop = container.scrollHeight;

  const lastEl = document.getElementById('last-' + chatId);
  if (lastEl) {
    const preview = data.type === 'text' ? decrypt(data.text).substring(0, 20) + '...' : '📷 Фото';
    lastEl.textContent = data.author + ': ' + preview;
  }
}

function sendMessage() {
  if (!currentUser || !currentChatId) return;
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;

  let author = currentUser.login;
  // ROOT может писать от имени других
  if (currentUser.role === 'root' && document.getElementById('force-input').value.trim() !== '') {
    author = document.getElementById('force-input').value.trim();
  }

  db.ref('messages/' + currentChatId).push({
    author: author,
    text: encrypt(text),
    timestamp: Date.now(),
    type: 'text',
    role: currentUser.role
  }).then(() => {
    input.value = '';
    input.focus();
  }).catch(err => alert('❌ Ошибка отправки: ' + err.message));
}

function deleteMsg(chatId, key) {
  if (currentUser.role !== 'admin' && currentUser.role !== 'root') return;
  if (confirm('Удалить сообщение?')) {
    db.ref('messages/' + chatId + '/' + key).remove();
  }
}

function animateDecrypt(el, enc, dec, speed) {
  let i = 0;
  el.classList.add('decrypting');
  const int = setInterval(() => {
    if (i < dec.length) {
      el.textContent = dec.substring(0, i+1) + enc.substring(i+1);
      i++;
    } else {
      el.textContent = dec;
      el.classList.remove('decrypting');
      clearInterval(int);
    }
  }, speed);
}

// ==========================================
// 🛠️ ROOT TOOLS (LIMUSSS)
// ==========================================
function showSystemInfo() {
  alert(`📊 System Info\nUser: ${currentUser.login}\nRole: ${currentUser.role.toUpperCase()}\nChat ID: ${currentChatId}\nPermissions: GOD MODE ACTIVE`);
}

function forceClearDB() {
  if (confirm('⚠️ NUKE MODE: Удалить ВСЕ сообщения в этом чате?')) {
    db.ref('messages/' + currentChatId).remove();
  }
}

// ==========================================
// 🖼️ & 📎 & 😊 & 🔍 & ⋮ & ☰
// ==========================================
function triggerFile() { document.getElementById('file-input').click(); }
function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    db.ref('messages/' + currentChatId).push({
      author: currentUser.login,
      image: ev.target.result,
      timestamp: Date.now(),
      type: 'image'
    });
  };
  reader.readAsDataURL(file);
}
function openPhoto(src, author, time) {
  document.getElementById('modal-img').src = src;
  document.getElementById('modal-info').textContent = `📷 ${author} • ${time}`;
  document.getElementById('photo-modal').style.display = 'flex';
}
function closePhotoModal(e) {
  if (!e || e.target.id === 'photo-modal' || e.target.className === 'close-btn') {
    document.getElementById('photo-modal').style.display = 'none';
  }
}
function toggleEmoji() {
  const p = document.getElementById('emoji-picker');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}
function insertEmoji(em) {
  document.getElementById('msg-input').value += em;
  document.getElementById('emoji-picker').style.display = 'none';
}
function openSearch() {
  document.getElementById('search-overlay').style.display = 'block';
  document.getElementById('search-input').focus();
}
function closeSearch() { document.getElementById('search-overlay').style.display = 'none'; }
function handleSearch(q) {
  const resDiv = document.getElementById('search-results');
  if (q.length < 2) { resDiv.innerHTML = ''; return; }
  db.ref('messages/' + currentChatId).limitToLast(50).once('value').then(snap => {
    resDiv.innerHTML = '';
    let found = false;
    snap.forEach(child => {
      const m = child.val();
      if (m.type === 'text') {
        const txt = decrypt(m.text);
        if (txt.toLowerCase().includes(q.toLowerCase())) {
          found = true;
          const d = document.createElement('div');
          d.className = 'search-item';
          d.innerHTML = `<b>${m.author}:</b> ${txt.substring(0,40)}...`;
          d.onclick = () => {
            const el = document.querySelector(`[data-key="${child.key}"]`);
            if (el) { el.scrollIntoView({behavior:'smooth', block:'center'}); el.style.outline = '2px solid gold'; setTimeout(() => el.style.outline = '', 2000); }
            closeSearch();
          };
          resDiv.appendChild(d);
        }
      }
    });
    if (!found) resDiv.innerHTML = '<div class="search-item">Ничего не найдено</div>';
  });
}

function toggleMenu() {
  document.getElementById('menu-dropdown').style.display = 
    document.getElementById('menu-dropdown').style.display === 'none' ? 'block' : 'none';
  document.getElementById('sidebar-menu').style.display = 'none';
}
function toggleSidebar() {
  document.getElementById('sidebar-menu').style.display = 
    document.getElementById('sidebar-menu').style.display === 'none' ? 'block' : 'none';
  document.getElementById('menu-dropdown').style.display = 'none';
}
function closeAllMenus() {
  document.getElementById('menu-dropdown').style.display = 'none';
  document.getElementById('sidebar-menu').style.display = 'none';
}
function clearChat() {
  closeAllMenus();
  if (currentUser.role === 'admin' || currentUser.role === 'root') {
    if (confirm('🗑️ Очистить весь чат?')) db.ref('messages/' + currentChatId).remove();
  } else { alert('Нет прав'); }
}
function showProfile() {
  closeAllMenus();
  alert(`👤 Профиль\nLogin: ${currentUser.login}\nRole: ${currentUser.role.toUpperCase()}\nPower: ${currentUser.role === 'root' ? 'INFINITE' : 'LIMITED'}`);
}
function showAbout() { closeAllMenus(); alert('📄 shpak Message v3.1\nSecure Paper Protocol'); }
function openNewChatModal() {
  closeAllMenus();
  const list = document.getElementById('user-list');
  list.innerHTML = '';
  db.ref('users').once('value').then(snap => {
    snap.forEach(child => {
      const login = child.key;
      if (login !== currentUser.login) {
        const d = document.createElement('label');
        d.className = 'user-chk-item'; d.style.display='block'; d.style.padding='5px';
        d.innerHTML = `<input type="checkbox" value="${login}"> ${login}`;
        list.appendChild(d);
      }
    });
  });
  document.getElementById('new-chat-modal').style.display = 'flex';
}
function closeNewChatModal() { document.getElementById('new-chat-modal').style.display = 'none'; }
function createChat() {
  const name = document.getElementById('new-chat-name').value.trim();
  if (!name) return alert('Введите название');
  const checks = document.querySelectorAll('#user-list input:checked');
  if (checks.length === 0) return alert('Выберите участников');
  const parts = { [currentUser.login]: true };
  checks.forEach(c => parts[c.value] = true);
  const ref = db.ref('chats').push();
  ref.set({ name, created: Date.now(), participants: parts }).then(() => {
    closeNewChatModal(); switchChat(ref.key);
  });
}

// Привязка событий
document.getElementById('btn-enter').onclick = login;
document.getElementById('btn-logout').onclick = logout;
document.getElementById('btn-send').onclick = sendMessage;
document.getElementById('msg-input').addEventListener('keypress', e => { if(e.key==='Enter') sendMessage(); });
document.getElementById('pass').addEventListener('keypress', e => { if(e.key==='Enter') login(); });
