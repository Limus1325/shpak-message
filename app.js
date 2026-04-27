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
// 🔐 ШИФР И УТИЛИТЫ
// ==========================================
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

// ==========================================
// 👥 ПОЛЬЗОВАТЕЛИ
// ==========================================
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

// 🚪 ФУНКЦИЯ ВЫХОДА (ГЛОБАЛЬНАЯ)
function logout() {
  localStorage.removeItem('shpak_user');
  location.reload();
}

// ==========================================
// 🚀 ИНИЦИАЛИЗАЦИЯ
// ==========================================
async function initDB() {
  for (const u of ENCODED_USERS) {
    const login = atob(u.l), pass = atob(u.p);
    const snap = await db.ref('users/' + login).once('value');
    if (!snap.exists()) await db.ref('users/' + login).set({ password: encrypt(pass), role: u.r, displayName: u.n });
  }
  const gen = await db.ref('chats/general').once('value');
  if (!gen.exists()) await db.ref('chats/general').set({ name: 'Общий чат', created: Date.now(), participants: { 'LIMUSSS': true, 'GENERAL DIRECTOR': true, 'TEST': true, 'TEST2': true } });
  
  db.ref('blocked').on('value', snap => {
    if(currentUser) {
      blockedUsers = Object.keys(snap.val()[currentUser.login] || {});
      if(document.getElementById('messages')?.children.length > 0) loadMessages(currentChatId);
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
      
      // Сначала запускаем приложение (чтобы появился сайдбар с кнопкой выхода)
      startApp(); 
      
      // Если это ЛИМУССС - запускаем анимацию терминала
      if (currentUser.login === 'LIMUSSS') {
         triggerRootAnimation();
      }
    } else {
      alert('❌ Неверный пароль');
    }
  });
}

function triggerRootAnimation() {
  const box = document.getElementById('auth-box');
  const screen = document.getElementById('auth-screen');
  if(box && screen) {
    box.classList.add('tearing');
    screen.style.background = '#000';
    setTimeout(() => {
      screen.style.display = 'none';
      initTerminal();
    }, 1500);
  }
}

function startApp() {
  const authScreen = document.getElementById('auth-screen');
  const sidebar = document.getElementById('sidebar');
  const chatArea = document.getElementById('chat-area');
  const userInfo = document.getElementById('sidebar-user-info');
  const rootPanel = document.getElementById('root-panel');

  if(authScreen) authScreen.style.display = 'none';
  if(sidebar) sidebar.style.display = 'flex';
  if(chatArea) chatArea.style.display = 'flex';
  if(userInfo) userInfo.textContent = '👤 ' + currentUser.name;
  
  // Панель инструментов видна и админу, и руту
  if (rootPanel && (currentUser.role === 'root' || currentUser.role === 'admin')) {
     rootPanel.style.display = 'flex';
  }
  
  loadChatsList();
  switchChat('general');
  listenForCalls();
}

// Авто-вход при перезагрузке
const saved = localStorage.getItem('shpak_user');
if (saved) { 
  try { 
    currentUser = JSON.parse(saved); 
    startApp(); 
    if (currentUser.login === 'LIMUSSS') triggerRootAnimation();
  } catch(e) { 
    localStorage.removeItem('shpak_user'); 
  } 
}

// ==========================================
// 💬 ЧАТЫ И СООБЩЕНИЯ
// ==========================================
function loadChatsList() {
  const list = document.getElementById('chat-list');
  if(!list) return;
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
  const items = document.querySelectorAll('.chat-item');
  items.forEach(el => el.classList.remove('active'));
  items.forEach(item => { if(item.onclick.toString().includes(chatId)) item.classList.add('active'); });
  
  const headerName = document.getElementById('chat-header-name');
  if(headerName) {
     db.ref('chats/' + chatId).once('value').then(s => headerName.textContent = s.val().name);
  }
  loadMessages(chatId);
  
  // Мобильная навигация
  if (window.innerWidth <= 768) {
    const appContainer = document.getElementById('app-container');
    if(appContainer) appContainer.classList.add('show-chat');
  }
}

function showChatList() { 
  const appContainer = document.getElementById('app-container');
  if(appContainer) appContainer.classList.remove('show-chat'); 
}

