const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const langToggle = document.getElementById('langToggle');
const loginBtn = document.getElementById('loginBtn');
const modal = document.getElementById('modalBackdrop');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');
const suggestionsContainer = document.getElementById('suggestionsContainer');
const suggestionInput = document.getElementById('suggestionInput');
const submitSuggestion = document.getElementById('submitSuggestion');

let arabicMode = false;
let currentUser = JSON.parse(localStorage.getItem('atlas_user')) || null;
const webhookURL = "YOUR_WEBHOOK_URL_HERE";

hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

langToggle.addEventListener('click', () => {
    arabicMode = !arabicMode;
    document.body.dir = arabicMode ? 'rtl' : 'ltr';
    document.body.lang = arabicMode ? 'ar' : 'en';
});

const urlParams = new URLSearchParams(window.location.search);
const tokenParam = urlParams.get('token');
const usernameParam = urlParams.get('username');
const avatarParam = urlParams.get('avatar');

if (usernameParam) {
    currentUser = {
        username: usernameParam,
        avatar: avatarParam || 'https://cdn.discordapp.com/embed/avatars/0.png'
    };
    localStorage.setItem('atlas_user', JSON.stringify(currentUser));
    window.history.replaceState({}, document.title, window.location.pathname);
}

if (currentUser) {
    loginBtn.textContent = currentUser.username.toUpperCase();
}

loginBtn.addEventListener('click', () => {
    if (!currentUser) {
        window.location.href = "https://discord.com/oauth2/authorize?client_id=1473775947298902243&response_type=code&redirect_uri=https%3A%2F%2Fatlas-5gev.onrender.com%2Fapi%2Fauth%2Fdiscord%2Fredirect&scope=identify+guilds+guilds.join";
    } else {
        localStorage.removeItem('atlas_user');
        currentUser = null;
        loginBtn.textContent = "LOGIN";
        window.location.reload();
    }
});

document.querySelectorAll('.modal-trigger').forEach(card => {
    card.addEventListener('click', () => {
        modalContent.textContent = card.querySelector('p').textContent;
        modal.classList.add('active');
    });
});

closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
});

const renderSuggestionCard = (user, text, likes = 0, dislikes = 0) => {
    const card = document.createElement('div');
    card.className = 'border border-white/20 p-6 flex flex-col gap-4 bg-black/40 hover:bg-white/5 transition';
    card.innerHTML = `
        <div class="flex items-center gap-4">
            <img src="${user.avatar}" class="w-12 h-12 rounded-full border border-white/20 object-cover">
            <span class="tracking-widest text-sm font-bold">${user.username.toUpperCase()}</span>
        </div>
        <p class="opacity-80 text-sm leading-relaxed mt-2">${text}</p>
        <div class="flex items-center gap-6 mt-auto pt-6 border-t border-white/10">
            <button class="like-btn flex items-center gap-2 hover:text-white opacity-60 hover:opacity-100 transition">
                <span class="text-xl">👍🏻</span> <span class="text-sm tracking-widest count">${likes}</span>
            </button>
            <button class="dislike-btn flex items-center gap-2 hover:text-white opacity-60 hover:opacity-100 transition">
                <span class="text-xl">👎🏻</span> <span class="text-sm tracking-widest count">${dislikes}</span>
            </button>
        </div>
    `;

    const likeBtn = card.querySelector('.like-btn');
    const dislikeBtn = card.querySelector('.dislike-btn');
    let hasVoted = false;

    likeBtn.addEventListener('click', () => {
        if (!currentUser) return alert('LOGIN REQUIRED TO VOTE');
        if (!hasVoted) {
            const countSpan = likeBtn.querySelector('.count');
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
            likeBtn.classList.add('opacity-100', 'text-white');
            hasVoted = true;
        }
    });

    dislikeBtn.addEventListener('click', () => {
        if (!currentUser) return alert('LOGIN REQUIRED TO VOTE');
        if (!hasVoted) {
            const countSpan = dislikeBtn.querySelector('.count');
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
            dislikeBtn.classList.add('opacity-100', 'text-white');
            hasVoted = true;
        }
    });

    suggestionsContainer.prepend(card);
};

submitSuggestion.addEventListener('click', async () => {
    if (!currentUser) {
        alert('LOGIN REQUIRED TO SUBMIT A SUGGESTION');
        return;
    }

    const text = suggestionInput.value.trim();
    if (!text) return;

    renderSuggestionCard(currentUser, text);
    suggestionInput.value = '';

    try {
        await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: "ATLAS Suggestions",
                avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
                embeds: [{
                    title: "New Server Suggestion",
                    description: text,
                    color: 16777215,
                    author: {
                        name: currentUser.username,
                        icon_url: currentUser.avatar
                    },
                    footer: {
                        text: "Category: 1474168210374000640 | Channel: 1474169182852743230"
                    }
                }]
            })
        });
    } catch (error) {
    }
});
