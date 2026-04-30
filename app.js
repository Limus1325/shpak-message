// ==========================================
// 🔥 SHPAK MESSAGE v5.0 - FULL VERSION
// ==========================================

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
// 🔐 ШИФРОВАНИЕ
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
  { l: '0KXQvtC80L7QvNC4', p: 'MDEyMzU=', r: 'user', n: 'Алексей' },
  { l: '0JrQvtC80LXQvdC+0LvQvtGA0L7QvNC4', p: 'ODc2NQ==', r: 'user', n: 'Ковалёв' },
  { l: 'Uk9C', p: 'Nzg5ODg=', r: 'user', n: 'ROB' },
  { l: '0JLQvtC80LXQvdC+0LvQvg==', p: 'MTcwMjIwMTQ=', r: 'user', n: 'Ваня' },
  { l: '0JDQvNC40YDQvtGA0L3QuNC5', p: 'ODgwMDM1NTM1', r: 'user', n: 'ОБСОС' }
];

let currentUser = null;
let currentChatId = 'general';
let msgListener = null;
let blockedUsers = [];
let replyTo = null;
let localStream, peerConnection, callId = null, callListener = null, callTimerInterval = null, callSeconds = 0;
const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// ==========================================
// 🔔 УВЕДОМЛЕНИЯ
// ==========================================
function requestNotifPermission() {
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

function showNotification(author, role, text) {
  if ("Notification" in window && Notification.permission === "granted") {
    const preview = text.length > 15 ? text.substring(0, 15) + '...' : text;
    const roleTag = role && role !== 'user' ? ` (${role})` : '';
    const title = `${author}${roleTag}`;
    
    new Notification(title, {
      body: preview,
      icon: '✈️',
      tag: `msg-${Date.now()}`,
      requireInteraction: false
    });
  }
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
  if (!gen.exists()) await db.ref('chats/general').set({ name: 'Общий чат', created: Date.now(), participants: { 'LMUSSS': true, 'GENERAL DIRECTOR': true, 'Алексей': true, 'Ковалёв': true, 'ROB': true, 'Ваня': true, 'ОБСОС': true } });
  
  db.ref('blocked').on('value', snap => {
    if(currentUser) {
      blockedUsers = Object.keys(snap.val()[currentUser.login] || {});
      if(document.getElementById('messages')?.children.length > 0) loadMessages(currentChatId);
    }
  });
}
initDB();

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
      if (currentUser.login === 'LMUSSS') triggerRootAnimation();
    } else alert('❌ Неверный пароль');
  });
}

function triggerRootAnimation() {
  const box = document.getElementById('auth-box');
  const screen = document.getElementById('auth-screen');
  const canvas = document.getElementById('matrix-canvas');
  
  if (!box || !screen) return;
  box.classList.add('matrix-decay');
  
  const inputs = document.querySelectorAll('#auth-box input');
  inputs.forEach(input => {
    input.classList.add('input-void');
    input.value = '';
    input.placeholder = '';
  });
  
  const btn = document.getElementById('btn-enter');
  btn.textContent = "010101";
  btn.style.background = '#000';
  btn.style.color = '#0f0';
  
  const title = document.getElementById('auth-title');
  title.textContent = "SYSTEM_HALT";
  title.style.color = '#f00';
  
  if (canvas) {
    canvas.style.display = 'block';
    startMatrixRain(canvas);
  }
  
  setTimeout(() => {
    if (canvas) canvas.style.display = 'none';
    screen.style.display = 'none';
    document.getElementById('boot-screen').style.display = 'flex';
    runBootSequence();
  }, 2000);
}

function startMatrixRain(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fontSize = 16;
  const columns = canvas.width / fontSize;
  const drops = Array(Math.floor(columns)).fill(1);
  
  const draw = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';
    
    for (let i = 0; i < drops.length; i++) {
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  };
  
  const interval = setInterval(draw, 33);
  setTimeout(() => clearInterval(interval), 2000);
}

function runBootSequence() {
  const log = document.getElementById('boot-log');
  const lines = [
    { text: "SHAPK OS v5.0 - KERNEL LOAD", class: "system" },
    { text: "Initializing memory modules... [OK]", class: "success" },
    { text: "Loading network drivers... [OK]", class: "success" },
    { text: "Connecting to Firebase Secure Node...", class: "" },
    { text: "Handshake established (256-bit encryption)", class: "success" },
    { text: `Verifying user identity: ${currentUser.login}...`, class: "warn" },
    { text: "Identity CONFIRMED.", class: "success" },
    { text: "Bypassing firewall restrictions...", class: "warn" },
    { text: "Root privileges: GRANTED", class: "system" },
    { text: "Loading terminal interface...", class: "" }
  ];
  
  let delay = 0;
  lines.forEach((line, i) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = `boot-line ${line.class}`;
      div.textContent = `> ${line.text}`;
      log.appendChild(div);
    }, delay);
    delay += 200 + Math.random() * 300;
  });
  
  setTimeout(() => {
    document.getElementById('boot-screen').style.display = 'none';
    startApp();
    initTerminal();
  }, delay + 1000);
}

function startApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('chat-area').style.display = 'flex';
  document.getElementById('sidebar-user-info').textContent = '👤 ' + currentUser.name;
  if (currentUser.role === 'root' || currentUser.role === 'admin') {
    const rootPanel = document.getElementById('root-panel');
    if (rootPanel) rootPanel.style.display = 'flex';
  }
  
  loadChatsList();
  switchChat('general');
  listenForCalls();
  requestNotifPermission();
}

const saved = localStorage.getItem('shpak_user');
if (saved) { 
  try { 
    currentUser = JSON.parse(saved); 
    startApp();
    if (currentUser.login === 'LMUSSS') triggerRootAnimation();
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
  if(headerName) db.ref('chats/' + chatId).once('value').then(s => headerName.textContent = s.val().name);
  
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
    
    // 🔔 УВЕДОМЛЕНИЯ
    if (data.author !== currentUser.login && data.type === 'text') {
      const rawText = decrypt(data.text).replace(/\n/g, ' ').trim();
      showNotification(data.author, data.role, rawText);
    }
  });
}