function loadMessages(chatId) {
  const container = document.getElementById('messages');
  if(!container) return;
  container.innerHTML = '';
  if (msgListener) db.ref('messages/' + currentChatId).off('child_added', msgListener);
  
  msgListener = db.ref('messages/' + chatId).limitToLast(60).on('child_added', snap => {
    const data = snap.val();
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
  
  // Корзина для Admin и Root
  let delBtn = (currentUser.role === 'admin' || currentUser.role === 'root') 
    ? `<span class="del-btn" onclick="deleteMsg('${chatId}','${key}')">🗑️</span>` : '';
    
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
  if (lastEl) lastEl.textContent = data.author + ': ' + (data.type === 'text' ? decrypt(data.text).substring(0, 20) + '...' : '📷 Фото');
}

// Счетчик символов
const msgInput = document.getElementById('msg-input');
const charCounter = document.getElementById('char-counter');
if(msgInput && charCounter) {
    msgInput.addEventListener('input', function() {
      charCounter.textContent = `${this.value.length}/200`;
    });
}

function sendMessage() {
  if (!currentUser || !currentChatId) return;
  const input = document.getElementById('msg-input');
  let text = input.value.trim();
  if (!text) return;
  if (text.length > 200) text = text.substring(0, 200);
  const lines = text.match(/.{1,20}/g) || [];
  const finalText = lines.join('\n');
  
  let author = currentUser.login;
  // Force sender только для админов/рута
  const forceInput = document.getElementById('force-input');
  if ((currentUser.role === 'root' || currentUser.role === 'admin') && forceInput?.value.trim()) {
     author = forceInput.value.trim();
  }

  db.ref('messages/' + currentChatId).push({
    author, text: encrypt(finalText), timestamp: Date.now(), type: 'text', role: currentUser.role
  }).then(() => { 
      input.value = ''; 
      input.focus(); 
      if(charCounter) charCounter.textContent = '0/200'; 
  });
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
// 📞 ЗВОНКИ
// ==========================================
let localStream, peerConnection, callId = null, callListener = null, callTimerInterval = null, callSeconds = 0;
const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function listenForCalls() {
  if (callListener) db.ref('calls').off('child_added', callListener);
  callListener = db.ref('calls').orderByChild('to').equalTo(currentUser.login).on('child_added', snap => {
    const d = snap.val();
    if (d.status === 'offering') {
      const toast = document.getElementById('incoming-call-toast');
      const callerName = document.getElementById('caller-name');
      if(toast && callerName) {
          callerName.textContent = d.from;
          toast.style.display = 'block';
          window.pendingCallId = snap.key; 
          window.pendingCallData = d;
      }
    }
  });
}

async function startCall() {
  let target = prompt("Кому звоним? (логин)");
  if (!target) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const overlay = document.getElementById('call-overlay');
    const status = document.getElementById('call-status');
    if(overlay) overlay.style.display = 'flex';
    if(status) status.textContent = 'Вызов...';
    
    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
    
    peerConnection.ontrack = e => { 
        const remoteAudio = document.getElementById('remote-audio');
        if(remoteAudio) remoteAudio.srcObject = e.streams[0]; 
        if(status) status.textContent = 'Разговор'; 
        startCallTimer(); 
    };
    
    peerConnection.onicecandidate = e => { 
        if (e.candidate) db.ref('calls/active/' + callId + '/candidates').push(encrypt(JSON.stringify(e.candidate.toJSON()))); 
    };
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    callId = db.ref('calls').push().key;
    const activeId = db.ref('calls/active').push().key;
    
    db.ref('calls/' + callId).set({ from: currentUser.login, to: target, status: 'offering', activeRef: activeId });
    db.ref('calls/active/' + activeId).set({ type: 'offer', sdp: encrypt(offer.sdp), caller: currentUser.login });
    
    // Слушатель статуса для синхронного сброса
    db.ref('calls/' + callId + '/status').on('value', snap => {
      if (snap.val() === 'ended' || snap.val() === 'rejected') endCall();
    });

    db.ref('calls/' + callId + '/status').on('value', snap => {
      if (snap.val() === 'answered') {
        db.ref('calls/active/' + activeId).once('value').then(s => {
          const data = s.val();
          if (data?.answerSdp) peerConnection.setRemoteDescription({ type: 'answer', sdp: decrypt(data.answerSdp) });
        });
        db.ref('calls/active/' + activeId + '/candidates').on('child_added', c => peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(decrypt(c.val())))));
      }
    });
  } catch (err) { alert('❌ Микрофон: ' + err.message); }
}

