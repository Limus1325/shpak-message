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

// 🔐 ШИФР ЦЕЗАРЯ
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

// 🔒 ДАННЫЕ ПОЛЬЗОВАТЕЛЕЙ
const ENCODED_USERS = [
  { l: 'TE1VU1NT', p: 'MjlJN28yMjBP', r: 'root', n: 'Kirill (Creator)' },
  { l: 'R0VORVJBTCBESVJFQ1RPUg==', p: 'YzVndjFhMm4zaTRhNQ==', r: 'admin', n: 'Vanya (Director)' },
  { l: 'VEVTVA==', p: 'MTIzNDU=', r: 'user', n: 'Test User' },
  { l: 'VEVTVDI=', p: 'NTQzMjE=', r: 'user', n: 'Test User 2' }
];

let currentUser = null;
let currentChatId = 'general';
let msgListener = null;
let blockedUsers = [];

// 🚀 ИНИЦИАЛИЗАЦИЯ
async function initDB() {
  for (const u of ENCODED_USERS) {
    const login = atob(u.l);
    const pass = atob(u.p);
    const snap = await db.ref('users/' + login).once('value');
    if (!snap.exists()) {
      await db.ref('users/' + login).set({ password: encrypt(pass), role: u.r, displayName: u.n });
    }
  }
  const gen = await db.ref('chats/general').once('value');
  if (!gen.exists()) {
    await db.ref('chats/general').set({ name: 'Общий чат', created: Date.now(), participants: { 'LIMUSSS': true, 'GENERAL DIRECTOR': true, 'TEST': true, 'TEST2': true } });
  }
  
  // Слушатель блокировок
  db.ref('blocked').on('value', snap => {
    if(currentUser) {
        const userBlocks = snap.val()[currentUser.login] || {};
        blockedUsers = Object.keys(userBlocks);
        loadMessages(currentChatId); // Перезагружаем сообщения при изменении блоков
    }
  });
}
initDB();

// 🔐 ВХОД
function login() {
  const l = document.getElementById('login').value.trim();
  const p = document.getElementById('pass').value.trim();
  if (!l || !p) return alert('Введите данные');

  db.ref('users/' + l).once('value').then(snap => {
    if (!snap.exists()) return alert('❌ Пользователь не найден');
    if (snap.val().password === encrypt(p)) {
      currentUser = { login: l, role: snap.val().role, name: snap.val().displayName || l };
      localStorage.setItem('shpak_user', JSON.stringify(currentUser));
      startApp();
    } else {
      alert('❌ Неверный пароль');
    }
  });
}

function logout() { localStorage.removeItem('shpak_user'); location.reload(); }

function startApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('chat-area').style.display = 'flex';
  document.getElementById('sidebar-user-info').textContent = '👤 ' + currentUser.name;
  if (currentUser.role === 'root') document.getElementById('root-panel').style.display = 'flex';
  
  loadChatsList();
  switchChat('general');
  listenForCalls(); // Запуск слушателя звонков
}

const saved = localStorage.getItem('shpak_user');
if (saved) { try { currentUser = JSON.parse(saved); startApp(); } catch(e) { localStorage.removeItem('shpak_user'); } }

// 💬 ЧАТЫ
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
        div.innerHTML = `<div class="chat-avatar">📄</div><div class="chat-info"><div class="chat-name">${chat.name}</div><div class="chat-last" id="last-${child.key}">...</div></div>`;
        list.appendChild(div);
      }
    });
  });
}

function switchChat(chatId) {
  currentChatId = chatId;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.chat-item').forEach(item => { if(item.onclick.toString().includes(chatId)) item.classList.add('active'); });
  db.ref('chats/' + chatId).once('value').then(s => document.getElementById('chat-header-name').textContent = s.val().name);
  loadMessages(chatId);
}

