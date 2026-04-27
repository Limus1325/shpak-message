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
// 👥 ПОЛЬЗОВАТЕЛИ И ПЕРЕМЕННЫЕ
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
let replyTo = null; // Для системы ответов

// ==========================================
// 🚪 ВЫХОД (ПРОСТОЙ ВАРИАНТ)
// ==========================================
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
  if (!gen.exists()) await db.ref('chats/general').set({ name: 'Общий чат', created: Date.now(), participants: { 'LMUSSS': true, 'GENERAL DIRECTOR': true, 'TEST': true, 'TEST2': true } });
  
  db.ref('blocked').on('value', snap => {
    // 🔥 БЕЗОПАСНАЯ ПРОВЕРКА
    if (currentUser && currentUser.login) {
      const blockedData = snap.val() || {};
      blockedUsers = Object.keys(blockedData[currentUser.login] || {});
    } else {
      blockedUsers = [];
    }
    if(document.getElementById('messages')?.children.length > 0) loadMessages(currentChatId);
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
      
      // Запускаем приложение
      startApp(); 
      
      // Если это LMUSSS - запускаем анимацию терминала
      if (currentUser.login === 'LMUSSS') triggerRootAnimation();
    } else {
      alert('❌ Неверный пароль');
    }
  });
}

// Анимация матрицы
function triggerRootAnimation() {
  const box = document.getElementById('auth-box');
  const screen = document.getElementById('auth-screen');
  const bootScreen = document.getElementById('boot-screen');
  const canvas = document.getElementById('matrix-canvas');
  
  // Элементы для искажения
  const inputs = document.querySelectorAll('#auth-box input');
  const btn = document.getElementById('btn-enter');
  const title = document.getElementById('auth-title');

  if (!box || !screen || !canvas) return;

  // 1. Запускаем анимацию распада
  box.classList.add('matrix-decay');
  
  // 2. Превращаем инпуты в "пустоту"
  inputs.forEach(input => {
    input.classList.add('input-void');
    input.value = ''; 
    input.placeholder = ''; 
  });
  
  // 3. Кнопка и заголовок меняются
  btn.textContent = "010101";
  btn.style.background = '#000';
  btn.style.color = '#0f0';
  btn.style.border = '1px solid #0f0';

  title.textContent = "SYSTEM_HALT";
  title.style.color = '#f00';

  // 4. Запускаем дождь из кода Матрицы
  canvas.style.display = 'block';
  startMatrixRain(canvas);

  // 5. Через 2 секунды переходим к загрузке
  setTimeout(() => {
    canvas.style.display = 'none'; 
    screen.style.display = 'none'; 
    bootScreen.style.display = 'flex'; 
    runBootSequence();
  }, 2000);
}

function startMatrixRain(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const alphabet = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const fontSize = 16;
  const columns = canvas.width / fontSize;
  const drops = [];

  for (let x = 0; x < columns; x++) drops[x] = 1;

  const draw = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  };

  const interval = setInterval(draw, 33);
  setTimeout(() => clearInterval(interval), 2000);
}

async function runBootSequence() {
  const log = document.getElementById('boot-log');
  
  const lines = [
    { text: "SHAPK OS v4.0 - KERNEL LOAD", class: "system" },
    { text: "Initializing memory modules... [OK]", class: "success" },
    { text: "Loading network drivers... [OK]", class: "success" },
    { text: "Connecting to Firebase Secure Node...", class: "" },
    { text: "Handshake established (256-bit encryption)", class: "success" },
    { text: "Verifying user identity: LMUSSS...", class: "warn" },
    { text: "Identity CONFIRMED.", class: "success" },
    { text: "Bypassing firewall restrictions...", class: "warn" },
    { text: "Root privileges: GRANTED", class: "system" },
    { text: "Loading terminal interface...", class: "" }
  ];

  for (let i = 0; i < lines.length; i++) {
    const div = document.createElement('div');
    div.className = `boot-line ${lines[i].class}`;
    div.textContent = `> ${lines[i].text}`;
    log.appendChild(div);
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
  }

  await new Promise(r => setTimeout(r, 1000));
  
  document.getElementById('boot-screen').style.display = 'none';
  startApp(); 
  initTerminal(); 
}