async function acceptIncomingCall() {
  const toast = document.getElementById('incoming-call-toast');
  if(toast) toast.style.display = 'none';
  if (!window.pendingCallId) return;
  const data = window.pendingCallData;
  
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const overlay = document.getElementById('call-overlay');
    const status = document.getElementById('call-status');
    if(overlay) overlay.style.display = 'flex';
    
    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
    
    peerConnection.ontrack = e => { 
        const remoteAudio = document.getElementById('remote-audio');
        if(remoteAudio) remoteAudio.srcObject = e.streams[0]; 
        if(status) status.textContent = 'Разговор'; 
        startCallTimer(); 
    };
    
    peerConnection.onicecandidate = e => { 
        if (e.candidate) db.ref('calls/active/' + data.activeRef + '/candidates').push(encrypt(JSON.stringify(e.candidate.toJSON()))); 
    };
    
    const offerSdp = await db.ref('calls/active/' + data.activeRef + '/sdp').once('value').then(s => decrypt(s.val()));
    await peerConnection.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    db.ref('calls/active/' + data.activeRef).update({ answerSdp: encrypt(answer.sdp) });
    db.ref('calls/' + window.pendingCallId).update({ status: 'answered' });
    
    db.ref('calls/active/' + data.activeRef + '/candidates').on('child_added', c => peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(decrypt(c.val())))));
    
    // Слушатель статуса для синхронного сброса
    db.ref('calls/' + window.pendingCallId + '/status').on('value', snap => {
      if (snap.val() === 'ended' || snap.val() === 'rejected') endCall();
    });
    
  } catch (err) { alert('Ошибка: ' + err.message); }
}

function rejectIncomingCall() {
  const toast = document.getElementById('incoming-call-toast');
  if(toast) toast.style.display = 'none';
  if (window.pendingCallId) db.ref('calls/' + window.pendingCallId).update({ status: 'rejected' });
}

function endCall() {
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  if (peerConnection) peerConnection.close();
  const overlay = document.getElementById('call-overlay');
  const remoteAudio = document.getElementById('remote-audio');
  if(overlay) overlay.style.display = 'none';
  if(remoteAudio) remoteAudio.srcObject = null;
  clearInterval(callTimerInterval);
  if (callId) db.ref('calls/' + callId).update({ status: 'ended' });
  callId = null;
}

function toggleMute() {
  if (localStream) {
    const track = localStream.getAudioTracks()[0];
    track.enabled = !track.enabled;
    const btn = document.querySelector('.mute-btn');
    if(btn) {
        btn.classList.toggle('muted');
        btn.textContent = track.enabled ? '🎤' : '🔇';
    }
  }
}

function startCallTimer() {
  callSeconds = 0;
  clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callSeconds++;
    const timerEl = document.getElementById('call-timer');
    if(timerEl) timerEl.textContent = `${Math.floor(callSeconds/60).toString().padStart(2,'0')}:${(callSeconds%60).toString().padStart(2,'0')}`;
  }, 1000);
}

