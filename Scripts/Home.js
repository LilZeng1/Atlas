const BACKEND_URL = 'https://atlas-5gev.onrender.com'
const loginBtn = document.getElementById('loginBtn')
const userProfile = document.getElementById('userProfile')
const navAvatar = document.getElementById('navAvatar')
const navUsername = document.getElementById('navUsername')
const logoutBtn = document.getElementById('logoutBtn')
const suggestionInput = document.getElementById('suggestionInput')
const submitSuggestion = document.getElementById('submitSuggestion')
const suggestionsContainer = document.getElementById('suggestionsContainer')
const customPopup = document.getElementById('customPopup')
const popupTitle = document.getElementById('popupTitle')
const popupMessage = document.getElementById('popupMessage')
const closePopupBtn = document.getElementById('closePopupBtn')
let user = null
const urlParams = new URLSearchParams(window.location.search)
const urlToken = urlParams.get('token')

if (urlToken) {
    localStorage.setItem('atlas_token', urlToken)
    window.history.replaceState({}, document.title, window.location.pathname)
}

const getToken = () => localStorage.getItem('atlas_token')

function showPopup(title, message) {
    popupTitle.innerText = title
    popupMessage.innerText = message
    customPopup.classList.add('popup-visible')
}

closePopupBtn.onclick = () => {
    customPopup.classList.remove('popup-visible')
}

async function checkAuth() {
    const token = getToken()
    if (!token) return setupLogin()
    try {
        const res = await fetch(`${BACKEND_URL}/api/user`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data.logged) {
            user = data.user
            loginBtn.classList.add('hidden')
            userProfile.classList.remove('hidden')
            userProfile.classList.add('flex')
            navUsername.innerText = user.username
            navAvatar.src = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/0.png`
            logoutBtn.onclick = () => {
                localStorage.removeItem('atlas_token')
                window.location.href = `${BACKEND_URL}/auth/logout?token=${token}&returnTo=${encodeURIComponent(window.location.href)}`
            }
        } else {
            setupLogin()
        }
    } catch (e) {
        setupLogin()
    }
}

function setupLogin() {
    localStorage.removeItem('atlas_token')
    loginBtn.classList.remove('hidden')
    userProfile.classList.add('hidden')
    userProfile.classList.remove('flex')
    loginBtn.onclick = () => {
        window.location.href = `${BACKEND_URL}/auth/login?returnTo=${encodeURIComponent(window.location.href)}`
    }
}

async function loadSuggestions() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/suggestions`)
        const list = await res.json()
        suggestionsContainer.innerHTML = ''
        if (list.length === 0) {
            suggestionsContainer.innerHTML = '<p class="col-span-full text-center opacity-20 py-10 tracking-[0.5em]">NO SUGGESTIONS YET</p>'
        }
        list.forEach(s => renderCard(s))
    } catch (e) { }
}

function renderCard(data) {
    const avatar = data.user.avatar
        ? `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`
    const card = document.createElement('div')
    card.className = 'suggestion-card flex flex-col gap-4 sm:gap-6 break-words'
    const isLiked = user && data.likes.includes(user.id)
    const isDisliked = user && data.dislikes.includes(user.id)
    card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-3 sm:gap-4 overflow-hidden">
                <img src="${avatar}" class="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/10 shadow-lg object-cover flex-shrink-0">
                <span class="text-[9px] sm:text-[11px] font-bold tracking-[0.1em] sm:tracking-[0.2em] opacity-90 uppercase truncate">${data.user.username}</span>
            </div>
            <span class="text-[7px] sm:text-[9px] opacity-20 font-mono whitespace-nowrap">${new Date(data.timestamp || Date.now()).toLocaleDateString()}</span>
        </div>
        <p class="text-white/80 font-light leading-relaxed text-sm sm:text-lg italic break-words w-full">"${data.text}"</p>
        <div class="flex items-center gap-2 sm:gap-3 mt-auto pt-2">
            <button class="vote-btn ${isLiked ? 'active-like' : ''}" onclick="vote('${data.id}', 'like')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sm:w-5 sm:h-5"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                <span class="text-[9px] sm:text-[10px] font-bold">${data.likes.length}</span>
            </button>
            <button class="vote-btn ${isDisliked ? 'active-dislike' : ''}" onclick="vote('${data.id}', 'dislike')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sm:w-5 sm:h-5"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2"></path></svg>
                <span class="text-[9px] sm:text-[10px] font-bold">${data.dislikes.length}</span>
            </button>
        </div>
    `
    suggestionsContainer.appendChild(card)
}

async function vote(id, type) {
    if (!user) return showPopup('Action Required', 'You must log in to Discord to interact with suggestions!')
    const token = getToken()
    try {
        const res = await fetch(`${BACKEND_URL}/api/suggestions/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, type })
        })
        if (res.ok) loadSuggestions()
    } catch (e) {
        showPopup('Error', 'Connection to server failed.')
    }
}

submitSuggestion.onclick = async () => {
    if (!user) return showPopup('Unauthorized', 'Please log in to Discord to submit an idea.')
    const text = suggestionInput.value.trim()
    if (text.length < 5) return showPopup('Content Too Short', 'Please provide a more detailed suggestion.')
    const token = getToken()
    submitSuggestion.disabled = true
    submitSuggestion.innerText = "SENDING..."
    try {
        const res = await fetch(`${BACKEND_URL}/api/suggestions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        })
        if (res.ok) {
            suggestionInput.value = ''
            await loadSuggestions()
            showPopup('Success', 'Your suggestion has been broadcasted to the nexus.')
        } else {
            showPopup('Failed', 'Session might have expired. Please refresh.')
        }
    } catch (e) {
        showPopup('Error', 'Could not reach the server.')
    } finally {
        submitSuggestion.disabled = false
        submitSuggestion.innerText = "SUBMIT SUGGESTION"
    }
}

class Vote {
    constructor(id, type) {
        this.id = id
        this.type = type
    }
    async send() {
        if (!user) return showPopup("Error Detected", "You must be logged in to vote on suggestions.")
        try {
            const token = getToken();
            const res = await fetch(`${BACKEND_URL}/api/suggestions/react`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ id: this.id, type: this.type })
            });
            if (res.ok) {
                await loadSuggestions();
            } else {
                showPopup("Error", "Failed to send your vote. Please try again.")
            }
        } catch (e) {
            showPopup("Error", "Could not connect to the server. Please check your internet connection and try again.")
        }
    }
}

window.vote = vote
checkAuth()
loadSuggestions()