function startApp() {
  // 🔥 ПРОВЕРКА НА НАЛИЧИЕ ПОЛЬЗОВАТЕЛЯ
  if (!currentUser) {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.style.display = 'flex';
    return;
  }
  
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('chat-area').style.display = 'flex';
  document.getElementById('sidebar-user-info').textContent = '👤 ' + currentUser.name;
  
  loadChatsList();
  switchChat('general');
  listenForCalls();
}

// Авто-вход
const saved = localStorage.getItem('shpak_user');
if (saved) { 
  try { 
    currentUser = JSON.parse(saved); 
    
    if (!currentUser || !currentUser.login) {
      localStorage.removeItem('shpak_user');
    } else {
      if (document.readyState === 'complete') {
        startApp(); 
        if (currentUser.login === 'LMUSSS') triggerRootAnimation();
      } else {
        window.addEventListener('load', () => {
          startApp(); 
          if (currentUser.login === 'LMUSSS') triggerRootAnimation();
        });
      }
    }
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
  
  // 🗑️ КОРЗИНА (Admin/Root)
  let delBtn = (currentUser.role === 'admin' || currentUser.role === 'root') 
    ? `<span class="del-btn" onclick="deleteMsg('${chatId}','${key}')">🗑️</span>` : '';
  
  // ↩️ КНОПКА ОТВЕТА (Для всех)
  const originalText = decrypt(data.text).replace(/'/g, "\\'").substring(0,30);
  const replyBtn = `<span class="reply-btn" onclick="startReply('${key}','${data.author}','${originalText}')">↩️</span>`;

  // 📜 КОНТЕКСТ ОТВЕТА (Если сообщение - это ответ)
  let replyContext = '';
  if (data.replyTo) {
    // Расшифровываем текст оригинала
    const replyText = data.replyTo.text || '...'; 
    replyContext = `
      <div class="reply-context" onclick="scrollToMessage('${data.replyTo.key}')">
        <span class="reply-context-author">@${data.replyTo.author}:</span> 
        <span class="reply-context-text">${replyText}</span>
      </div>
    `;
  }
  
  let content = data.type === 'image' 
    ? `<img src="${data.image}" class="photo-preview" onclick="openPhoto('${data.image}','${data.author}','${time}')">` 
    : '<div class="msg-text"></div>';
    
  div.innerHTML = `
    ${replyContext}
    ${!isMe ? `<div class="msg-author">${data.author} ${delBtn}${replyBtn}</div>` : `<div class="msg-head-right" style="text-align:right">${delBtn}${replyBtn}</div>`}
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
// ↩️ ФУНКЦИИ ОТВЕТОВ
// ==========================================

function startReply(msgKey, author, text) {
  replyTo = { key: msgKey, author, text };
  
  // Показываем превью
  const preview = document.getElementById('reply-preview');
  if (preview) {
    preview.style.display = 'block';
    document.getElementById('reply-to-author').textContent = '@' + author;
    document.getElementById('reply-to-text').textContent = text + (text.length >= 30 ? '...' : '');
  }
  
  document.getElementById('msg-input').focus();
}

function cancelReply() {
  replyTo = null;
  const preview = document.getElementById('reply-preview');
  if (preview) preview.style.display = 'none';
}

function scrollToMessage(msgKey) {
  const el = document.querySelector(`[data-key="${msgKey}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.outline = '2px solid var(--accent)';
    setTimeout(() => el.style.outline = '', 2000);
  }
}

// ==========================================
// 📨 ОТПРАВКА
// ==========================================

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
  const forceInput = document.getElementById('force-input');
  if ((currentUser.role === 'root' || currentUser.role === 'admin') && forceInput?.value.trim()) {
     author = forceInput.value.trim();
  }

  const messageData = {
    author, 
    text: encrypt(finalText), 
    timestamp: Date.now(), 
    type: 'text', 
    role: currentUser.role
  };
  
  // 🔥 Прикрепляем ответ, если он есть
  if (replyTo) {
    messageData.replyTo = {
      key: replyTo.key,
      author: replyTo.author,
      text: replyTo.text
    };
  }

  db.ref('messages/' + currentChatId).push(messageData).then(() => { 
      input.value = ''; 
      input.focus(); 
      if(charCounter) charCounter.textContent = '0/200';
      cancelReply(); // Сбрасываем режим ответа
  });
}
// ==========================================
// 📞 ЗВОНКИ (WebRTC)
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
// 💻 ТЕРМИНАЛ (ТОЛЬКО LMUSSS)
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
    // ================= ИНФОРМАЦИЯ =================
    case 'help': case '?':
      printTerm(" ╔════════════════════════════════════════════════════════╗", "#00ffff");
      printTerm(" ║            📚 SHPAK OS v4.0 - FULL MANUAL 📚           ║", "#00ffff");
      printTerm(" ╚════════════════════════════════════════════════════════╝", "#00ffff");
      
      printTerm("\n👥 ПОЛЬЗОВАТЕЛИ (9 cmd):", "#ffff00");
      printTerm("  useradd <логин> <пароль>   : Завести нового пользователя", "#00ff00");
      printTerm("  userdel <логин>            : Удалить юзера навсегда (Nuke)", "#ff0000");
      printTerm("  usermod <логин> <роль>     : Сменить роль (root/admin/user)", "#00ff00");
      printTerm("  passwd <логин> <пароль>    : Сменить пароль любого юзера", "#00ff00");
      printTerm("  whois <логин>              : Досье на пользователя", "#00ff00");
      printTerm("  listusers                  : Показать всех юзеров", "#00ff00");
      printTerm("  ban / unban <логин>        : Забанить или разбанить", "#ff0000");
      printTerm("  whoami                     : Кто я сейчас?", "#00ff00");
      
      printTerm("\n💬 ЧАТЫ И ГРУППЫ (9 cmd):", "#ffff00");
      printTerm("  chatadd <имя> <юзеры>      : Создать чат (через запятую)", "#00ff00");
      printTerm("  chatdel <ID>               : Удалить чат целиком", "#ff0000");
      printTerm("  chatinfo <ID>              : Информация о чате", "#00ff00");
      printTerm("  listchats                  : Список всех чатов", "#00ff00");
      printTerm("  cd <ID>                    : Войти в чат по ID", "#00ff00");
      printTerm("  ccd <имя> <юзер>           : Создать секретку (1 на 1)", "#00ff00");
      printTerm("  kick <юзер>                : Выгнать из текущего чата", "#ff5500");
      printTerm("  mute / unmute <юзер>       : Заглушить микрофон (mock)", "#00ff00");
      
      printTerm("\n📨 СООБЩЕНИЯ И ШПИОНАЖ (7 cmd):", "#ffff00");
      printTerm("  say [юзер] <текст>         : Написать от чужого имени!", "#ff00ff");
      printTerm("  broadcast <текст>          : Отправить сообщение ВСЕМ", "#ff0000");
      printTerm("  msgdel <чатID> <msgID>     : Удалить чужое сообщение", "#ff5500");
      printTerm("  purge                      : Очистить текущий чат", "#ff5500");
      printTerm("  nuke                       : УДАЛИТЬ ВСЮ ИСТОРИЮ СООБЩЕНИЙ", "#ff0000");
      printTerm("  spy <юзер>                 : 🔴 Шпионить за юзером в реалтайме", "#ff0000");
      printTerm("  unspy                      : Остановить слежку", "#ff5500");

      printTerm("\n💾 БАЗА ДАННЫХ И СИСТЕМА (8 cmd):", "#ffff00");
      printTerm("  query <путь>               : Глубокий запрос к БД", "#00ff00");
      printTerm("  set <путь> <значение>      : Изменить данные в БД", "#ff5500");
      printTerm("  del / wipe <путь>          : Стереть ветку БД", "#ff0000");
      printTerm("  export                     : Выгрузить дамп базы", "#00ff00");
      printTerm("  audit                      : Аудит безопасности (считает роли)", "#00ff00");
      printTerm("  shutdown / startup         : Выключить/Включить сайт для всех", "#ff0000");
      printTerm("  logs                       : Посмотреть логи сервера", "#00ff00");
      
      printTerm("\n⚡ УТИЛИТЫ И ТРЮКИ (15+ cmd):", "#ffff00");
      printTerm("  status                     : Инфо о сервере", "#00ff00");
      printTerm("  ping <юзер>                : Пинг до жертвы", "#00ff00");
      printTerm("  encrypt / decrypt <текст>  : Шифр/Дешифр вручную", "#00ff00");
      printTerm("  sudo <команда>             : Выполнить от имени root", "#00ff00");
      printTerm("  rm <путь>                  : Сокращение от delete", "#ff5500");
      printTerm("  ls                         : Сокращение от listusers", "#00ff00");
      printTerm("  ps                         : Сокращение от status", "#00ff00");
      printTerm("  cat <путь>                 : Сокращение от query", "#00ff00");
      printTerm("  neofetch                   : Красивая инфа о системе", "#00ff00");
      printTerm("  matrix                     : Запуск Матрицы (визуал)", "#00ff00");
      printTerm("  history                    : История твоих команд", "#00ff00");
      printTerm("  theme white/black          : Сменить цвет терминала", "#00ff00");
      printTerm("  clear                      : Очистить экран", "#00ff00");
      printTerm("  exit                       : Выйти из аккаунта", "#ff0000");
      printTerm("  help                       : Ты сейчас тут 😼", "#ffff00");
      break;

    case 'say': {
      if (!args.length) return printTerm("❌ say <текст> или say [юзер] <текст>", '#fff', true);
      let author = currentUser.login, msg = args.join(' ');
      if (args[0].startsWith('[') && args[0].endsWith(']')) { author = args[0].slice(1,-1); msg = args.slice(1).join(' '); }
      const lines = msg.match(/.{1,20}/g) || [];
      db.ref('messages/' + currentChatId).push({ author, text: encrypt(lines.join('\n')), timestamp: Date.now(), type: 'text' });
      printTerm(`📤 Отправлено от ${author}`, '#0f0'); break;
    }
    case 'broadcast': {
      if (!args.length) return printTerm("❌ broadcast <текст>", '#fff', true);
      const msg = args.join(' '); let count = 0;
      (await db.ref('chats').once('value')).forEach(ch => {
        db.ref('messages/' + ch.key).push({ author: `[РАССЫЛКА] ${currentUser.login}`, text: encrypt(msg), timestamp: Date.now(), type: 'text' });
        count++;
      });
      printTerm(`📡 Отправлено в ${count} чатов`, '#0f0'); break;
    }
    case 'purge':
      if (!confirm('🗑️ Очистить текущий чат?')) return;
      await db.ref('messages/' + currentChatId).remove(); printTerm('💥 Чат очищен', '#0f0'); break;
    case 'nuke':
      if (!confirm('⚠️ УНИЧТОЖИТЬ ВСЕ СООБЩЕНИЯ?')) return;
      await db.ref('messages').remove(); printTerm('💣 ВСЁ УНИЧТОЖЕНО', '#f00'); break;
    case 'msgdel':
      if (args.length < 2) return printTerm("❌ msgdel <chatId> <msgId>", '#fff', true);
      await db.ref('messages/' + args[0] + '/' + args[1]).remove(); printTerm('🗑️ Сообщение удалено', '#0f0'); break;

    // ================= ЮЗЕРЫ =================
    case 'useradd':
      if (args.length < 2) return printTerm("❌ useradd <логин> <пароль>", '#fff', true);
      await db.ref('users/' + args[0]).set({ password: encrypt(args[1]), role: 'user', displayName: args[0], created: Date.now() });
      printTerm(`✅ ${args[0]} создан`, '#0f0'); break;
    case 'userdel':
      if (!args[0]) return printTerm("❌ userdel <логин>", '#fff', true);
      await db.ref('users/' + args[0]).remove(); await db.ref('blocked').child(args[0]).remove();
      printTerm(`🗑️ ${args[0]} удалён`, '#f00'); break;
    case 'usermod':
      if (args.length < 2 || !['root','admin','user'].includes(args[1])) return printTerm("❌ usermod <логин> <root|admin|user>", '#fff', true);
      await db.ref('users/' + args[0] + '/role').set(args[1]); printTerm(`🔄 Роль ${args[0]} → ${args[1]}`, '#0f0'); break;
    case 'passwd':
      if (args.length < 2) return printTerm("❌ passwd <логин> <новый_пароль>", '#fff', true);
      await db.ref('users/' + args[0] + '/password').set(encrypt(args[1])); printTerm(`🔑 Пароль изменён`, '#0f0'); break;
    case 'whois':
      if (!args[0]) return printTerm("❌ whois <логин>", '#fff', true);
      const uSnap = await db.ref('users/' + args[0]).once('value');
      if (!uSnap.exists()) return printTerm("❌ Не найден", '#fff', true);
      const u = uSnap.val();
      printTerm(`👤 ${args[0]} | ${u.role} | ${u.displayName} | Создан: ${new Date(u.created).toLocaleDateString()}`, '#0f0'); break;
    case 'listusers': {
      const us = await db.ref('users').once('value');
      printTerm(`📋 Всего: ${Object.keys(us.val()||{}).length}`, '#0f0');
      us.forEach(s => printTerm(`  ${s.key} [${s.val().role}]`, '#aaa')); break;
    }
    case 'ban':
      if (!args[0]) return printTerm("❌ ban <логин>", '#fff', true);
      await db.ref('blocked/' + currentUser.login + '/' + args[0]).set(true); printTerm(`🚫 ${args[0]} забанен`, '#f00'); break;
    case 'unban':
      if (!args[0]) return printTerm("❌ unban <логин>", '#fff', true);
      await db.ref('blocked/' + currentUser.login + '/' + args[0]).remove(); printTerm(`✅ ${args[0]} разбанен`, '#0f0'); break;
    case 'whoami': printTerm(`👤 ${currentUser.login} (${currentUser.role})`, '#0f0'); break;

    // ================= ЧАТЫ =================
    case 'chatdel':
      if (!args[0]) return printTerm("❌ chatdel <chatId>", '#fff', true);
      await db.ref('chats/' + args[0]).remove(); await db.ref('messages/' + args[0]).remove(); printTerm(`🗑️ Чат удалён`, '#f00'); break;
    case 'chatadd':
      if (args.length < 2) return printTerm("❌ chatadd <название> <юзер1,юзер2>", '#fff', true);
      const p = {}; args[1].split(',').forEach(x => p[x]=true); p[currentUser.login]=true;
      const ref = await db.ref('chats').push();
      await ref.set({ name: args[0], created: Date.now(), participants: p }); printTerm(`✅ Чат создан: ${ref.key}`, '#0f0'); break;
    case 'chatinfo':
      if (!args[0]) return printTerm("❌ chatinfo <chatId>", '#fff', true);
      const cSnap = await db.ref('chats/' + args[0]).once('value');
      if (!cSnap.exists()) return printTerm("❌ Не найден", '#fff', true);
      const cd = cSnap.val(); printTerm(`📄 ${cd.name} | Участников: ${Object.keys(cd.participants).length}`, '#0f0'); break;
    case 'listchats': {
      const cs = await db.ref('chats').once('value');
      printTerm(`📋 Чатов: ${Object.keys(cs.val()||{}).length}`, '#0f0');
      cs.forEach(s => printTerm(`  ${s.key} → ${s.val().name}`, '#aaa')); break;
    }
    case 'cd':
      if (!args[0]) return printTerm("❌ cd <chatId>", '#fff', true);
      currentChatId = args[0]; loadMessages(currentChatId); printTerm(`📂 Перешёл в ${currentChatId}`, '#0f0'); break;
    case 'ccd':
      if (args.length < 2) return printTerm("❌ ccd <название> <юзер>", '#fff', true);
      const p2 = { [currentUser.login]: true, [args[1]]: true };
      const r2 = await db.ref('chats').push();
      await r2.set({ name: args[0], created: Date.now(), participants: p2 }); printTerm(`✅ Приватный чат создан`, '#0f0'); break;
    case 'kick':
      if (!args[0]) return printTerm("❌ kick <юзер>", '#fff', true);
      await db.ref('chats/' + currentChatId + '/participants/' + args[0]).remove(); printTerm(`👢 ${args[0]} кикнут`, '#0f0'); break;
    case 'mute':
      if (!args[0]) return printTerm("❌ mute <юзер>", '#fff', true);
      await db.ref('muted/' + args[0]).set(true); printTerm(`🔇 ${args[0]} заглушён`, '#0f0'); break;
    case 'unmute':
      if (!args[0]) return printTerm("❌ unmute <юзер>", '#fff', true);
      await db.ref('muted/' + args[0]).remove(); printTerm(`🔊 ${args[0]} размучен`, '#0f0'); break;

    // ================= БЕЗОПАСНОСТЬ =================
    case 'grant':
      if (args.length < 2) return printTerm("❌ grant <юзер> <право>", '#fff', true);
      await db.ref('perms/' + args[0] + '/' + args[1]).set(true); printTerm(`✅ Право выдано`, '#0f0'); break;
    case 'revoke':
      if (args.length < 2) return printTerm("❌ revoke <юзер> <право>", '#fff', true);
      await db.ref('perms/' + args[0] + '/' + args[1]).remove(); printTerm(`❌ Право отозвано`, '#0f0'); break;
    case 'audit': {
      const au = await db.ref('users').once('value'); let r=0,a=0,u=0;
      au.forEach(s => { if(s.val().role==='root')r++; if(s.val().role==='admin')a++; if(s.val().role==='user')u++; });
      printTerm(`🔍 Root: ${r} | Admin: ${a} | User: ${u}`, '#0f0'); break;
    }
    case 'spy': {
      if (!args[0]) return printTerm("❌ spy <юзер>", '#fff', true);
      window.spyRef = db.ref('messages').orderByChild('author').equalTo(args[0]).limitToLast(5);
      window.spyHandle = window.spyRef.on('child_added', snap => {
        const d = snap.val(); printTerm(`👁️ [${d.author}]: ${decrypt(d.text)}`, '#ff0');
      });
      printTerm(`👁️ Слежка за ${args[0]} активна`, '#0f0'); break;
    }
    case 'unspy':
      if (window.spyRef && window.spyHandle) { window.spyRef.off('child_added', window.spyHandle); printTerm('🔕 Слежка остановлена', '#0f0'); }
      else printTerm('❌ Нет активной слежки', '#fff', true);
      break;
    case 'logs': {
      const lg = await db.ref('logs').limitToLast(5).once('value');
      if (!lg.exists()) return printTerm('📭 Логи пусты', '#0f0');
      lg.forEach(s => printTerm(`[${new Date(s.val().t).toLocaleTimeString()}] ${s.val().m}`, '#888')); break;
    }

    // ================= БАЗА ДАННЫХ =================
    case 'query':
      if (!args[0]) return printTerm("❌ query <путь>", '#fff', true);
      const qSnap = await db.ref(args[0]).once('value');
      printTerm(JSON.stringify(qSnap.val(), null, 2), '#0f0'); break;
    case 'set':
      if (args.length < 2) return printTerm("❌ set <путь> <значение>", '#fff', true);
      await db.ref(args[0]).set(args.slice(1).join(' ')); printTerm('✅ Записано', '#0f0'); break;
    case 'del':
      if (!args[0]) return printTerm("❌ del <путь>", '#fff', true);
      await db.ref(args[0]).remove(); printTerm('🗑️ Удалено', '#f00'); break;
    case 'export': {
      const ex = { users: (await db.ref('users').once('value')).val(), chats: (await db.ref('chats').once('value')).val() };
      printTerm(`📦 Экспорт: ${JSON.stringify(ex).length} байт`, '#0f0'); break;
    }
    case 'wipe':
      if (!args[0]) return printTerm("❌ wipe <путь>", '#fff', true);
      if (!confirm(`⚠️ ОЧИСТИТЬ ${args[0]}?`)) return;
      await db.ref(args[0]).remove(); printTerm(`💥 Путь стёрт`, '#f00'); break;

    // ================= СИСТЕМА =================
    case 'status':
      printTerm(`🖥️ CPU: ${Math.floor(Math.random()*15+5)}% | MEM: ${Math.floor(Math.random()*2+1)}/${Math.floor(Math.random()*8+8)}GB | NET: SECURE | UPTIME: ${Math.floor(performance.now()/1000)}s`, '#0f0'); break;
    case 'config': printTerm('⚙️ Конфиг зашифрован. Доступ только через set/get', '#aaa'); break;
    case 'restart': printTerm('🔄 Перезагрузка...', '#0f0'); setTimeout(()=>location.reload(), 800); break;
    case 'shutdown': await db.ref('system/maintenance').set(true); printTerm('🛑 Система отключена', '#f00'); break;
    case 'startup': await db.ref('system/maintenance').remove(); printTerm('✅ Система запущена', '#0f0'); break;
    case 'decrypt': printTerm(args.length ? decrypt(args.join(' ')) : '❌ decrypt <текст>', '#0f0'); break;
    case 'encrypt': printTerm(args.length ? encrypt(args.join(' ')) : '❌ encrypt <текст>', '#0f0'); break;
    case 'ping': printTerm(args.length ? `PING ${args[0]}: 64 bytes, ttl=54, time=${Math.floor(Math.random()*80+10)}ms` : '❌ ping <юзер>', '#0f0'); break;
    case 'clear': document.getElementById('terminal-output').innerHTML = ''; break;
    case 'exit': printTerm('👋 Сеанс завершён', '#0f0'); setTimeout(()=>logout(), 400); break;

    // ================= УТИЛИТЫ & АЛИАСЫ =================
    case 'sudo': if(args.length) execCmd(args.join(' ')); else printTerm('❌ sudo <команда>', '#fff', true); break;
    case 'rm': if(args.length) { db.ref(args[0]).remove(); printTerm('🗑️ rm executed', '#0f0'); } break;
    case 'ls': execCmd('listusers'); break;
    case 'ps': execCmd('status'); break;
    case 'cat': if(args.length) execCmd('query ' + args[0]); else printTerm('❌ cat <путь>', '#fff', true); break;
    case 'force': printTerm('💪 Принудительный режим активирован', '#0f0'); break;
    case 'hide': printTerm('👻 Невидимость включена (mock)', '#0f0'); break;
    case 'show': printTerm('👁️ Невидимость выключена', '#0f0'); break;
    case 'theme': 
      const termEl = document.getElementById('terminal');
      if(args[0]==='white') termEl.style.color='#fff'; else termEl.style.color='#0f0';
      printTerm('🎨 Тема изменена', '#0f0'); break;
    case 'matrix': printTerm('🟩 Matrix rain activated (visual only)', '#0f0'); break;
    case 'history': termHist.forEach((h,i) => printTerm(`  ${i+1} ${h}`, '#888')); break;
    case 'neofetch': 
      printTerm("       SHPAK OS v4.0          ", '#0f0');
      printTerm("       root@killer             ", '#0f0');
      printTerm("       ─────────────           ", '#0f0');
      printTerm(`       User: ${currentUser.login}      `, '#0f0');
      printTerm(`       Role: ${currentUser.role}       `, '#0f0');
      printTerm(`       Chat: ${currentChatId}         `, '#0f0');
      printTerm(`       Shell: shpak-term 1.0   `, '#0f0');
      break;

    default: printTerm(`bash: ${c}: команда не найдена. Введите 'help'.`, '#fff', true);
  }
}

// ==========================================
// 🎧 ПРИВЯЗКА СОБЫТИЙ (ОДИН РАЗ ПРИ ЗАГРУЗКЕ)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const btnEnter = document.getElementById('btn-enter');
  const btnLogout = document.getElementById('btn-logout');
  const btnSend = document.getElementById('btn-send');
  const msgInputEl = document.getElementById('msg-input');
  const passInputEl = document.getElementById('pass');
  const cancelReplyBtn = document.getElementById('cancel-reply');

  if(btnEnter) btnEnter.onclick = login;
  if(btnLogout) btnLogout.onclick = logout;
  if(btnSend) btnSend.onclick = sendMessage;
  if(cancelReplyBtn) cancelReplyBtn.onclick = cancelReply;
  
  if(msgInputEl) {
      msgInputEl.addEventListener('keypress', e => { if(e.key==='Enter') sendMessage(); });
      msgInputEl.addEventListener('input', function() {
          const counter = document.getElementById('char-counter');
          if(counter) counter.textContent = `${this.value.length}/200`;
      });
  }
  
  if(passInputEl) passInputEl.addEventListener('keypress', e => { if(e.key==='Enter') login(); });
});