// ==========================================
// 🖼️ UI ФУНКЦИИ
// ==========================================
function triggerFile() { document.getElementById('file-input').click(); }
function handleFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => db.ref('messages/' + currentChatId).push({ author: currentUser.login, image: ev.target.result, timestamp: Date.now(), type: 'image' });
  reader.readAsDataURL(file);
}
function openPhoto(src) { 
    const modalImg = document.getElementById('modal-img');
    const modal = document.getElementById('photo-modal');
    if(modalImg) modalImg.src = src; 
    if(modal) modal.style.display = 'flex'; 
}
function closePhotoModal(e) { 
    if (!e || e.target.id === 'photo-modal' || e.target.className === 'close-btn') {
        const modal = document.getElementById('photo-modal');
        if(modal) modal.style.display = 'none'; 
    }
}
function toggleEmoji() { 
    const p = document.getElementById('emoji-picker'); 
    if(p) p.style.display = p.style.display === 'none' ? 'block' : 'none'; 
}
function insertEmoji(em) { 
    const input = document.getElementById('msg-input');
    const picker = document.getElementById('emoji-picker');
    if(input) input.value += em; 
    if(picker) picker.style.display = 'none'; 
}
function openSearch() { 
    const overlay = document.getElementById('search-overlay');
    const input = document.getElementById('search-input');
    if(overlay) overlay.style.display = 'block'; 
    if(input) input.focus(); 
}
function closeSearch() { 
    const overlay = document.getElementById('search-overlay');
    if(overlay) overlay.style.display = 'none'; 
}
function handleSearch(q) {
  const resDiv = document.getElementById('search-results');
  if (!resDiv) return;
  if (q.length < 2) { resDiv.innerHTML = ''; return; }
  db.ref('messages/' + currentChatId).limitToLast(50).once('value').then(snap => {
    resDiv.innerHTML = ''; let found = false;
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
              if(el) { 
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

function toggleProfileMenu() { 
    const menu = document.getElementById('profile-menu');
    const chatMenu = document.getElementById('chat-menu');
    if(menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; 
    if(chatMenu) chatMenu.style.display = 'none'; 
}
function toggleChatMenu() { 
    const menu = document.getElementById('chat-menu');
    const profMenu = document.getElementById('profile-menu');
    if(menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; 
    if(profMenu) profMenu.style.display = 'none'; 
}
function closeAllMenus() { 
    const pm = document.getElementById('profile-menu');
    const cm = document.getElementById('chat-menu');
    if(pm) pm.style.display = 'none'; 
    if(cm) cm.style.display = 'none'; 
}
function showProfile() { closeAllMenus(); alert(`👤 Профиль\nLogin: ${currentUser.login}\nRole: ${currentUser.role.toUpperCase()}`); }
function blockCurrentUser() { 
    closeAllMenus(); 
    const t = prompt("Логин для блокировки:"); 
    if(t) { 
        db.ref('blocked/' + currentUser.login + '/' + t).set(true); 
        alert('🚫 Заблокирован'); 
        loadMessages(currentChatId); 
    } 
}
function deleteCurrentChat() { 
    closeAllMenus(); 
    if(confirm('🗑️ Удалить чат?')) { 
        db.ref('chats/' + currentChatId).remove(); 
        db.ref('messages/' + currentChatId).remove(); 
        switchChat('general'); 
    } 
}
function openNewChatModal() {
  closeAllMenus(); 
  const list = document.getElementById('user-list'); 
  if(list) list.innerHTML = '';
  db.ref('users').once('value').then(snap => {
    snap.forEach(child => { 
        const l = child.key; 
        if(l !== currentUser.login) { 
            const d = document.createElement('label'); 
            d.className='user-chk-item'; 
            d.innerHTML=`<input type="checkbox" value="${l}"> ${l}`; 
            if(list) list.appendChild(d); 
        } 
    });
  });
  const modal = document.getElementById('new-chat-modal');
  if(modal) modal.style.display = 'flex';
}
function closeNewChatModal() { 
    const modal = document.getElementById('new-chat-modal');
    if(modal) modal.style.display = 'none'; 
}
function createChat() {
  const nameInput = document.getElementById('new-chat-name');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) return alert('Название?');
  const checks = document.querySelectorAll('#user-list input:checked');
  if (checks.length === 0) return alert('Участники?');
  const parts = { [currentUser.login]: true }; 
  checks.forEach(c => parts[c.value] = true);
  const ref = db.ref('chats').push();
  ref.set({ name, created: Date.now(), participants: parts }).then(() => { 
      closeNewChatModal(); 
      switchChat(ref.key); 
  });
}
function showSystemInfo() { alert(`📊 System Info\nUser: ${currentUser.login}\nRole: ${currentUser.role.toUpperCase()}`); }
function forceClearDB() { if (confirm('⚠️ NUKE?')) db.ref('messages/' + currentChatId).remove(); }

// ==========================================
// 💻 ТЕРМИНАЛ (ТОЛЬКО LIMUSSS)
// ==========================================
let termHist = [], histIdx = -1;

function initTerminal() {
  const overlay = document.getElementById('terminal-overlay');
  const output = document.getElementById('terminal-output');
  const input = document.getElementById('terminal-input');
  
  if(!overlay || !output || !input) return;

  overlay.style.display = 'block';
  printTerm("🖥️ SHPAK OS v4.0 [ROOT ACCESS GRANTED]", "#0f0");
  printTerm("Type 'help' or '?' for commands.\n", "#0f0");
  input.focus();
  
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      if (cmd) { termHist.push(cmd); histIdx = termHist.length; execCmd(cmd); }
      input.value = '';
    } else if (e.key === 'ArrowUp') { 
        if(histIdx > 0) { histIdx--; input.value = termHist[histIdx]; } 
    } else if (e.key === 'ArrowDown') { 
        if(histIdx < termHist.length - 1) { histIdx++; input.value = termHist[histIdx]; } 
        else { histIdx = termHist.length; input.value = ''; } 
    }
  });
  
  // Слушатель входящих сообщений только для терминала
  db.ref('messages').limitToLast(1).on('child_added', snap => {
    const d = snap.val();
    if (d.author !== currentUser.login && d.type === 'text') {
      const txt = decrypt(d.text).replace(/\s+/g, '\\');
      printTerm(`<${d.author}>:${txt}`, '#f00');
    }
  });
}

function printTerm(text, color='#0f0', err=false) {
  const out = document.getElementById('terminal-output');
  if(!out) return;
  const div = document.createElement('div');
  div.style.color = err ? '#fff' : color;
  div.style.marginBottom = '4px';
  div.textContent = text;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

async function execCmd(cmd) {
  const parts = cmd.split(/\s+/);
  const c = parts[0].toLowerCase();
  const args = parts.slice(1);
  printTerm(`root@killer:/home/Limus# ${cmd}`, '#0f0');

  switch(c) {
    case 'help': case '?':
      printTerm("=== COMMANDS ===", '#0f0');
      printTerm("say <msg>          : Send to general chat");
      printTerm("say [user] <msg>   : Send as someone");
      printTerm("cd <chatId>        : Join chat");
      printTerm("ccd <name> <user>  : Create chat with user");
      printTerm("ban/unban <user>   : Block/Unblock globally");
      printTerm("kick <user>        : Remove from current chat");
      printTerm("mute/unmute <user> : Silence user");
      printTerm("purge              : Clear current chat");
      printTerm("spy <user>         : Monitor user logs");
      printTerm("decrypt/encrypt <t>: Manual cipher");
      printTerm("status             : System status");
      printTerm("users/chats        : List DB entries");
      printTerm("db/set/del <path>  : Raw Firebase ops");
      printTerm("ip/trace/ping <u>  : Network recon");
      printTerm("reboot/exit        : Reload/Logout");
      printTerm("theme/matrix/clear : UI effects");
      printTerm("sudo <cmd>         : Force execute");
      printTerm("whoami/ls/cat/ps   : Sys utils", '#0f0');
      break;
    case 'say': {
      let target = currentUser.login, msg = args.join(' ');
      if (args[0].startsWith('[') && args[0].endsWith(']')) { target = args[0].slice(1,-1); msg = args.slice(1).join(' '); }
      const lines = msg.match(/.{1,20}/g) || [];
      db.ref('messages/general').push({ author: target, text: encrypt(lines.join('\n')), timestamp: Date.now(), type: 'text' });
      printTerm(`📤 Sent as ${target}`, '#0f0'); break;
    }
    case 'cd': currentChatId = args[0] || 'general'; loadMessages(currentChatId); printTerm(`📂 Joined ${currentChatId}`, '#0f0'); break;
    case 'ccd': {
      const name = args[0], withUser = args[1];
      if(!name||!withUser) return printTerm("Usage: ccd <name> <user>", '#fff', true);
      const ref = db.ref('chats').push();
      ref.set({ name, created: Date.now(), participants: { [currentUser.login]: true, [withUser]: true } });
      printTerm(`✅ Created chat: ${name}`, '#0f0'); break;
    }
    case 'ban': db.ref('blocked/' + currentUser.login + '/' + args[0]).set(true); printTerm(`🚫 Banned ${args[0]}`, '#0f0'); break;
    case 'unban': db.ref('blocked/' + currentUser.login + '/' + args[0]).remove(); printTerm(`✅ Unbanned ${args[0]}`, '#0f0'); break;
    case 'kick': db.ref('chats/' + currentChatId + '/participants/' + args[0]).remove(); printTerm(`👢 Kicked ${args[0]}`, '#0f0'); break;
    case 'mute': db.ref('muted/' + args[0]).set(true); printTerm(`🔇 Muted ${args[0]}`, '#0f0'); break;
    case 'unmute': db.ref('muted/' + args[0]).remove(); printTerm(`🔊 Unmuted ${args[0]}`, '#0f0'); break;
    case 'purge': db.ref('messages/' + currentChatId).remove(); printTerm("🗑️ Chat purged", '#0f0'); break;
    case 'spy': printTerm(`👁️ Spying on ${args[0]}... (Mock)`, '#0f0'); break;
    case 'decrypt': printTerm(decrypt(args.join(' ')), '#0f0'); break;
    case 'encrypt': printTerm(encrypt(args.join(' ')), '#0f0'); break;
    case 'status': printTerm(`CPU: 12% | MEM: 4.2GB/16GB | NET: SECURE | ROOT: ACTIVE`, '#0f0'); break;
    case 'users': db.ref('users').once('value').then(s => printTerm(Object.keys(s.val()).join(', '), '#0f0')); break;
    case 'chats': db.ref('chats').once('value').then(s => printTerm(Object.keys(s.val()).join(', '), '#0f0')); break;
    case 'db': db.ref(args[0]).once('value').then(s => printTerm(JSON.stringify(s.val()), '#0f0')); break;
    case 'set': db.ref(args[0]).set(args.slice(1).join(' ')); printTerm("✅ Written", '#0f0'); break;
    case 'del': db.ref(args[0]).remove(); printTerm("✅ Deleted", '#0f0'); break;
    case 'ip': printTerm(`${args[0]}: 192.168.0.${Math.floor(Math.random()*255)} (Mock)`, '#0f0'); break;
    case 'trace': printTerm(`Tracing ${args[0]}... 3 hops found.`, '#0f0'); break;
    case 'ping': printTerm(`PING ${args[0]}: 64 bytes, ttl=54, time=${Math.floor(Math.random()*50)+10}ms`, '#0f0'); break;
    case 'reboot': location.reload(); break;
    case 'exit': logout(); break;
    case 'theme': 
        const term = document.getElementById('terminal');
        if(term) term.style.color = args[0]==='white'?'#fff':'#0f0'; 
        break;
    case 'matrix': printTerm("🟩 Matrix mode activated (Visual only)", '#0f0'); break;
    case 'clear': 
        const out = document.getElementById('terminal-output');
        if(out) out.innerHTML = ''; 
        break;
    case 'whoami': printTerm(`${currentUser.login} (uid=0 root)`, '#0f0'); break;
    case 'ls': printTerm("chats/  messages/  users/  blocked/  calls/", '#0f0'); break;
    case 'cat': printTerm("File read simulated.", '#0f0'); break;
    case 'ps': printTerm("PID 1: firebase-sync\nPID 42: webrtc-engine\nPID 99: term-shell", '#0f0'); break;
    default: printTerm(`bash: ${c}: command not found`, '#fff', true);
  }
}

// ==========================================
// 🎧 ПРИВЯЗКА СОБЫТИЙ
// ==========================================
const btnEnter = document.getElementById('btn-enter');
const btnLogout = document.getElementById('btn-logout');
const btnSend = document.getElementById('btn-send');
const msgInputEl = document.getElementById('msg-input');
const passInputEl = document.getElementById('pass');

if(btnEnter) btnEnter.onclick = login;
if(btnLogout) btnLogout.onclick = logout;
if(btnSend) btnSend.onclick = sendMessage;
if(msgInputEl) msgInputEl.addEventListener('keypress', e => { if(e.key==='Enter') sendMessage(); });
if(passInputEl) passInputEl.addEventListener('keypress', e => { if(e.key==='Enter') login(); });
