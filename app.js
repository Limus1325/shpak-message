// 🔥 FIREBASE CONFIG (твои ключи!)
const firebaseConfig = {
  apiKey: "AIzaSyCCTgHTXjKC3Q0x3YRZtR6cikE-p2FoQ_0",
  authDomain: "shpak-message.firebaseapp.com",
  databaseURL: "https://shpak-message-default-rtdb.firebaseio.com",
  projectId: "shpak-message",
  storageBucket: "shpak-message.firebasestorage.app",
  messagingSenderId: "302522413165",
  appId: "1:302522413165:web:cbd2d65395c58289680f64"
};

// Инициализация
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 🔄 ДВОЙНОЙ ШИФР ЦЕЗАРЯ
function caesarDoubleEncrypt(text, s1 = 1, s2 = 2) {
  return text.split('').map(c => {
    if (!c.match(/[a-zA-Zа-яА-ЯёЁ0-9]/)) return c;
    const isUpper = c === c.toUpperCase();
    const isCyrillic = /[а-яё]/i.test(c);
    const base = isCyrillic ? (isUpper ? 1040 : 1072) : (isUpper ? 65 : 97);
    const alphabetSize = isCyrillic ? 33 : 26;
    const code = c.toLowerCase().charCodeAt(0) - (isCyrillic ? 1072 : 97);
    const shifted = (code + s1 + s2) % alphabetSize;
    let result = String.fromCharCode(base + shifted);
    return isUpper ? result.toUpperCase() : result;
  }).join('');
}

function caesarDoubleDecrypt(text, s1 = 1, s2 = 2) {
  return caesarDoubleEncrypt(text, 32 - (s1 + s2), 0); // упрощённый обратный сдвиг
}

// 🎭 ЭЛЕМЕНТЫ
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const loginInput = document.getElementById('login');
const passInput = document.getElementById('pass');
const msgInput = document.getElementById('msg-input');
const messagesDiv = document.getElementById('messages');

let currentUser = null;

// 🔐 ПРОВЕРКА СЕССИИ
function checkSession() {
  const session = localStorage.getItem('shpak_user');
  if (session) {
    currentUser = session;
    authScreen.style.display = 'none';
    chatScreen.style.display = 'block';
    loadChat();
  }
}

// 📝 РЕГИСТРАЦИЯ
document.getElementById('btn-reg').onclick = () => {
  const login = loginInput.value.trim();
  const pass = passInput.value.trim();
  if (!login || !pass) return alert('Заполни логин и пароль!');
  
  const encLogin = caesarDoubleEncrypt(login);
  const encPass = caesarDoubleEncrypt(pass);
  
  db.ref('users/' + encLogin).set({ 
    password: encPass, 
    created: Date.now(),
    isDirector: login.toLowerCase() === 'ваня' // Ваня = директор 🎩
  }).then(() => {
    alert('✅ Аккаунт создан! Теперь войди.');
    loginInput.value = '';
    passInput.value = '';
  }).catch(e => alert('❌ Ошибка: ' + e.message));
};

// 🔑 ВХОД
document.getElementById('btn-enter').onclick = () => {
  const login = loginInput.value.trim();
  const pass = passInput.value.trim();
  const encLogin = caesarDoubleEncrypt(login);
  const encPass = caesarDoubleEncrypt(pass);
  
  db.ref('users/' + encLogin).once('value').then(snap => {
    if (!snap.exists()) return alert('❌ Пользователь не найден');
    if (snap.val().password === encPass) {
      currentUser = login;
      localStorage.setItem('shpak_user', login);
      authScreen.style.display = 'none';
      chatScreen.style.display = 'block';
      loadChat();
    } else {
      alert('❌ Неверный пароль');
    }
  });
};

// 🚪 ВЫХОД
document.getElementById('btn-logout').onclick = () => {
  localStorage.removeItem('shpak_user');
  location.reload();
};

// 💬 ОТПРАВКА СООБЩЕНИЯ
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

// 📥 ЗАГРУЗКА ЧАТА
function loadChat() {
  db.ref('messages').limitToLast(100).on('child_added', snap => {
    const data = snap.val();
    const decText = caesarDoubleDecrypt(data.text);
    const el = document.createElement('div');
    el.className = 'message';
    if (data.isDirector) {
      el.innerHTML = `<strong style="color:#ff6b6b">🎩 ${data.author}:</strong> ${decText}`;
    } else {
      el.innerHTML = `<strong>${data.author}:</strong> ${decText}`;
    }
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// Запуск
checkSession();