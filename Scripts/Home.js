const BACKEND_URL = 'https://atlas-5gev.onrender.com';
const loginBtn = document.getElementById('loginBtn');
const loginText = document.getElementById('loginText');
const suggestionInput = document.getElementById('suggestionInput');
const submitSuggestion = document.getElementById('submitSuggestion');
const suggestionsContainer = document.getElementById('suggestionsContainer');
const customPopup = document.getElementById('customPopup');
const popupTitle = document.getElementById('popupTitle');
const popupMessage = document.getElementById('popupMessage');
const closePopupBtn = document.getElementById('closePopupBtn');

let user = null;

function showPopup(title, message) {
    popupTitle.innerText = title;
    popupMessage.innerText = message;
    customPopup.classList.add('popup-visible');
}

closePopupBtn.onclick = () => {
    customPopup.classList.remove('popup-visible');
};

async function checkAuth() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/user`, { credentials: 'include' });
        const data = await res.json();
        if (data.logged) {
            user = data.user;
            loginText.innerText = user.username.toUpperCase();
            loginBtn.onclick = () => window.location.href = `${BACKEND_URL}/auth/logout?returnTo=https://lilzeng1.github.io/Atlas`;
        } else {
            loginBtn.onclick = () => window.location.href = `${BACKEND_URL}/auth/login?returnTo=https://lilzeng1.github.io/Atlas`;
        }
    } catch (e) {
        loginBtn.onclick = () => window.location.href = `${BACKEND_URL}/auth/login?returnTo=https://lilzeng1.github.io/Atlas`;
    }
}

async function loadSuggestions() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/suggestions`, { credentials: 'include' });
        const list = await res.json();
        suggestionsContainer.innerHTML = '';
        list.forEach(s => renderCard(s));
    } catch (e) { }
}

function renderCard(data) {
    const avatar = data.user.avatar
        ? `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`;

    const card = document.createElement('div');
    card.className = 'suggestion-card flex flex-col gap-6';
    card.innerHTML = `
        <div class="flex items-center gap-4">
            <img src="${avatar}" class="w-10 h-10 rounded-full border border-white/10 shadow-lg">
            <span class="text-[11px] font-bold tracking-[0.2em] opacity-90">${data.user.username}</span>
        </div>
        <p class="text-white/80 font-light leading-relaxed">${data.text}</p>
        <div class="flex items-center gap-3 mt-auto">
            <button class="vote-btn" onclick="vote('${data.id}', 'like')">
                <span class="text-sm">👍</span>
                <span class="text-[10px] font-bold">${data.likes.length}</span>
            </button>
            <button class="vote-btn" onclick="vote('${data.id}', 'dislike')">
                <span class="text-sm">👎</span>
                <span class="text-[10px] font-bold">${data.dislikes.length}</span>
            </button>
        </div>
    `;
    suggestionsContainer.appendChild(card);
}

async function vote(id, type) {
    if (!user) return showPopup('Access Denied', 'You need to log in first!');
    await fetch(`${BACKEND_URL}/api/suggestions/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, type })
    });
    loadSuggestions();
}

submitSuggestion.onclick = async () => {
    if (!user) return showPopup('Unauthorized', 'You cannot submit a suggestion without logging in.');
    const text = suggestionInput.value.trim();
    if (text.length < 5) return showPopup('Content Too Short', 'Please provide a more detailed suggestion.');

    const res = await fetch(`${BACKEND_URL}/api/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text })
    });

    if (res.ok) {
        suggestionInput.value = '';
        loadSuggestions();
    }
};

window.vote = vote;
checkAuth();
loadSuggestions();
