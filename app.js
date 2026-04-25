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

// 🔐 ШИФР ЦЕЗАРЯ (Сдвиг +3 для шифрования, -3 для расшифровки)
function shiftChar(code, base, range, shift) {
    // Нормализуем сдвиг, чтобы он был положительным внутри диапазона
    const normalizedShift = ((shift % range) + range) % range;
    return String.fromCharCode(base + (code - base + normalizedShift) % range);
}

function encrypt(text) {
    if (!text) return "";
    let result = "";
    for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i);
        
        // A-Z (65-90)
        if (code >= 65 && code <= 90) result += shiftChar(code, 65, 26, 3);
        // a-z (97-122)
        else if (code >= 97 && code <= 122) result += shiftChar(code, 97, 26, 3);
        // А-Я (1040-1071)
        else if (code >= 1040 && code <= 1071) result += shiftChar(code, 1040, 32, 3);
        // а-я (1072-1103)
        else if (code >= 1072 && code <= 1103) result += shiftChar(code, 1072, 32, 3);
        // Ё (1025) -> обрабатываем как часть алфавита (сдвиг по кругу 32 символов)
        else if (code === 1025) result += String.fromCharCode(1040 + (0 + 3) % 32); 
        // ё (1105)
        else if (code === 1105) result += String.fromCharCode(1072 + (0 + 3) % 32);
        // 0-9 (48-57)
        else if (code >= 48 && code <= 57) result += shiftChar(code, 48, 10, 3);
        // Остальное без изменений
        else result += text[i];
    }
    return result;
}

function decrypt(text) {
    if (!text) return "";
    let result = "";
    for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i);
        
        // Сдвиг -3 эквивалентен сдвигу +(range-3)
        if (code >= 65 && code <= 90) result += shiftChar(code, 65, 26, -3);
        else if (code >= 97 && code <= 122) result += shiftChar(code, 97, 26, -3);
        else if (code >= 1040 && code <= 1071) result += shiftChar(code, 1040, 32, -3);
        else if (code >= 1072 && code <= 1103) result += shiftChar(code, 1072, 32, -3);
        else if (code === 1025) result += String.fromCharCode(1040 + (0 - 3 + 32) % 32);
        else if (code === 1105) result += String.fromCharCode(1072 + (0 - 3 + 32) % 32);
        else if (code >= 48 && code <= 57) result += shiftChar(code, 48, 10, -3);
        else result += text[i];
    }
    return result;
}

// 🧪 Создание тестовых аккаунтов
async function createTestAccounts() {
    const accounts = [
        { login: 'TEST', pass: '12345' },
        { login: 'TEST2', pass: '54321' }
    ];
    
    for (const acc of accounts) {
        // Пароли в базе храним ЗАШИФРОВАННЫМИ для безопасности (хотя бы символически)
        const encLogin = encrypt(acc.login); 
        const encPass = encrypt(acc.pass);
        
        const snap = await db.ref('users/' + encLogin).once('value');
        if (!snap.exists()) {
            await db.ref('users/' + encLogin).set({
                password: encPass,
                created: Date.now(),
                username: acc.login
            });
            console.log(`✅ Аккаунт создан: ${acc.login}`);
        }
    }
}
createTestAccounts();

// 🎭 UI Элементы
const authScreen = document.getElementById('auth-screen');
const sidebar = document.getElementById('sidebar');
const chatArea = document.getElementById('chat-area');
const loginInput = document.getElementById('login');
const passInput = document.getElementById('pass');
const msgInput = document.getElementById('msg-input');
const messagesDiv = document.getElementById('messages');
const lastMsgText = document.getElementById('last-msg-text');
const lastMsgTime = document.getElementById('last-msg-time');
const emojiPicker = document.getElementById('emoji-picker');

let currentUser = null;

// 🔐 Логика входа
function login() {
    const l = loginInput.value.trim();
    const p = passInput.value.trim();
    if (!l || !p) return alert('Введите логин и пароль');

    const encL = encrypt(l);
    const encP = encrypt(p);

    db.ref('users/' + encL).once('value').then(snap => {
        if (!snap.exists()) return alert('Пользователь не найден. Попробуй TEST / 12345');
        if (snap.val().password === encP) {
            currentUser = l;
            localStorage.setItem('shpak_user', l);
            showChat();
        } else {
            alert('Неверный пароль');
        }
    });
}

