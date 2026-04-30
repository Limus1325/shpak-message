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
      div.className = `boot-line <LaTex>id_8</LaTex>{lines[i].text}`;
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
  requestNotifPermission();
}

function requestNotifPermission() {
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
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
        div.innerHTML = `<div class="chat-avatar">📄</div><div class="chat-info"><div class="chat-name"><LaTex>id_7</LaTex>{child.key}">...</div></div>`;
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
    if (data.author !== currentUser.login && "Notification" in window && Notification.permission === "granted") {
      const rawText = decrypt(data.text).replace(/\n/g, ' ').trim();
      const preview = rawText.length > 15 ? rawText.substring(0, 15) + '...' : rawText;
      const roleTag = data.role && data.role !== 'user' ? ` (<LaTex>id_6</LaTex>{data.author}<LaTex>id_5</LaTex>{snap.key}`,
        requireInteraction: false,
        silent: false
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  });
}

function renderMessage(data, key, chatId) {
  const container = document.getElementById('messages');
  const isMe = data.author === currentUser.login;
  const time = new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const div = document.createElement('div');
  div.className = `message <LaTex>id_4</LaTex>{chatId}','<LaTex>id_3</LaTex>{key}','<LaTex>id_2</LaTex>{decrypt(data.text).replace(/'/g, "\\'").substring(0,30)}')">↩️</span>`;
  let replyContext = '';
  if (data.replyTo) {
    replyContext = `<div class="reply-context" onclick="scrollToMessage('<LaTex>id_1</LaTex>{data.replyTo.author
