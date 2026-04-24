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

// 🔐 Шифр Цезаря
function caesarDoubleEncrypt(text, s1 = 1, s2 = 2) {
  if (!text) return "";
  const totalShift = s1 + s2;
  let result = "";
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    if (code >= 65 && code <= 90) {
      result += String.fromCharCode(((code - 65 + totalShift) % 26) + 65);
    } else if (code >= 97 && code <= 122) {
      result += String.fromCharCode(((code - 97 + totalShift) % 26) + 97);
    } else if (code >= 1040 && code <= 1071) {
      result += String.fromCharCode(((code - 1040 + totalShift) % 32) + 1040);
    } else if (code >= 1072 && code <= 1103) {
      result += String.fromCharCode(((code - 1072 + totalShift) % 32) + 1072);
    } else if (code === 1025) {
      result += String.fromCharCode(((0 + totalShift) % 32) + 1040);
    } else if (code === 1105) {
      result += String.fromCharCode(((0 + totalShift) % 32) + 1072);
    } else if (code >= 48 && code <= 57) {
      result += String.fromCharCode(((code - 48 + totalShift) % 10) + 48);
    } else {
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

// 🧪 Тестовый аккаунт
function createTestAccount() {
  const testLogin = 'TEST';
  const testPass = '12345';
  const encLogin = caesarDoubleEncrypt(testLogin);
  const encPass = caesarDoubleEncrypt(testPass);
  
  db.ref('users/' + encLogin).once('value').then(snap => {
    if (!snap.exists()) {
      db.ref('users/' + encLogin).set({
        password: encPass,
        created: Date.now(),
        isDirector: false,
        isTest: true
      });
    }
  });
}

createTestAccount();

// 🎭 Элементы
const authScreen = document.getElementById('auth-screen');
const loginInput = document.getElementById('login');
const passInput = document.getElementById('pass');
const msgInput = document.getElementById('msg-input');
const messagesDiv = document.getElementById('messages');
const sidebar = document.getElementById('sidebar');
const chatArea = document.getElementById('chat-area');

let currentUser = null;

// 🔐 Вход
document.getElementById('btn-enter').onclick = () => {
  const login = loginInput.value.trim();
  const pass = passInput.value.trim();
  if (!login || !pass) return alert('Заполни логин и пароль!');
  
  const encLogin = caesarDoubleEncrypt(login);
  const encPass = caesarDoubleEncrypt(pass);
  
  db.ref('users/' + encLogin).once('value').then(snap => {
    if (!snap.exists()) return alert('❌ Пользователь не найден');
    if (snap.val().password === encPass) {
      currentUser = login;
      localStorage.setItem('shpak_user', login);
      showChat();
    } else {
      alert('❌ Неверный пароль');
    }
  });
};

// 🚪 Выход
document.getElementById('btn-logout').onclick = () => {
  localStorage.removeItem('shpak_user');
  location.reload();
};

// 💬 Отправка
document.getElementById('btn-send').onclick = sendMessage;
msgInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !currentUser) return;
  
  const encText = caesarDoubleEncrypt(text);
  db.ref('messages').push({
    author: currentUser,
    text: encText,
    timestamp: Date.now(),
    isDirector: currentUser.toLowerCase() === 'ваня'
  });
  msgInput.value = '';
}

// 📥 Загрузка чата
function loadChat() {
  messagesDiv.innerHTML = '';
  db.ref('messages').limitToLast(100).on('child_added', snap => {
    const data = snap.val();
    if (!data || !data.text) return;
    
    const decText = caesarDoubleDecrypt(data.text);
    const author = data.author || "Аноним";
    const time = new Date(data.timestamp).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});
    const isOutgoing = author === currentUser;
    const isDirector = data.isDirector;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'} ${isDirector ? 'director' : ''}`;
    
    let html = '';
    if (!isOutgoing) {
      html += `<div class="message-author">${author}</div>`;
    }
    html += `<div class="message-text">${decText}</div>`;
    html += `<div class="message-time">${time}</div>`;
    
    msgDiv.innerHTML = html;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
