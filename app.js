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
  const inputs = document.querySelectorAll('#auth-box input');
  const btn = document.getElementById('btn-enter');
  const title = document.getElementById('auth-title');

  if (!box || !screen || !canvas) return;
  box.classList.add('matrix-decay');
  inputs.forEach(input => {
    input.classList.add('input-void');
    input.value = '';
    input.placeholder = '';
  });
  btn.textContent = "010101";
  btn.style.background = '#000';
  btn.style.color = '#0f0';
  btn.style.fontFamily = 'monospace';
  btn.style.border = '1px solid #0f0';
  title.textContent = "SYSTEM_HALT";
  title.style.color = '#f00';
  title.style.fontFamily = 'monospace';
  canvas.style.display = 'block';
  startMatrixRain(canvas);
  setTimeout(() => {
    canvas.style.display = 'none';
    screen.style.display = 'none';
    document.getElementById('boot-screen').style.display = 'flex';
    runBootSequence();
  }, 2000);
}

function startMatrixRain(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
  const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const alphabet = katakana + latin;
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

function runBootSequence() {
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
  let i = 0;
  const showLine = () => {
    if (i < lines.length) {
      const div = document.createElement('div');
      div.className = `boot-line ${lines[i].class}`;
      div.textContent = `> ${lines[i].text}`;
      log.appendChild(div);
      i++;
      setTimeout(showLine, 200 + Math.random() * 300);
    } else {
      setTimeout(() => {
        document.getElementById('boot-screen').style.display = 'none';
        startApp();
        initTerminal();
      }, 1000);
    }
  };
  showLine();
}

function startApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('chat-area').style.display = 'flex';
  document.getElementById('sidebar-user-info').textContent = '👤 ' + currentUser.name;
  if (currentUser.role === 'root' || currentUser.role === 'admin') document.getElementById('root-panel').style.display = 'flex';
  loadChatsList();
  switchChat('general');
  listenForCalls();
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
  let delBtn = (currentUser.role === 'admin' || currentUser.role === 'root') ? `<span class="del-btn" onclick="deleteMsg('${chatId}','${key}')">🗑️</span>` : '';
  const replyBtn = `<span class="reply-btn" onclick="startReply('${key}','${data.author}','${decrypt(data.text).replace(/'/g, "\\'").substring(0,30)}')">↩️</span>`;
  let replyContext = '';
  if (data.replyTo) {
    replyContext = `<div class="reply-context" onclick="scrollToMessage('${data.replyTo.key}')"><span class="reply-context-author">@${data.replyTo.author}:</span> <span class="reply-context-text">${data.replyTo.text}</span></div>`;
  }
  let content = data.type === 'image' ? `<img src="${data.image}" class="photo-preview" onclick="openPhoto('${data.image}','${data.author}','${time}')">` : '<div class="msg-text"></div>';
  div.innerHTML = `${!isMe ? `<div class="msg-author">${data.author} ${delBtn}${replyBtn}</div>` : `<div class="msg-head-right" style="text-align:right">${delBtn}${replyBtn}</div>`}${replyContext}${content}<div class="msg-meta"><span>${time}</span></div>`;
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

// ===== ТЕРМИНАЛ =====
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
      printTerm("\n=== 📚 70 МОГУЩЕСТВЕННЫХ КОМАНД ===", '#0f0');
      printTerm("\n👥 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ:");
      printTerm("  useradd <login> <pass>     - Добавить пользователя");
      printTerm("  userdel <login>            - Удалить пользователя навсегда");
      printTerm("  usermod <login> <role>     - Сменить роль (root/admin/user)");
      printTerm("  passwd <login> <newpass>   - Сменить пароль");
      printTerm("  whois <login>              - Информация о пользователе");
      printTerm("  listusers                  - Список всех пользователей");
      printTerm("  ban <login>                - Забанить глобально");
      printTerm("  unban <login>              - Разбанить");
      printTerm("  kick <login>               - Выгнать из чата");
      printTerm("  mute <login>               - Замутить");
      printTerm("  unmute <login>             - Размутить");
      
      printTerm("\n💬 УПРАВЛЕНИЕ ЧАТАМИ:");
      printTerm("  chatdel <chatId>           - Удалить чат");
      printTerm("  chatadd <name> <users>     - Создать чат");
      printTerm("  chatinfo <chatId>          - Информация о чате");
      printTerm("  listchats                  - Список чатов");
      printTerm("  cd <chatId>                - Войти в чат");
      printTerm("  ccd <name> <user>          - Создать приватный чат");
      
      printTerm("\n📨 СООБЩЕНИЯ:");
      printTerm("  say <msg>                  - Отправить сообщение");
      printTerm("  say [user] <msg>           - Отправить от имени");
      printTerm("  broadcast <msg>            - Рассылка во все чаты");
      printTerm("  msgdel <chatId> <msgId>    - Удалить сообщение");
      printTerm("  purge                      - Очистить текущий чат");
      printTerm("  nuke                       - Удалить ВСЕ сообщения");
      
      printTerm("\n🔐 БЕЗОПАСНОСТЬ:");
      printTerm("  grant <user> <perm>        - Выдать разрешение");
      printTerm("  revoke <user> <perm>       - Отозвать разрешение");
      printTerm("  spy <user>                 - Слежка за юзером");
      printTerm("  logs                       - Системные логи");
      printTerm("  audit                      - Проверка безопасности");
      
      printTerm("\n💾 БАЗА ДАННЫХ:");
      printTerm("  query <path>               - Запрос к БД");
      printTerm("  set <path> <value>         - Установить значение");
      printTerm("  del <path>                 - Удалить из БД");
      printTerm("  export                     - Экспорт данных");
      printTerm("  wipe <path>                - Полная очистка");
      printTerm("  backup                     - Создать бэкап");
      printTerm("  restore                    - Восстановить бэкап");
      
      printTerm("\n⚙️ СИСТЕМА:");
      printTerm("  status                     - Статус системы");
      printTerm("  config <key> <val>         - Изменить конфиг");
      printTerm("  restart                    - Перезапуск");
      printTerm("  shutdown                   - Отключить входы");
      printTerm("  startup                    - Включить входы");
      printTerm("  decrypt <text>             - Расшифровать");
      printTerm("  encrypt <text>             - Зашифровать");
      printTerm("  ping <user>                - Пинг юзера");
      printTerm("  trace <user>               - Трассировка");
      printTerm("  ip <user>                  - Узнать IP");
      printTerm("  clear                      - Очистить терминал");
      printTerm("  cls                        - Очистить (alias)");
      printTerm("  exit                       - Выйти");
      printTerm("  logout                     - Выйти (alias)");
      
      printTerm("\n🔧 УТИЛИТЫ:");
      printTerm("  sudo <cmd>                 - Выполнить как root");
      printTerm("  whoami                     - Текущий пользователь");
      printTerm("  ls                         - Список (alias listusers)");
      printTerm("  ps                         - Процессы (alias status)");
      printTerm("  rm <path>                  - Удалить (alias del)");
      printTerm("  cat <path>                 - Прочитать файл");
      printTerm("  echo <text>                - Вывести текст");
      printTerm("  date                       - Текущая дата");
      printTerm("  time                       - Текущее время");
      printTerm("  uptime                     - Время работы");
      printTerm("  version                    - Версия системы", '#0f0');
      break;

    case 'useradd': {
      if (args.length < 2) return printTerm("Использование: useradd <login> <pass>", '#fff', true);
      await db.ref('users/' + args[0]).set({ password: encrypt(args[1]), role: 'user', displayName: args[0], created: Date.now() });
      printTerm(`✅ Пользователь '${args[0]}' создан`, '#0f0'); break; }
    case 'userdel': {
      if (!args[0]) return printTerm("Использование: userdel <login>", '#fff', true);
      await db.ref('users/' + args[0]).remove(); printTerm(`🗑️ '${args[0]}' удалён`, '#f00'); break; }
    case 'usermod': {
      if (args.length < 2) return printTerm("Использование: usermod <login> <role>", '#fff', true);
      await db.ref('users/' + args[0] + '/role').set(args[1]); printTerm(`✅ Роль изменена`, '#0f0'); break; }
    case 'passwd': {
      if (args.length < 2) return printTerm("Использование: passwd <login> <newpass>", '#fff', true);
      await db.ref('users/' + args[0] + '/password').set(encrypt(args[1])); printTerm(`✅ Пароль изменён`, '#0f0'); break; }
    case 'whois': {
      if (!args[0]) return printTerm("Использование: whois <login>", '#fff', true);
      const snap = await db.ref('users/' + args[0]).once('value');
      if (!snap.exists()) return printTerm("Не найден", '#fff', true);
      const d = snap.val(); printTerm(`\n👤 ${args[0]}\n   Роль: ${d.role}\n   Имя: ${d.displayName}`, '#0f0'); break; }
    case 'listusers': {
      const snap = await db.ref('users').once('value');
      printTerm(`\n📋 Пользователи (${Object.keys(snap.val()||{}).length}):`, '#0f0');
      snap.forEach(c => printTerm(`   ${c.key} (${c.val().role})`, '#0f0')); break; }
    case 'ban': {
      if (!args[0]) return printTerm("Использование: ban <login>", '#fff', true);
      await db.ref('blocked/' + currentUser.login + '/' + args[0]).set(true); printTerm(`🚫 ${args[0]} забанен`, '#f00'); break; }
    case 'unban': {
      if (!args[0]) return printTerm("Использование: unban <login>", '#fff', true);
      await db.ref('blocked/' + currentUser.login + '/' + args[0]).remove(); printTerm(`✅ ${args[0]} разбанен`, '#0f0'); break; }
    case 'kick': {
      if (!args[0]) return printTerm("Использование: kick <login>", '#fff', true);
      await db.ref('chats/' + currentChatId + '/participants/' + args[0]).remove(); printTerm(`👢 ${args[0]} выгнан`, '#f00'); break; }
    case 'mute': {
      if (!args[0]) return printTerm("Использование: mute <login>", '#fff', true);
      await db.ref('muted/' + args[0]).set(true); printTerm(`🔇 ${args[0]} замучен`, '#f00'); break; }
    case 'unmute': {
      if (!args[0]) return printTerm("Использование: unmute <login>", '#fff', true);
      await db.ref('muted/' + args[0]).remove(); printTerm(`🔊 ${args[0]} размучен`, '#0f0'); break; }

    case 'chatdel': {
      if (!args[0]) return printTerm("Использование: chatdel <chatId>", '#fff', true);
      await db.ref('chats/' + args[0]).remove(); await db.ref('messages/' + args[0]).remove(); printTerm(`🗑️ Чат удалён`, '#f00'); break; }
    case 'chatadd': {
      if (args.length < 2) return printTerm("Использование: chatadd <name> <user1,user2>", '#fff', true);
      const users = {}; args[1].split(',').forEach(u => users[u]=true); users[currentUser.login]=true;
      const ref = await db.ref('chats').push(); await ref.set({ name: args[0], created: Date.now(), participants: users });
      printTerm(`✅ Чат создан: ${ref.key}`, '#0f0'); break; }
    case 'chatinfo': {
      if (!args[0]) return printTerm("Использование: chatinfo <chatId>", '#fff', true);
      const snap = await db.ref('chats/' + args[0]).once('value');
      if (!snap.exists()) return printTerm("Не найден", '#fff', true);
      const d = snap.val(); printTerm(`\n📄 ${d.name}\n   ID: ${args[0]}\n   Участников: ${Object.keys(d.participants||{}).length}`, '#0f0'); break; }
    case 'listchats': {
      const snap = await db.ref('chats').once('value');
      printTerm(`\n📋 Чаты (${Object.keys(snap.val()||{}).length}):`, '#0f0');
      snap.forEach(c => printTerm(`   ${c.key}: ${c.val().name}`, '#0f0')); break; }
    case 'cd': {
      if (!args[0]) return printTerm("Использование: cd <chatId>", '#fff', true);
      currentChatId = args[0]; loadMessages(currentChatId); printTerm(`📂 В чате ${currentChatId}`, '#0f0'); break; }
    case 'ccd': {
      if (args.length < 2) return printTerm("Использование: ccd <name> <user>", '#fff', true);
      const ref = await db.ref('chats').push();
      await ref.set({ name: args[0], created: Date.now(), participants: { [currentUser.login]: true, [args[1]]: true } });
      printTerm(`✅ Приватный чат создан`, '#0f0'); break; }

    case 'say': {
      if (!args[0]) return printTerm("Использование: say <msg>", '#fff', true);
      let target = currentUser.login, msg = args.join(' ');
      if (args[0].startsWith('[') && args[0].endsWith(']')) { target = args[0].slice(1,-1); msg = args.slice(1).join(' '); }
      const lines = msg.match(/.{1,20}/g) || [];
      await db.ref('messages/' + currentChatId).push({ author: target, text: encrypt(lines.join('\n')), timestamp: Date.now(), type: 'text', role: currentUser.role });
      printTerm(`📤 Отправлено от ${target}`, '#0f0'); break; }
    case 'broadcast': {
      if (!args[0]) return printTerm("Использование: broadcast <msg>", '#fff', true);
      const chats = await db.ref('chats').once('value'); let count = 0;
      chats.forEach(c => { db.ref('messages/' + c.key).push({ author: `[BROADCAST] ${currentUser.login}`, text: encrypt(args.join(' ')), timestamp: Date.now(), type: 'text' }); count++; });
      printTerm(`📡 Отправлено в ${count} чатов`, '#0f0'); break; }
    case 'msgdel': {
      if (args.length < 2) return printTerm("Использование: msgdel <chatId> <msgId>", '#fff', true);
      await db.ref('messages/' + args[0] + '/' + args[1]).remove(); printTerm(`🗑️ Удалено`, '#0f0'); break; }
    case 'purge': {
      if (!confirm('🗑️ Очистить чат?')) return;
      await db.ref('messages/' + currentChatId).remove(); printTerm('💥 Чат очищен', '#0f0'); break; }
    case 'nuke': {
      if (!confirm('⚠️ УДАЛИТЬ ВСЁ?')) return;
      await db.ref('messages').remove(); printTerm('💥 ВСЁ УНИЧТОЖЕНО', '#f00'); break; }

    case 'grant': {
      if (args.length < 2) return printTerm("Использование: grant <user> <perm>", '#fff', true);
      await db.ref('permissions/' + args[0] + '/' + args[1]).set(true); printTerm(`✅ Разрешение выдано`, '#0f0'); break; }
    case 'revoke': {
      if (args.length < 2) return printTerm("Использование: revoke <user> <perm>", '#fff', true);
      await db.ref('permissions/' + args[0] + '/' + args[1]).remove(); printTerm(`❌ Разрешение отозвано`, '#0f0'); break; }
    case 'spy': {
      if (!args[0]) return printTerm("Использование: spy <user>", '#fff', true);
      printTerm(`👁️ Слежка за ${args[0]}...`, '#0f0');
      db.ref('messages').orderByChild('author').equalTo(args[0]).limitToLast(10).on('child_added', snap => {
        printTerm(`[${snap.val().author}]: ${decrypt(snap.val().text)}`, '#ff0');
      }); break; }
    case 'logs': {
      printTerm("📋 Логи:", '#0f0');
      const snap = await db.ref('logs').limitToLast(10).once('value');
      snap.forEach(c => printTerm(`[${new Date(c.val().time).toLocaleString()}] ${c.val().event}`, '#888')); break; }
    case 'audit': {
      printTerm("🔍 Аудит безопасности...", '#0f0');
      const users = await db.ref('users').once('value');
      let roots = 0, admins = 0;
      users.forEach(u => { if(u.val().role==='root') roots++; if(u.val().role==='admin') admins++; });
      printTerm(`   Всего: ${Object.keys(users.val()||{}).length}\n   Root: ${roots}\n   Admin: ${admins}`, '#0f0'); break; }

    case 'query': {
      if (!args[0]) return printTerm("Использование: query <path>", '#fff', true);
      const snap = await db.ref(args[0]).once('value');
      printTerm(JSON.stringify(snap.val(), null, 2), '#0f0'); break; }
    case 'set': {
      if (args.length < 2) return printTerm("Использование: set <path> <value>", '#fff', true);
      await db.ref(args[0]).set(args.slice(1).join(' ')); printTerm(`✅ Записано`, '#0f0'); break; }
    case 'del': {
      if (!args[0]) return printTerm("Использование: del <path>", '#fff', true);
      await db.ref(args[0]).remove(); printTerm(`🗑️ Удалено`, '#f00'); break; }
    case 'export': {
      printTerm("📦 Экспорт...", '#0f0');
      const data = { users: await db.ref('users').once('value').then(s=>s.val()), chats: await db.ref('chats').once('value').then(s=>s.val()), time: Date.now() };
      printTerm(`Экспортировано ${JSON.stringify(data).length} байт`, '#0f0'); break; }
    case 'wipe': {
      if (!args[0]) return printTerm("Использование: wipe <path>", '#fff', true);
      if (!confirm(`⚠️ ОЧИСТИТЬ ${args[0]}?`)) return;
      await db.ref(args[0]).remove(); printTerm(`💥 Очищено`, '#f00'); break; }
    case 'backup': {
      printTerm("💾 Создание бэкапа...", '#0f0');
      await db.ref('backups/' + Date.now()).set({ users: await db.ref('users').once('value').then(s=>s.val()), messages: await db.ref('messages').once('value').then(s=>s.val()) });
      printTerm(`✅ Бэкап создан`, '#0f0'); break; }
    case 'restore': {
      printTerm("♻️ Восстановление...", '#0f0');
      printTerm("⚠️ Функция в разработке", '#fff', true); break; }

    case 'status': {
      printTerm("\n🖥️ SHPAK OS v4.0", '#0f0');
      printTerm(`   User: ${currentUser.login} (${currentUser.role})`);
      printTerm(`   Chat: ${currentChatId}`);
      printTerm(`   Blocked: ${blockedUsers.length}`, '#0f0'); break; }
    case 'config': {
      if (args.length < 2) return printTerm("Использование: config <key> <val>", '#fff', true);
      await db.ref('config/' + args[0]).set(args.slice(1).join(' ')); printTerm(`✅ Конфиг изменён`, '#0f0'); break; }
    case 'restart': { printTerm("🔄 Перезапуск...", '#0f0'); setTimeout(()=>location.reload(),1000); break; }
    case 'shutdown': {
      if (!confirm('⚠️ ОТКЛЮЧИТЬ ВХОДЫ?')) return;
      await db.ref('system/maintenance').set(true); printTerm("🛑 Система отключена", '#f00'); break; }
    case 'startup': {
      await db.ref('system/maintenance').remove(); printTerm("✅ Система включена", '#0f0'); break; }
    case 'decrypt': { printTerm(decrypt(args.join(' ')), '#0f0'); break; }
    case 'encrypt': { printTerm(encrypt(args.join(' ')), '#0f0'); break; }
    case 'ping': {
      if (!args[0]) return printTerm("Использование: ping <user>", '#fff', true);
      printTerm(`PING ${args[0]}: 64 bytes, time=${Math.floor(Math.random()*100)}ms`, '#0f0'); break; }
    case 'trace': {
      if (!args[0]) return printTerm("Использование: trace <user>", '#fff', true);
      printTerm(`Tracing ${args[0]}... 3 hops found`, '#0f0'); break; }
    case 'ip': {
      if (!args[0]) return printTerm("Использование: ip <user>", '#fff', true);
      printTerm(`${args[0]}: 192.168.0.${Math.floor(Math.random()*255)}`, '#0f0'); break; }
    case 'clear': case 'cls': { document.getElementById('terminal-output').innerHTML = ''; break; }
    case 'exit': case 'logout': { printTerm("👋 Выход...", '#0f0'); setTimeout(()=>logout(),300); break; }

    case 'sudo': { execCmd(args.join(' ')); break; }
    case 'whoami': { printTerm(`${currentUser.login} (uid=0 root)`, '#0f0'); break; }
    case 'ls': { execCmd('listusers'); break; }
    case 'ps': { execCmd('status'); break; }
    case 'rm': { execCmd(`del ${args.join(' ')}`); break; }
    case 'cat': {
      if (!args[0]) return printTerm("Использование: cat <path>", '#fff', true);
      const snap = await db.ref(args[0]).once('value');
      printTerm(JSON.stringify(snap.val()), '#0f0'); break; }
    case 'echo': { printTerm(args.join(' '), '#0f0'); break; }
    case 'date': { printTerm(new Date().toLocaleString(), '#0f0'); break; }
    case 'time': { printTerm(new Date().toLocaleTimeString(), '#0f0'); break; }
    case 'uptime': { printTerm(`Uptime: ${Math.floor(performance.now()/1000)}s`, '#0f0'); break; }
    case 'version': { printTerm("SHPAK OS v4.0 [ROOT ACCESS]", '#0f0'); break; }

    default: printTerm(`bash: ${c}: команда не найдена. Введите 'help'`, '#fff', true);
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('shpak_user');
  const terminal = document.getElementById('terminal-overlay');
  const screen = document.getElementById('auth-screen');
  const box = document.getElementById('auth-box');
  if (terminal) terminal.style.display = 'none';
  if (screen) { screen.style.display = 'flex'; screen.classList.remove('whiteout'); }
  if (box) { box.classList.remove('unfolding'); box.style.display = 'block'; box.style.opacity = '1'; box.style.transform = 'rotate(-2deg)'; }
  const loginInput = document.getElementById('login');
  const passInput = document.getElementById('pass');
  if (loginInput) loginInput.value = '';
  if (passInput) passInput.value = '';
  setTimeout(() => location.reload(), 500);
}

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