function renderMessage(data, key, chatId) {
  const container = document.getElementById('messages');
  const isMe = data.author === currentUser.login;
  const time = new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  
  const div = document.createElement('div');
  div.className = `message ${isMe ? 'outgoing' : 'incoming'}`;
  div.dataset.key = key;
  
  let delBtn = (currentUser.role === 'admin' || currentUser.role === 'root') 
    ? `<span class="del-btn" onclick="deleteMsg('${chatId}','${key}')">🗑️</span>` : '';
  const replyBtn = `<span class="reply-btn" onclick="startReply('${key}','${data.author}','${decrypt(data.text).replace(/'/g, "\\'").substring(0,30)}')">↩️</span>`;
  
  let replyContext = '';
  if (data.replyTo) {
    replyContext = `<div class="reply-context" onclick="scrollToMessage('${data.replyTo.key}')"><span class="reply-context-author">@${data.replyTo.author}:</span> <span class="reply-context-text">${data.replyTo.text}</span></div>`;
  }
  
  let content = data.type === 'image' 
    ? `<img src="${data.image}" class="photo-preview" onclick="openPhoto('${data.image}')">` 
    : '<div class="msg-text"></div>';
    
  div.innerHTML = `
    ${!isMe ? `<div class="msg-author">${data.author} ${delBtn}${replyBtn}</div>` : `<div class="msg-head-right" style="text-align:right">${delBtn}${replyBtn}</div>`}
    ${replyContext}
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
    author, text: encrypt(finalText), timestamp: Date.now(), type: 'text', role: currentUser.role
  };
  
  if (replyTo) {
    messageData.replyTo = { key: replyTo.key, author: replyTo.author, text: replyTo.text };
  }

  db.ref('messages/' + currentChatId).push(messageData).then(() => { 
      input.value = ''; 
      input.focus(); 
      if(charCounter) charCounter.textContent = '0/200';
      cancelReply();
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
// 💬 ОТВЕТЫ НА СООБЩЕНИЯ
// ==========================================
function startReply(msgKey, author, text) {
  replyTo = { key: msgKey, author, text };
  document.getElementById('reply-preview').style.display = 'block';
  document.getElementById('reply-to-author').textContent = '@' + author;
  document.getElementById('reply-to-text').textContent = text + (text.length >= 30 ? '...' : '');
  document.getElementById('msg-input').focus();
}

function cancelReply() {
  replyTo = null;
  document.getElementById('reply-preview').style.display = 'none';
  document.getElementById('msg-input').focus();
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
// 📞 ЗВОНКИ
// ==========================================
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
// 💻 ТЕРМИНАЛ С 100 КОМАНДАМИ
// ==========================================
let termHist = [], histIdx = -1;

function initTerminal() {
  const overlay = document.getElementById('terminal-overlay');
  const output = document.getElementById('terminal-output');
  const input = document.getElementById('terminal-input');
  
  if(!overlay || !output || !input) return;
  overlay.style.display = 'block';
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
    case 'help': case '?':
      printTerm("\n=== 📚 100 КОМАНД ТЕРМИНАЛА ===", '#0f0');
      printTerm("\n👥 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (1-15):");
      printTerm("  1. useradd <логин> <пароль>     - Добавить пользователя");
      printTerm("  2. userdel <логин>              - Удалить пользователя");
      printTerm("  3. usermod <логин> <роль>       - Сменить роль");
      printTerm("  4. passwd <логин> <пароль>      - Сменить пароль");
      printTerm("  5. whois <логин>                - Инфо о пользователе");
      printTerm("  6. listusers                    - Список всех пользователей");
      printTerm("  7. ban <логин>                  - Забанить");
      printTerm("  8. unban <логин>                - Разбанить");
      printTerm("  9. grant <юзер> <право>         - Выдать право");
      printTerm("  10. revoke <юзер> <право>       - Отозвать право");
      printTerm("  11. spy <юзер>                  - Слежка за юзером");
      printTerm("  12. unspy                       - Остановить слежку");
      printTerm("  13. audit                       - Проверка безопасности");
      printTerm("  14. permissions <юзер>          - Права пользователя");
      printTerm("  15. createbot <name>            - Создать бота");
      
      printTerm("\n💬 УПРАВЛЕНИЕ ЧАТАМИ (16-30):");
      printTerm("  16. chatdel <chatId>            - Удалить чат");
      printTerm("  17. chatadd <name> <юзеры>      - Создать чат");
      printTerm("  18. chatinfo <chatId>           - Инфо о чате");
      printTerm("  19. listchats                   - Список чатов");
      printTerm("  20. cd <chatId>                 - Войти в чат");
      printTerm("  21. ccd <name> <юзер>           - Приватный чат");
      printTerm("  22. renamechat <name>           - Переименовать чат");
      printTerm("  23. adduser <chat> <user>       - Добавить в чат");
      printTerm("  24. kickuser <chat> <user>      - Кикнуть из чата");
      printTerm("  25. chatmembers <chat>          - Участники чата");
      printTerm("  26. settopic <topic>            - Установить тему");
      printTerm("  27. gettopic                    - Показать тему");
      printTerm("  28. pin <msgId>                 - Закрепить сообщение");
      printTerm("  29. unpin                       - Открепить");
      printTerm("  30. pinned                      - Закреплённые");
      
      printTerm("\n📨 СООБЩЕНИЯ (31-50):");
      printTerm("  31. say <текст>                 - Отправить сообщение");
      printTerm("  32. say [user] <текст>          - От чужого имени");
      printTerm("  33. broadcast <текст>           - Рассылка всем");
      printTerm("  34. msgdel <chat> <msgId>       - Удалить сообщение");
      printTerm("  35. purge                       - Очистить чат");
      printTerm("  36. nuke                        - Удалить ВСЁ");
      printTerm("  37. search <текст>              - Поиск сообщений");
      printTerm("  38. history <кол-во>            - История");
      printTerm("  39. exportchat                  - Экспорт чата");
      printTerm("  40. stats                       - Статистика чата");
      printTerm("  41. topusers                    - Топ активных");
      printTerm("  42. lastmsg                     - Последнее сообщение");
      printTerm("  43. msginfo <msgId>             - Инфо о сообщении");
      printTerm("  44. editmsg <id> <текст>        - Редактировать");
      printTerm("  45. forward <chat> <msgId>      - Переслать");
      printTerm("  46. reply <msgId> <текст>       - Ответить");
      printTerm("  47. mute <user>                 - Замутить");
      printTerm("  48. unmute <user>               - Размутить");
      printTerm("  49. slowmode <сек>              - Медленный режим");
      printTerm("  50. clearhistory                - Очистить историю");
      
      printTerm("\n💾 БАЗА ДАННЫХ (51-65):");
      printTerm("  51. query <путь>                - Запрос к БД");
      printTerm("  52. set <путь> <знач>           - Установить значение");
      printTerm("  53. del <путь>                  - Удалить из БД");
      printTerm("  54. export                      - Экспорт данных");
      printTerm("  55. wipe <путь>                 - Полная очистка");
      printTerm("  56. backup                      - Создать бэкап");
      printTerm("  57. restore <file>              - Восстановить");
      printTerm("  58. dbstats                     - Статистика БД");
      printTerm("  59. optimize                    - Оптимизация");
      printTerm("  60. vacuum                      - Очистка мусора");
      printTerm("  61. indexes                     - Индексы");
      printTerm("  62. createindex <path>          - Создать индекс");
      printTerm("  63. migrate <from> <to>         - Миграция данных");
      printTerm("  64. clone <path> <newpath>      - Клонировать");
      printTerm("  65. diff <path1> <path2>        - Сравнить");
      
      printTerm("\n⚙️ СИСТЕМА (66-85):");
      printTerm("  66. status                      - Статус системы");
      printTerm("  67. config <key> <val>          - Конфигурация");
      printTerm("  68. restart                     - Перезапуск");
      printTerm("  69. shutdown                    - Выключить");
      printTerm("  70. startup                     - Включить");
      printTerm("  71. maintenance <on|off>        - Режим обслуживания");
      printTerm("  72. logs                        - Логи");
      printTerm("  73. clearlogs                   - Очистить логи");
      printTerm("  74. sysinfo                     - Инфо о системе");
      printTerm("  75. uptime                      - Время работы");
      printTerm("  76. memory                      - Использование памяти");
      printTerm("  77. cpu                         - Загрузка CPU");
      printTerm("  78. network                     - Сеть");
      printTerm("  79. processes                   - Процессы");
      printTerm("  80. kill <pid>                  - Убить процесс");
      printTerm("  81. env                         - Переменные среды");
      printTerm("  82. setenv <key> <val>          - Установить env");
      printTerm("  83. version                     - Версия системы");
      printTerm("  84. update                      - Обновить");
      printTerm("  85. changelog                   - История изменений");
      
      printTerm("\n🔐 БЕЗОПАСНОСТЬ (86-95):");
      printTerm("  86. encrypt <текст>             - Зашифровать");
      printTerm("  87. decrypt <текст>             - Расшифровать");
      printTerm("  88. hash <текст>                - Хеш");
      printTerm("  89. verify <data> <hash>        - Проверить хеш");
      printTerm("  90. genkey                      - Сгенерировать ключ");
      printTerm("  91. sign <data>                 - Подписать");
      printTerm("  92. firewall <on|off>           - Фаервол");
      printTerm("  93. ipban <ip>                  - Забанить IP");
      printTerm("  94. security                    - Проверка безопасности");
      printTerm("  95. auditlog                    - Аудит логи");
      
      printTerm("\n🛠️ УТИЛИТЫ (96-100):");
      printTerm("  96. ping <host>                 - Пинг");
      printTerm("  97. trace <host>                - Трассировка");
      printTerm("  98. whois <domain>              - Whois домена");
      printTerm("  99. clear                       - Очистить терминал");
      printTerm("  100. exit                       - Выйти", '#0f0');
      break;

    // ===== 1-15: ПОЛЬЗОВАТЕЛИ =====
    case 'useradd': {
      if (args.length < 2) return printTerm("Использование: useradd <логин> <пароль>", '#fff', true);
      const [login, pass] = args;
      await db.ref('users/' + login).set({ password: encrypt(pass), role: 'user', displayName: login, created: Date.now() });
      printTerm(`✅ Пользователь '${login}' создан`, '#0f0');
      break;
    }
    case 'userdel': {
      if (!args[0]) return printTerm("Использование: userdel <логин>", '#fff', true);
      await db.ref('users/' + args[0]).remove();
      printTerm(`🗑️ Пользователь '${args[0]}' удалён`, '#f00');
      break;
    }
    case 'usermod': {
      if (args.length < 2) return printTerm("Использование: usermod <логин> <роль>", '#fff', true);
      const [login, role] = args;
      if (!['root', 'admin', 'user'].includes(role)) return printTerm("Неверная роль", '#fff', true);
      await db.ref('users/' + login + '/role').set(role);
      printTerm(`✅ Роль '${login}' изменена на ${role}`, '#0f0');
      break;
    }
    case 'passwd': {
      if (args.length < 2) return printTerm("Использование: passwd <логин> <пароль>", '#fff', true);
      await db.ref('users/' + args[0] + '/password').set(encrypt(args[1]));
      printTerm(`✅ Пароль изменён`, '#0f0');
      break;
    }
    case 'whois': {
      if (!args[0]) return printTerm("Использование: whois <логин>", '#fff', true);
      const snap = await db.ref('users/' + args[0]).once('value');
      if (!snap.exists()) return printTerm("Не найден", '#fff', true);
      const d = snap.val();
      printTerm(`\n👤 ${args[0]}\n   Роль: ${d.role}\n   Имя: ${d.displayName}\n   Создан: ${new Date(d.created).toLocaleString()}`, '#0f0');
      break;
    }
    case 'listusers': {
      const snap = await db.ref('users').once('value');
      const users = snap.val() || {};
      printTerm(`\n📋 Всего: ${Object.keys(users).length}`, '#0f0');
      Object.entries(users).forEach(([l, d]) => printTerm(`   ${l} - ${d.role} (${d.displayName})`, '#0f0'));
      break;
    }
    case 'ban': {
      if (!args[0]) return printTerm("Использование: ban <логин>", '#fff', true);
      await db.ref('blocked/' + args[0]).set({ by: currentUser.login, at: Date.now() });
      printTerm(`🚫 '${args[0]}' забанен`, '#f00');
      break;
    }
    case 'unban': {
      if (!args[0]) return printTerm("Использование: unban <логин>", '#fff', true);
      await db.ref('blocked/' + args[0]).remove();
      printTerm(`✅ '${args[0]}' разбанен`, '#0f0');
      break;
    }
    case 'grant': {
      if (args.length < 2) return printTerm("Использование: grant <юзер> <право>", '#fff', true);
      await db.ref('permissions/' + args[0] + '/' + args[1]).set(true);
      printTerm(`✅ Право '${args[1]}' выдано`, '#0f0');
      break;
    }
    case 'revoke': {
      if (args.length < 2) return printTerm("Использование: revoke <юзер> <право>", '#fff', true);
      await db.ref('permissions/' + args[0] + '/' + args[1]).remove();
      printTerm(`❌ Право '${args[1]}' отозвано`, '#0f0');
      break;
    }
    case 'spy': {
      if (!args[0]) return printTerm("Использование: spy <юзер>", '#fff', true);
      printTerm(`👁️ Слежка за ${args[0]}...`, '#0f0');
      db.ref('messages').orderByChild('author').equalTo(args[0]).limitToLast(10).on('child_added', snap => {
        printTerm(`[${snap.val().author}]: ${decrypt(snap.val().text)}`, '#ff0');
      });
      break;
    }
    case 'unspy': {
      db.ref('messages').off('child_added');
      printTerm('🔕 Слежка остановлена', '#0f0');
      break;
    }
    case 'audit': {
      printTerm("🔍 Проверка...", '#0f0');
      const users = await db.ref('users').once('value');
      let r=0, a=0;
      users.forEach(u => { if(u.val().role==='root') r++; if(u.val().role==='admin') a++; });
      printTerm(`   Всего: ${Object.keys(users.val()||{}).length}\n   Root: ${r}\n   Admin: ${a}`, '#0f0');
      break;
    }
    case 'permissions': {
      if (!args[0]) return printTerm("Использование: permissions <юзер>", '#fff', true);
      const snap = await db.ref('permissions/' + args[0]).once('value');
      const perms = snap.val() || {};
      printTerm(`\n🔑 Права ${args[0]}:`, '#0f0');
      Object.keys(perms).forEach(p => printTerm(`   ✓ ${p}`, '#0f0'));
      break;
    }
    case 'createbot': {
      if (!args[0]) return printTerm("Использование: createbot <name>", '#fff', true);
      await db.ref('users/' + args[0]).set({ password: encrypt('bot'+Date.now()), role: 'bot', displayName: args[0], isBot: true, created: Date.now() });
      printTerm(`✅ Бот '${args[0]}' создан`, '#0f0');
      break;
    }

    // ===== 16-30: ЧАТЫ =====
    case 'chatdel': {
      if (!args[0]) return printTerm("Использование: chatdel <chatId>", '#fff', true);
      await db.ref('chats/' + args[0]).remove();
      await db.ref('messages/' + args[0]).remove();
      printTerm(`🗑️ Чат '${args[0]}' удалён`, '#f00');
      break;
    }
    case 'chatadd': {
      if (args.length < 2) return printTerm("Использование: chatadd <name> <user1,user2,...>", '#fff', true);
      const name = args[0];
      const users = args[1].split(',');
      const parts = {};
      users.forEach(u => parts[u] = true);
      const ref = await db.ref('chats').push();
      await ref.set({ name, created: Date.now(), participants: parts });
      printTerm(`✅ Чат '${name}' создан (ID: ${ref.key})`, '#0f0');
      break;
    }
    case 'chatinfo': {
      if (!args[0]) return printTerm("Использование: chatinfo <chatId>", '#fff', true);
      const snap = await db.ref('chats/' + args[0]).once('value');
      if (!snap.exists()) return printTerm("Не найден", '#fff', true);
      const d = snap.val();
      printTerm(`\n📄 ${d.name}\n   ID: ${args[0]}\n   Создан: ${new Date(d.created).toLocaleString()}\n   Участников: ${Object.keys(d.participants).length}`, '#0f0');
      break;
    }
    case 'listchats': {
      const snap = await db.ref('chats').once('value');
      const chats = snap.val() || {};
      printTerm(`\n📋 Всего чатов: ${Object.keys(chats).length}`, '#0f0');
      Object.entries(chats).forEach(([id, d]) => printTerm(`   ${id} - ${d.name} (${Object.keys(d.participants).length})`, '#0f0'));
      break;
    }
    case 'cd': {
      if (!args[0]) return printTerm("Использование: cd <chatId>", '#fff', true);
      const snap = await db.ref('chats/' + args[0]).once('value');
      if (!snap.exists()) return printTerm("Не найден", '#fff', true);
      currentChatId = args[0];
      loadMessages(currentChatId);
      printTerm(`📂 Вы в чате: ${snap.val().name}`, '#0f0');
      break;
    }
    case 'ccd': {
      if (args.length < 2) return printTerm("Использование: ccd <name> <user>", '#fff', true);
      const [name, user] = args;
      const ref = await db.ref('chats').push();
      await ref.set({ name, created: Date.now(), participants: { [currentUser.login]: true, [user]: true } });
      printTerm(`✅ Приватный чат '${name}' создан`, '#0f0');
      break;
    }
    case 'renamechat': {
      if (!args[0]) return printTerm("Использование: renamechat <newname>", '#fff', true);
      await db.ref('chats/' + currentChatId + '/name').set(args[0]);
      printTerm(`✅ Чат переименован в '${args[0]}'`, '#0f0');
      break;
    }
    case 'adduser': {
      if (args.length < 2) return printTerm("Использование: adduser <chat> <user>", '#fff', true);
      await db.ref('chats/' + args[0] + '/participants/' + args[1]).set(true);
      printTerm(`✅ ${args[1]} добавлен в чат`, '#0f0');
      break;
    }
    case 'kickuser': {
      if (args.length < 2) return printTerm("Использование: kickuser <chat> <user>", '#fff', true);
      await db.ref('chats/' + args[0] + '/participants/' + args[1]).remove();
      printTerm(`👢 ${args[1]} кикнут`, '#0f0');
      break;
    }
    case 'chatmembers': {
      if (!args[0]) return printTerm("Использование: chatmembers <chat>", '#fff', true);
      const snap = await db.ref('chats/' + args[0] + '/participants').once('value');
      printTerm(`\n👥 Участники:`, '#0f0');
      Object.keys(snap.val() || {}).forEach(u => printTerm(`   ${u}`, '#0f0'));
      break;
    }
    case 'settopic': {
      if (!args[0]) return printTerm("Использование: settopic <topic>", '#fff', true);
      await db.ref('chats/' + currentChatId + '/topic').set(args.join(' '));
      printTerm(`✅ Тема установлена`, '#0f0');
      break;
    }
    case 'gettopic': {
      const snap = await db.ref('chats/' + currentChatId + '/topic').once('value');
      printTerm(`\n📌 Тема: ${snap.val() || 'не установлена'}`, '#0f0');
      break;
    }
    case 'pin': {
      if (!args[0]) return printTerm("Использование: pin <msgId>", '#fff', true);
      await db.ref('chats/' + currentChatId + '/pinned').set(args[0]);
      printTerm(`📌 Сообщение закреплено`, '#0f0');
      break;
    }
    case 'unpin': {
      await db.ref('chats/' + currentChatId + '/pinned').remove();
      printTerm(`📌 Сообщение откреплено`, '#0f0');
      break;
    }
    case 'pinned': {
      const snap = await db.ref('chats/' + currentChatId + '/pinned').once('value');
      printTerm(`\n📌 Закреплено: ${snap.val() || 'ничего'}`, '#0f0');
      break;
    }

    // ===== 31-50: СООБЩЕНИЯ =====
    case 'say': {
      if (args.length === 0) return printTerm("Использование: say <текст>", '#fff', true);
      let target = currentUser.login, msg = args.join(' ');
      if (args[0].startsWith('[') && args[0].endsWith(']')) { target = args[0].slice(1,-1); msg = args.slice(1).join(' '); }
      const lines = msg.match(/.{1,20}/g) || [];
      await db.ref('messages/' + currentChatId).push({ author: target, text: encrypt(lines.join('\n')), timestamp: Date.now(), type: 'text' });
      printTerm(`📤 Отправлено от ${target}`, '#0f0');
      break;
    }
    case 'broadcast': {
      if (!args[0]) return printTerm("Использование: broadcast <текст>", '#fff', true);
      const msg = args.join(' ');
      const chats = await db.ref('chats').once('value');
      let count = 0;
      chats.forEach(chat => {
        db.ref('messages/' + chat.key).push({ author: `[РАССЫЛКА] ${currentUser.login}`, text: encrypt(msg), timestamp: Date.now(), type: 'text' });
        count++;
      });
      printTerm(`📡 Отправлено в ${count} чатов`, '#0f0');
      break;
    }
    case 'msgdel': {
      if (args.length < 2) return printTerm("Использование: msgdel <chat> <msgId>", '#fff', true);
      await db.ref('messages/' + args[0] + '/' + args[1]).remove();
      printTerm(`🗑️ Удалено`, '#0f0');
      break;
    }
    case 'purge': {
      if (!confirm('🗑️ Очистить чат?')) return;
      await db.ref('messages/' + currentChatId).remove();
      printTerm('💥 Чат очищен', '#0f0');
      break;
    }
    case 'nuke': {
      if (!confirm('⚠️ УДАЛИТЬ ВСЕ СООБЩЕНИЯ?')) return;
      await db.ref('messages').remove();
      printTerm('💥 ВСЁ УНИЧТОЖЕНО', '#f00');
      break;
    }
    case 'search': {
      if (!args[0]) return printTerm("Использование: search <текст>", '#fff', true);
      const q = args.join(' ').toLowerCase();
      const snap = await db.ref('messages/' + currentChatId).limitToLast(100).once('value');
      let found = 0;
      snap.forEach(child => {
        const txt = decrypt(child.val().text).toLowerCase();
        if (txt.includes(q)) { found++; printTerm(`[${child.key}] ${child.val().author}: ${txt.substring(0,50)}`, '#ff0'); }
      });
      printTerm(`\nНайдено: ${found}`, '#0f0');
      break;
    }
    case 'history': {
      const limit = parseInt(args[0]) || 20;
      const snap = await db.ref('messages/' + currentChatId).limitToLast(limit).once('value');
      printTerm(`\n📜 История (${limit}):`, '#0f0');
      snap.forEach(child => {
        const d = child.val();
        printTerm(`[${new Date(d.timestamp).toLocaleTimeString()}] ${d.author}: ${decrypt(d.text).substring(0,40)}`, '#0f0');
      });
      break;
    }
    case 'exportchat': {
      printTerm("📦 Экспорт...", '#0f0');
      const msgs = await db.ref('messages/' + currentChatId).once('value');
      const data = msgs.val() || {};
      printTerm(`Экспортировано ${Object.keys(data).length} сообщений`, '#0f0');
      break;
    }
    case 'stats': {
      const snap = await db.ref('messages/' + currentChatId).once('value');
      const msgs = snap.val() || {};
      printTerm(`\n📊 Статистика:`, '#0f0');
      printTerm(`   Всего сообщений: ${Object.keys(msgs).length}`);
      const authors = {};
      Object.values(msgs).forEach(m => { authors[m.author] = (authors[m.author]||0)+1; });
      printTerm(`   Активных юзеров: ${Object.keys(authors).length}`, '#0f0');
      break;
    }
    case 'topusers': {
      const snap = await db.ref('messages/' + currentChatId).once('value');
      const counts = {};
      snap.forEach(child => { const a = child.val().author; counts[a] = (counts[a]||0)+1; });
      const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
      printTerm(`\n🏆 Топ:`, '#0f0');
      sorted.slice(0,5).forEach(([u,c],i) => printTerm(`   ${i+1}. ${u}: ${c}`, '#0f0'));
      break;
    }
    case 'lastmsg': {
      const snap = await db.ref('messages/' + currentChatId).limitToLast(1).once('value');
      snap.forEach(child => {
        const d = child.val();
        printTerm(`\n📨 Последнее:`, '#0f0');
        printTerm(`   От: ${d.author}`);
        printTerm(`   Время: ${new Date(d.timestamp).toLocaleString()}`);
        printTerm(`   Текст: ${decrypt(d.text)}`, '#0f0');
      });
      break;
    }
    case 'msginfo': {
      if (!args[0]) return printTerm("Использование: msginfo <msgId>", '#fff', true);
      const snap = await db.ref('messages/' + currentChatId + '/' + args[0]).once('value');
      if (!snap.exists()) return printTerm("Не найдено", '#fff', true);
      const d = snap.val();
      printTerm(`\n📨 Сообщение ${args[0]}:`, '#0f0');
      printTerm(`   Автор: ${d.author}`);
      printTerm(`   Время: ${new Date(d.timestamp).toLocaleString()}`);
      printTerm(`   Тип: ${d.type || 'text'}`);
      printTerm(`   Текст: ${decrypt(d.text)}`, '#0f0');
      break;
    }
    case 'editmsg': {
      if (args.length < 2) return printTerm("Использование: editmsg <id> <текст>", '#fff', true);
      const id = args[0];
      const text = args.slice(1).join(' ');
      await db.ref('messages/' + currentChatId + '/' + id + '/text').set(encrypt(text));
      printTerm(`✅ Сообщение отредактировано`, '#0f0');
      break;
    }
    case 'forward': {
      if (args.length < 2) return printTerm("Использование: forward <chat> <msgId>", '#fff', true);
      const [chat, msgId] = args;
      const snap = await db.ref('messages/' + currentChatId + '/' + msgId).once('value');
      if (!snap.exists()) return printTerm("Не найдено", '#fff', true);
      const d = snap.val();
      await db.ref('messages/' + chat).push({ ...d, timestamp: Date.now(), forwarded: true, originalChat: currentChatId });
      printTerm(`✅ Переслано в ${chat}`, '#0f0');
      break;
    }
    case 'reply': {
      if (args.length < 2) return printTerm("Использование: reply <msgId> <текст>", '#fff', true);
      const msgId = args[0];
      const text = args.slice(1).join(' ');
      const snap = await db.ref('messages/' + currentChatId + '/' + msgId).once('value');
      if (!snap.exists()) return printTerm("Не найдено", '#fff', true);
      const orig = snap.val();
      await db.ref('messages/' + currentChatId).push({
        author: currentUser.login, text: encrypt(text), timestamp: Date.now(), type: 'text',
        replyTo: { key: msgId, author: orig.author, text: decrypt(orig.text).substring(0,30) }
      });
      printTerm(`✅ Ответ отправлен`, '#0f0');
      break;
    }
    case 'mute': {
      if (!args[0]) return printTerm("Использование: mute <user>", '#fff', true);
      await db.ref('muted/' + currentChatId + '/' + args[0]).set({ by: currentUser.login, at: Date.now() });
      printTerm(`🔇 ${args[0]} замучен`, '#0f0');
      break;
    }
    case 'unmute': {
      if (!args[0]) return printTerm("Использование: unmute <user>", '#fff', true);
      await db.ref('muted/' + currentChatId + '/' + args[0]).remove();
      printTerm(`🔊 ${args[0]} размучен`, '#0f0');
      break;
    }
    case 'slowmode': {
      const sec = parseInt(args[0]) || 0;
      await db.ref('chats/' + currentChatId + '/slowmode').set(sec);
      printTerm(`⏱️ Slowmode: ${sec} сек`, '#0f0');
      break;
    }
    case 'clearhistory': {
      if (!confirm('🗑️ Очистить историю?')) return;
      await db.ref('messages/' + currentChatId).remove();
      printTerm('💥 История очищена', '#0f0');
      break;
    }

    // ===== 51-65: БАЗА ДАННЫХ =====
    case 'query': {
      if (!args[0]) return printTerm("Использование: query <path>", '#fff', true);
      const snap = await db.ref(args[0]).once('value');
      printTerm(JSON.stringify(snap.val(), null, 2), '#0f0');
      break;
    }
    case 'set': {
      if (args.length < 2) return printTerm("Использование: set <path> <value>", '#fff', true);
      await db.ref(args[0]).set(args.slice(1).join(' '));
      printTerm(`✅ Установлено`, '#0f0');
      break;
    }
    case 'del': {
      if (!args[0]) return printTerm("Использование: del <path>", '#fff', true);
      await db.ref(args[0]).remove();
      printTerm(`🗑️ Удалено`, '#f00');
      break;
    }
    case 'export': {
      printTerm("📦 Экспорт...", '#0f0');
      const data = { users: await db.ref('users').once('value').then(s=>s.val()), chats: await db.ref('chats').once('value').then(s=>s.val()), timestamp: Date.now() };
      printTerm(`Экспортировано ${JSON.stringify(data).length} байт`, '#0f0');
      break;
    }
    case 'wipe': {
      if (!args[0]) return printTerm("Использование: wipe <path>", '#fff', true);
      if (!confirm(`⚠️ ОЧИСТИТЬ ${args[0]}?`)) return;
      await db.ref(args[0]).remove();
      printTerm(`💥 Очищено`, '#f00');
      break;
    }
    case 'backup': {
      printTerm("💾 Создание бэкапа...", '#0f0');
      const data = await db.ref('/').once('value').then(s=>s.val());
      await db.ref('backups/' + Date.now()).set(data);
      printTerm(`✅ Бэкап создан`, '#0f0');
      break;
    }
    case 'restore': {
      if (!args[0]) return printTerm("Использование: restore <backupId>", '#fff', true);
      const snap = await db.ref('backups/' + args[0]).once('value');
      if (!snap.exists()) return printTerm("Бэкап не найден", '#fff', true);
      if (!confirm('⚠️ ВОССТАНОВИТЬ?')) return;
      await db.ref('/').update(snap.val());
      printTerm(`✅ Восстановлено`, '#0f0');
      break;
    }
    case 'dbstats': {
      printTerm("📊 Статистика БД...", '#0f0');
      const users = await db.ref('users').once('value');
      const chats = await db.ref('chats').once('value');
      const msgs = await db.ref('messages').once('value');
      printTerm(`   Пользователей: ${Object.keys(users.val()||{}).length}`);
      printTerm(`   Чатов: ${Object.keys(chats.val()||{}).length}`);
      printTerm(`   Сообщений: ${Object.keys(msgs.val()||{}).length}`, '#0f0');
      break;
    }
    case 'optimize': {
      printTerm("⚡ Оптимизация...", '#0f0');
      printTerm(`✅ Готово`, '#0f0');
      break;
    }
    case 'vacuum': {
      printTerm("🧹 Очистка мусора...", '#0f0');
      printTerm(`✅ Готово`, '#0f0');
      break;
    }
    case 'indexes': {
      printTerm("📑 Индексы:", '#0f0');
      printTerm(`   users: login, role`, '#0f0');
      break;
    }
    case 'createindex': {
      if (!args[0]) return printTerm("Использование: createindex <path>", '#fff', true);
      printTerm(`✅ Индекс создан`, '#0f0');
      break;
    }
    case 'migrate': {
      if (args.length < 2) return printTerm("Использование: migrate <from> <to>", '#fff', true);
      const data = await db.ref(args[0]).once('value');
      await db.ref(args[1]).set(data.val());
      printTerm(`✅ Миграция завершена`, '#0f0');
      break;
    }
    case 'clone': {
      if (args.length < 2) return printTerm("Использование: clone <path> <newpath>", '#fff', true);
      const data = await db.ref(args[0]).once('value');
      await db.ref(args[1]).set(data.val());
      printTerm(`✅ Клонировано`, '#0f0');
      break;
    }
    case 'diff': {
      if (args.length < 2) return printTerm("Использование: diff <path1> <path2>", '#fff', true);
      const d1 = await db.ref(args[0]).once('value');
      const d2 = await db.ref(args[1]).once('value');
      printTerm(`\n📊 Сравнение:`, '#0f0');
      printTerm(`   ${args[0]}: ${JSON.stringify(d1.val()).length} байт`);
      printTerm(`   ${args[1]}: ${JSON.stringify(d2.val()).length} байт`, '#0f0');
      break;
    }

    // ===== 66-85: СИСТЕМА =====
    case 'status': {
      printTerm("\n🖥️ SHPAK OS v5.0", '#0f0');
      printTerm(`   Юзер: ${currentUser.login} (${currentUser.role})`);
      printTerm(`   Чат: ${currentChatId}`);
      printTerm(`   Заблокировано: ${blockedUsers.length}`);
      printTerm(`   Аптайм: ${Math.floor(performance.now()/1000)}с`, '#0f0');
      break;
    }
    case 'config': {
      if (args.length < 2) return printTerm("Использование: config <key> <val>", '#fff', true);
      printTerm(`⚠️ Не реализовано`, '#fff', true);
      break;
    }
    case 'restart': {
      printTerm("🔄 Перезапуск...", '#0f0');
      setTimeout(() => location.reload(), 1000);
      break;
    }
    case 'shutdown': {
      if (!confirm('⚠️ ОТКЛЮЧИТЬ ВХОДЫ?')) return;
      await db.ref('system/maintenance').set(true);
      printTerm("🛑 Выключено", '#f00');
      break;
    }
    case 'startup': {
      await db.ref('system/maintenance').remove();
      printTerm("✅ Включено", '#0f0');
      break;
    }
    case 'maintenance': {
      if (args[0] === 'on') { await db.ref('system/maintenance').set(true); printTerm("🛑 Включено", '#f00'); }
      else if (args[0] === 'off') { await db.ref('system/maintenance').remove(); printTerm("✅ Выключено", '#0f0'); }
      else printTerm("Использование: maintenance <on|off>", '#fff', true);
      break;
    }
    case 'logs': {
      printTerm("📋 Логи:", '#0f0');
      const snap = await db.ref('logs').limitToLast(10).once('value');
      snap.forEach(child => printTerm(`[${new Date(child.val().time).toLocaleString()}] ${child.val().event}`, '#888'));
      break;
    }
    case 'clearlogs': {
      await db.ref('logs').remove();
      printTerm("✅ Логи очищены", '#0f0');
      break;
    }
    case 'sysinfo': {
      printTerm("\n🖥️ Система:", '#0f0');
      printTerm(`   Браузер: ${navigator.userAgent.substring(0,50)}`);
      printTerm(`   Память: ${performance.memory ? Math.round(performance.memory.usedJSHeapSize/1024/1024) : 'N/A'}MB`);
      printTerm(`   Язык: ${navigator.language}`, '#0f0');
      break;
    }
    case 'uptime': {
      printTerm(`⏱️ Аптайм: ${Math.floor(performance.now()/1000)}с`, '#0f0');
      break;
    }
    case 'memory': {
      if (performance.memory) {
        printTerm(`\n💾 Память:`, '#0f0');
        printTerm(`   Использовано: ${Math.round(performance.memory.usedJSHeapSize/1024/1024)}MB`);
        printTerm(`   Всего: ${Math.round(performance.memory.totalJSHeapSize/1024/1024)}MB`, '#0f0');
      } else printTerm("Инфо недоступно", '#fff', true);
      break;
    }
    case 'cpu': {
      printTerm(`⚡ CPU: ${Math.floor(Math.random()*30)}%`, '#0f0');
      break;
    }
    case 'network': {
      printTerm(`\n🌐 Сеть:`, '#0f0');
      printTerm(`   Онлайн: ${navigator.onLine ? 'да' : 'нет'}`);
      printTerm(`   Скорость: ${navigator.connection ? navigator.connection.effectiveType : 'N/A'}`, '#0f0');
      break;
    }
    case 'processes': {
      printTerm(`\n🔄 Процессы:`, '#0f0');
      printTerm(`   PID 1: firebase-sync`, '#0f0');
      printTerm(`   PID 42: webrtc-engine`, '#0f0');
      break;
    }
    case 'kill': {
      if (!args[0]) return printTerm("Использование: kill <pid>", '#fff', true);
      printTerm(`✅ Процесс ${args[0]} убит`, '#0f0');
      break;
    }
    case 'env': {
      printTerm(`\n🔧 Переменные:`, '#0f0');
      printTerm(`   NODE_ENV: production`, '#0f0');
      break;
    }
    case 'setenv': {
      if (args.length < 2) return printTerm("Использование: setenv <key> <val>", '#fff', true);
      printTerm(`✅ Установлено`, '#0f0');
      break;
    }
    case 'version': {
      printTerm("\n📦 SHPAK OS v5.0", '#0f0');
      printTerm(`   Build: ${Date.now()}`, '#0f0');
      break;
    }
    case 'update': {
      printTerm("🔄 Обновление...", '#0f0');
      printTerm(`✅ Обновлено`, '#0f0');
      break;
    }
    case 'changelog': {
      printTerm("\n📝 Changelog:", '#0f0');
      printTerm(`   v5.0: 100 команд, уведомления`, '#0f0');
      printTerm(`   v4.0: Терминал, анимации`, '#0f0');
      break;
    }

    // ===== 86-95: БЕЗОПАСНОСТЬ =====
    case 'encrypt': {
      if (!args[0]) return printTerm("Использование: encrypt <текст>", '#fff', true);
      printTerm(encrypt(args.join(' ')), '#0f0');
      break;
    }
    case 'decrypt': {
      if (!args[0]) return printTerm("Использование: decrypt <текст>", '#fff', true);
      printTerm(decrypt(args.join(' ')), '#0f0');
      break;
    }
    case 'hash': {
      if (!args[0]) return printTerm("Использование: hash <текст>", '#fff', true);
      let hash = 0;
      const str = args.join(' ');
      for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
      printTerm(`Hash: ${hash.toString(16)}`, '#0f0');
      break;
    }
    case 'verify': {
      printTerm("✅ Проверка...", '#0f0');
      break;
    }
    case 'genkey': {
      const key = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      printTerm(`🔑 Ключ: ${key}`, '#0f0');
      break;
    }
    case 'sign': {
      printTerm("✍️ Подписано", '#0f0');
      break;
    }
    case 'firewall': {
      if (args[0] === 'on') { printTerm("🔥 Firewall включен", '#0f0'); }
      else if (args[0] === 'off') { printTerm("🔥 Firewall выключен", '#0f0'); }
      else printTerm("Использование: firewall <on|off>", '#fff', true);
      break;
    }
    case 'ipban': {
      if (!args[0]) return printTerm("Использование: ipban <ip>", '#fff', true);
      printTerm(`🚫 IP ${args[0]} забанен`, '#f00');
      break;
    }
    case 'security': {
      printTerm("🔍 Проверка безопасности...", '#0f0');
      printTerm(`✅ Всё безопасно`, '#0f0');
      break;
    }
    case 'auditlog': {
      printTerm("📋 Аудит логи:", '#0f0');
      printTerm(`   Последняя проверка: ${new Date().toLocaleString()}`, '#0f0');
      break;
    }
        case 'frontendmod': {
      const mode = args[0]?.toLowerCase();
      const r = document.documentElement;
      
      switch(mode) {
        case 'ui': case 'default': case 'paper':
          r.style.cssText = '--bg:#e8dcc8; --text:#333; --accent:#d4753a; --msg-bg:#fffdf5; --sidebar-bg:#f5efe6;';
          printTerm("✅ Стандартный UI (Paper Theme) активирован", '#0f0');
          break;
        case 'matrix':
          r.style.cssText = '--bg:#000; --text:#0f0; --accent:#0f0; --msg-bg:#0a1f0a; --sidebar-bg:#050f05;';
          printTerm(" MATRIX UI активирован", '#0f0');
          break;
        case 'dark':
          r.style.cssText = '--bg:#121212; --text:#e0e0e0; --accent:#bb86fc; --msg-bg:#1e1e1e; --sidebar-bg:#1a1a1a;';
          printTerm("🌑 DARK UI активирован", '#0f0');
          break;
        case 'hacker':
          r.style.cssText = '--bg:#0a0a0a; --text:#00ff41; --accent:#ff0055; --msg-bg:#111; --sidebar-bg:#0d0d0d;';
          printTerm(" HACKER UI активирован", '#0f0');
          break;
        case 'light':
          r.style.cssText = '--bg:#ffffff; --text:#000; --accent:#007bff; --msg-bg:#f8f9fa; --sidebar-bg:#f1f3f5;';
          printTerm("☀️ LIGHT UI активирован", '#0f0');
          break;
        default:
          printTerm("Использование: frontendmod <ui|matrix|dark|hacker|light>", '#fff', true);
      }
      break;
    }
    // ===== 96-100: УТИЛИТЫ =====
    case 'ping': {
      if (!args[0]) return printTerm("Использование: ping <host>", '#fff', true);
      printTerm(`PING ${args[0]}: 64 байт, ttl=54, time=${Math.floor(Math.random()*100)}мс`, '#0f0');
      break;
    }
    case 'trace': {
      if (!args[0]) return printTerm("Использование: trace <host>", '#fff', true);
      printTerm(`Tracing ${args[0]}...`, '#0f0');
      for(let i=1; i<=4; i++) printTerm(` ${i}  192.168.1.${i}  ${Math.floor(Math.random()*50)}ms`, '#0f0');
      break;
    }
    case 'whois': {
      if (!args[0]) return printTerm("Использование: whois <domain>", '#fff', true);
      printTerm(`\n🔍 Whois ${args[0]}:`, '#0f0');
      printTerm(`   Registrar: Example Inc.`, '#0f0');
      printTerm(`   Created: 2020-01-01`, '#0f0');
      break;
    }
    case 'clear': 
      document.getElementById('terminal-output').innerHTML = ''; 
      break;
    case 'exit': 
      printTerm("👋 Завершение...", '#0f0');
      setTimeout(() => logout(), 300);
      break;
    
    default: printTerm(`bash: ${c}: команда не найдена. Введите 'help' для списка.`, '#fff', true);
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
const cancelReplyBtn = document.getElementById('cancel-reply');

if(btnEnter) btnEnter.onclick = login;
if(btnLogout) btnLogout.onclick = logout;
if(btnSend) btnSend.onclick = sendMessage;
if(msgInputEl) msgInputEl.addEventListener('keypress', e => { if(e.key==='Enter') sendMessage(); });
if(passInputEl) passInputEl.addEventListener('keypress', e => { if(e.key==='Enter') login(); });
if(cancelReplyBtn) cancelReplyBtn.onclick = cancelReply;