// 📜 СООБЩЕНИЯ
function loadMessages(chatId) {
  const container = document.getElementById('messages');
  container.innerHTML = '';
  if (msgListener) db.ref('messages/' + currentChatId).off('child_added', msgListener);
  
  msgListener = db.ref('messages/' + chatId).limitToLast(60).on('child_added', snap => {
    const data = snap.val();
    // Если отправитель заблокирован - пропускаем
    if (blockedUsers.includes(data.author)) return; 
    renderMessage(data, snap.key, chatId);
  });
}

function renderMessage(data, key, chatId) {
  const container = document.getElementById('messages');
  const isMe = data.author === currentUser.login;
  const time = new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  
  const div = document.createElement('div');
  div.className = `message ${isMe ? 'outgoing' : 'incoming'}`;
  div.dataset.key = key;

  let delBtn = '';
  if (currentUser.role === 'admin' || currentUser.role === 'root') {
    delBtn = `<span class="del-btn" onclick="deleteMsg('${chatId}','${key}')">🗑️</span>`;
  }

  let content = data.type === 'image' 
    ? `<img src="${data.image}" class="photo-preview" onclick="openPhoto('${data.image}','${data.author}','${time}')">`
    : '<div class="msg-text"></div>';

  div.innerHTML = `
    ${!isMe ? `<div class="msg-author">${data.author} ${delBtn}</div>` : `<div class="msg-head-right" style="text-align:right">${delBtn}</div>`}
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
  if (currentUser.role === 'root' && document.getElementById('force-input').value.trim() !== '') {
    author = document.getElementById('force-input').value.trim();
  }

  db.ref('messages/' + currentChatId).push({
    author, text: encrypt(text), timestamp: Date.now(), type: 'text', role: currentUser.role
  }).then(() => { input.value = ''; input.focus(); });
}

function deleteMsg(chatId, key) {
  if (currentUser.role !== 'admin' && currentUser.role !== 'root') return;
  if (confirm('Удалить?')) db.ref('messages/' + chatId + '/' + key).remove();
}

function animateDecrypt(el, enc, dec, speed) {
  let i = 0; 
  const int = setInterval(() => {
    if (i < dec.length) { el.textContent = dec.substring(0, i+1) + enc.substring(i+1); i++; }
    else { el.textContent = dec; clearInterval(int); }
  }, speed);
}
// ==========================================
// ️ МОДАЛКИ И UI
// ==========================================

function triggerFile() { document.getElementById('file-input').click(); }

function handleFile(e) {
  const file = e.target.files[0]; 
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => db.ref('messages/' + currentChatId).push({ 
    author: currentUser.login, 
    image: ev.target.result, 
    timestamp: Date.now(), 
    type: 'image' 
  });
  reader.readAsDataURL(file);
}

function openPhoto(src, author, time) {
  document.getElementById('modal-img').src = src;
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

function closeSearch() { 
  document.getElementById('search-overlay').style.display = 'none'; 
}

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
          const d = document.createElement('div'); d.className = 'search-item';
          d.innerHTML = `<b>${m.author}:</b> ${txt.substring(0,40)}...`;
          d.onclick = () => {
            const el = document.querySelector(`[data-key="${child.key}"]`);
            if (el) { 
              el.scrollIntoView({behavior:'smooth', block:'center'}); 
              el.style.outline = '2px solid var(--accent)'; 
              setTimeout(() => el.style.outline = '', 2000); 
            }
            closeSearch();
          };
          resDiv.appendChild(d);
        }
      }
    });
    if (!found) resDiv.innerHTML = '<div class="search-item">Ничего не найдено</div>';
  });
}

function closeAllMenus() { 
  document.getElementById('profile-menu').style.display = 'none';
  document.getElementById('chat-menu').style.display = 'none';
}

function toggleProfileMenu() {
  const menu = document.getElementById('profile-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  document.getElementById('chat-menu').style.display = 'none';
}

function toggleChatMenu() {
  const menu = document.getElementById('chat-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  document.getElementById('profile-menu').style.display = 'none';
}

function showProfile() {
  closeAllMenus();
  alert(`👤 Профиль\nLogin: ${currentUser.login}\nRole: ${currentUser.role.toUpperCase()}`);
}

function clearChat() { 
  closeAllMenus(); 
  if (currentUser.role === 'admin' || currentUser.role === 'root') { 
    if (confirm('🗑️ Очистить чат?')) db.ref('messages/' + currentChatId).remove(); 
  } else alert('Нет прав'); 
}

function showAbout() { closeAllMenus(); alert('📄 shpak Message v4.0\nSecure Encrypted Calls'); }

// ==========================================
// ⚙️ НАСТРОЙКИ ЧАТА (⋮)
// ==========================================

function blockCurrentUser() {
  closeAllMenus();
  // В реальном чате тут нужно выбрать конкретного пользователя, 
  // но для упрощения заблокируем случайного собеседника или покажем алерт
  // Для полноценной реализации нужно получать список участников чата.
  // Сейчас просто пример логики:
  const target = prompt("Введите логин пользователя для блокировки:");
  if (target) {
    db.ref('blocked/' + currentUser.login + '/' + target).set(true);
    alert('🚫 ' + target + ' заблокирован!');
    loadMessages(currentChatId);
  }
}

function deleteCurrentChat() {
  closeAllMenus();
  if (confirm('🗑️ Удалить этот чат навсегда?')) {
    db.ref('chats/' + currentChatId).remove();
    db.ref('messages/' + currentChatId).remove();
    // Переход в общий чат
    switchChat('general');
  }
}

// ==========================================
// ➕ СОЗДАНИЕ ЧАТА
// ==========================================

function openNewChatModal() {
  closeAllMenus();
  const list = document.getElementById('user-list'); list.innerHTML = '';
  db.ref('users').once('value').then(snap => {
    snap.forEach(child => {
      const login = child.key;
      if (login !== currentUser.login) {
        const d = document.createElement('label'); d.className = 'user-chk-item';
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

// ==========================================
// 🛠️ ROOT TOOLS
// ==========================================
function showSystemInfo() { alert(`📊 System Info\nUser: ${currentUser.login}\nRole: ${currentUser.role.toUpperCase()}\nMode: GOD MODE`); }
function forceClearDB() { if (confirm('⚠️ NUKE MODE?')) db.ref('messages/' + currentChatId).remove(); }

// ==========================================
// 📞 ЗВОНКИ (WebRTC + Encrypted Signaling)
// ==========================================

let localStream;
let peerConnection;
let callId = null;
let callListener = null;

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Запуск слушателя входящих звонков
function listenForCalls() {
  if (callListener) db.ref('calls').off('child_added', callListener);
  
  callListener = db.ref('calls').orderByChild('to').equalTo(currentUser.login).on('child_added', snap => {
    const callData = snap.val();
    if (callData.status === 'offering' && callData.id !== 'ended') {
      // Входящий звонок
      if (confirm(`📞 Входящий звонок от ${callData.from}! Принять?`)) {
        acceptCall(snap.key, callData);
      } else {
        // Отклонить
        db.ref('calls/' + snap.key).update({ status: 'rejected' });
      }
    }
  });
}

async function startCall() {
  // 1. Спрашиваем, кому звоним
  let targetUser = prompt("Введите логин того, кому звоним:");
  if (!targetUser) return;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    document.getElementById('call-overlay').style.display = 'flex';
    document.getElementById('call-status').textContent = 'Вызов...';
    
    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    peerConnection.ontrack = event => {
      document.getElementById('remote-audio').srcObject = event.streams[0];
      document.getElementById('call-status').textContent = 'Разговор';
      startCallTimer();
    };
    
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        db.ref('calls/active/' + callId + '/candidates').push(encrypt(JSON.stringify(event.candidate.toJSON())));
      }
    };
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    callId = db.ref('calls').push().key;
    const activeCallId = db.ref('calls/active').push().key;

    // 2. Используем введенный логин вместо 'GENERAL DIRECTOR'
    db.ref('calls/' + callId).set({
      from: currentUser.login,
      to: targetUser, 
      status: 'offering',
      activeRef: activeCallId
    });
    
    db.ref('calls/active/' + activeCallId).set({
      type: 'offer',
      sdp: encrypt(offer.sdp),
      caller: currentUser.login
    });
    
    db.ref('calls/' + callId + '/status').on('value', snap => {
      if (snap.val() === 'answered') {
        db.ref('calls/active/' + activeCallId).once('value').then(s => {
          const data = s.val();
          if (data && data.answerSdp) {
            const answer = { type: 'answer', sdp: decrypt(data.answerSdp) };
            peerConnection.setRemoteDescription(answer);
          }
        });
        
        db.ref('calls/active/' + activeCallId + '/candidates').on('child_added', cSnap => {
          const candidate = JSON.parse(decrypt(cSnap.val()));
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        });
      }
    });

  } catch (err) {
    alert('❌ Ошибка доступа к микрофону: ' + err.message);
  }
}
async function acceptCall(id, data) {
  callId = id;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    document.getElementById('call-overlay').style.display = 'flex';
    
    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    peerConnection.ontrack = event => {
      document.getElementById('remote-audio').srcObject = event.streams[0];
      document.getElementById('call-status').textContent = 'Разговор';
      startCallTimer();
    };
    
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        db.ref('calls/active/' + data.activeRef + '/candidates').push(encrypt(JSON.stringify(event.candidate.toJSON())));
      }
    };
    
    // Получаем Offer (расшифровываем)
    const offerSdp = await db.ref('calls/active/' + data.activeRef + '/sdp').once('value').then(s => decrypt(s.val()));
    await peerConnection.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    
    // Создаем Answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    // Сохраняем зашифрованный Answer
    db.ref('calls/active/' + data.activeRef).update({
      answerSdp: encrypt(answer.sdp)
    });
    
    // Меняем статус на answered
    db.ref('calls/' + id).update({ status: 'answered' });
    
    // Слушаем ICE кандидаты звонящего
    db.ref('calls/active/' + data.activeRef + '/candidates').on('child_added', cSnap => {
      const candidate = JSON.parse(decrypt(cSnap.val()));
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });
    
  } catch (err) {
    alert('Ошибка принятия звонка: ' + err.message);
  }
}

function endCall() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  if (peerConnection) {
    peerConnection.close();
  }
  
  document.getElementById('call-overlay').style.display = 'none';
  document.getElementById('remote-audio').srcObject = null;
  clearInterval(callTimerInterval);
  
  if (callId) {
    db.ref('calls/' + callId).update({ status: 'ended' });
    // Очистка активных данных (опционально)
  }
  callId = null;
}

function toggleMute() {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    const btn = document.querySelector('.mute-btn');
    btn.classList.toggle('muted');
    btn.textContent = audioTrack.enabled ? '🎤' : '🔇';
  }
}

let callSeconds = 0;
let callTimerInterval = null;
function startCallTimer() {
  callSeconds = 0;
  if (callTimerInterval) clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callSeconds++;
    const m = Math.floor(callSeconds / 60).toString().padStart(2, '0');
    const s = (callSeconds % 60).toString().padStart(2, '0');
    document.getElementById('call-timer').textContent = `${m}:${s}`;
  }, 1000);
}

// Привязка событий
document.getElementById('btn-enter').onclick = login;
document.getElementById('btn-logout').onclick = logout;
document.getElementById('btn-send').onclick = sendMessage;
document.getElementById('msg-input').addEventListener('keypress', e => { if(e.key==='Enter') sendMessage(); });
document.getElementById('pass').addEventListener('keypress', e => { if(e.key==='Enter') login(); });