document.getElementById('btn-logout').onclick = () => {
    localStorage.removeItem('shpak_user');
    location.reload();
};

// 💬 Отправка
function sendMessage() {
    const text = msgInput.value.trim();
    if (!text || !currentUser) return;
    
    db.ref('messages').push({
        author: currentUser,
        text: encrypt(text), // Шифруем перед отправкой
        timestamp: Date.now(),
        type: 'text'
    });
    msgInput.value = '';
}

// 📎 Фото
function attachFile() { document.getElementById('file-input').click(); }
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        db.ref('messages').push({
            author: currentUser,
            image: e.target.result,
            timestamp: Date.now(),
            type: 'image'
        });
    };
    reader.readAsDataURL(file);
}

// 😊 Эмодзи
function toggleEmojiPicker() {
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
}
function insertEmoji(emoji) {
    msgInput.value += emoji;
    msgInput.focus();
    emojiPicker.style.display = 'none';
}

// Кнопки заглушки
function showSearch() { alert('Поиск в разработке'); }
function showMenu() { alert('Меню в разработке'); }
function toggleMenu() { alert('Список чатов в разработке'); }

// 🎬 Анимация расшифровки
function animateDecrypt(element, encrypted, decrypted, speed = 100) {
    let i = 0;
    element.classList.add('decrypting');
    const interval = setInterval(() => {
        if (i < decrypted.length) {
            // Показываем расшифрованную часть + остаток зашифрованного
            element.textContent = decrypted.substring(0, i + 1) + encrypted.substring(i + 1);
            i++;
        } else {
            element.textContent = decrypted;
            element.classList.remove('decrypting');
            clearInterval(interval);
        }
    }, speed);
}

// 📥 Загрузка чата
function loadChat() {
    messagesDiv.innerHTML = '';
    db.ref('messages').limitToLast(50).on('child_added', snap => {
        const data = snap.val();
        if (!data) return;

        const isMe = data.author === currentUser;
        const time = new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isMe ? 'outgoing' : 'incoming'}`;
        
        let contentHtml = '';
        if (data.type === 'image') {
            contentHtml = `<img src="${data.image}" class="photo-preview">`;
        } else {
            contentHtml = `<div class="message-text"></div>`;
        }

        msgDiv.innerHTML = `
            ${!isMe ? `<div class="message-author">${data.author}</div>` : ''}
            ${contentHtml}
            <div class="message-meta">
                <span class="message-time">${time}</span>
                ${isMe ? '<span class="message-status">✓✓</span>' : ''}
            </div>
        `;
        
        messagesDiv.appendChild(msgDiv);

        // Запуск анимации для текста
        if (data.type === 'text') {
            const textEl = msgDiv.querySelector('.message-text');
            const decText = decrypt(data.text);
            setTimeout(() => animateDecrypt(textEl, data.text, decText, 80), 50);
        }
        
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Обновление превью в сайдбаре
        if (data.type === 'text') {
             lastMsgText.textContent = `${data.author}: ${decrypt(data.text)}`;
             lastMsgTime.textContent = time;
        } else {
             lastMsgText.textContent = `${data.author}: 📷 Фото`;
             lastMsgTime.textContent = time;
        }
    });
}

function showChat() {
    authScreen.style.display = 'none';
    sidebar.style.display = 'flex';
    chatArea.style.display = 'flex';
    document.getElementById('sidebar-user-info').textContent = `👤 ${currentUser}`;
    loadChat();
}

// Авто-вход
if (localStorage.getItem('shpak_user')) {
    currentUser = localStorage.getItem('shpak_user');
    showChat();
}

// Enter в полях
passInput.addEventListener('keypress', e => { if(e.key === 'Enter') login(); });
msgInput.addEventListener('keypress', e => { if(e.key === 'Enter') sendMessage(); });
