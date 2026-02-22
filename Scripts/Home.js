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
const navDashboard = document.getElementById('navDashboard')
const scrollProgress = document.getElementById('scrollProgress')
const backToTopBtn = document.getElementById('backToTop')
const mainHeader = document.getElementById('mainHeader')

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
            if (data.isStaff && navDashboard) navDashboard.classList.remove('hidden')
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
    } catch {
        setupLogin()
    }
}

function setupLogin() {
    localStorage.removeItem('atlas_token')
    loginBtn.classList.remove('hidden')
    userProfile.classList.add('hidden')
    userProfile.classList.remove('flex')
    if (navDashboard) navDashboard.classList.add('hidden')
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
            suggestionsContainer.innerHTML = '<div class="col-span-full flex justify-center py-20"><p class="opacity-20 tracking-[0.6em] font-light text-sm text-center bg-white/5 px-10 py-4 rounded-full border border-white/5">THE NEXUS IS EMPTY</p></div>'
        }
        list.forEach((s, index) => {
            setTimeout(() => {
                renderCard(s)
            }, index * 100)
        })
    } catch { }
}

function renderCard(data) {
    const avatar = data.user.avatar
        ? `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`
    const card = document.createElement('div')
    card.className = 'suggestion-card opacity-0 translate-y-8 transition-all duration-700 ease-out'
    const isLiked = user && data.likes.includes(user.id)
    const isDisliked = user && data.dislikes.includes(user.id)
    card.innerHTML = `
        <div class="flex items-center justify-between gap-4 z-10 relative">
            <div class="flex items-center gap-4 overflow-hidden">
                <img src="${avatar}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 shadow-xl object-cover flex-shrink-0">
                <span class="text-[10px] sm:text-[12px] font-black tracking-[0.2em] opacity-90 uppercase truncate text-white glow-text">${data.user.username}</span>
            </div>
            <span class="text-[8px] sm:text-[10px] opacity-30 font-mono whitespace-nowrap tracking-wider">${new Date(data.timestamp || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <p class="text-white/70 font-light leading-[1.8] text-sm sm:text-base lg:text-lg break-words w-full z-10 relative pl-4 border-l-2 border-white/10 my-2">"${data.text}"</p>
        <div class="flex items-center gap-3 mt-auto z-10 relative pt-4">
            <button class="vote-btn flex-1 justify-center ${isLiked ? 'active-like' : ''}" onclick="vote('${data.id}', 'like')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                <span class="text-[10px] sm:text-[11px] font-black tracking-wider">${data.likes.length}</span>
            </button>
            <button class="vote-btn flex-1 justify-center ${isDisliked ? 'active-dislike' : ''}" onclick="vote('${data.id}', 'dislike')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2"></path></svg>
                <span class="text-[10px] sm:text-[11px] font-black tracking-wider">${data.dislikes.length}</span>
            </button>
        </div>
    `
    suggestionsContainer.appendChild(card)

    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        card.style.setProperty('--mouse-x', `${x}px`)
        card.style.setProperty('--mouse-y', `${y}px`)
    })

    requestAnimationFrame(() => {
        card.classList.remove('opacity-0', 'translate-y-8')
    })
}

async function vote(id, type) {
    if (!user) return showPopup('Action Required', 'Authorization is required to cast your vote.')
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
    } catch {
        showPopup('System Error', 'Neural link disconnected.')
    }
}

submitSuggestion.onclick = async () => {
    if (!user) return showPopup('Access Denied', 'Authentication required to modify the nexus.')
    const text = suggestionInput.value.trim()
    if (text.length < 5) return showPopup('Input Required', 'Provide more data for the suggestion protocol.')
    const token = getToken()
    submitSuggestion.disabled = true
    submitSuggestion.innerHTML = `<span class="relative z-10 tracking-[0.5em] animate-pulse">TRANSMITTING</span>`
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
            showPopup('Success', 'Your transmission has been logged into the mainframes.')
        } else {
            showPopup('Failed', 'Session corrupted. Re-authenticate.')
        }
    } catch {
        showPopup('Error', 'Host unreachable.')
    } finally {
        submitSuggestion.disabled = false
        submitSuggestion.innerHTML = `<span class="relative z-10 group-hover/btn:tracking-[0.5em] transition-all duration-500 whitespace-nowrap">SUBMIT</span><div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover/btn:animate-shimmer"></div>`
    }
}

window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
    const scrolled = (winScroll / height) * 100
    scrollProgress.style.width = scrolled + '%'

    if (winScroll > 100) {
        mainHeader.classList.add('bg-black/80')
        mainHeader.classList.remove('bg-black/40')
        backToTopBtn.classList.add('show')
    } else {
        mainHeader.classList.add('bg-black/40')
        mainHeader.classList.remove('bg-black/80')
        backToTopBtn.classList.remove('show')
    }
})

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
})

const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            if (entry.target.classList.contains('grid')) {
                animateCounters()
            }
            observer.unobserve(entry.target)
        }
    })
}, observerOptions)

document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el))

function animateCounters() {
    const counters = document.querySelectorAll('.stat-counter')
    const finalValues = ['99.9%', '142K', '8.4K']
    counters.forEach((counter, i) => {
        let startTime = null
        const duration = 2000
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)
            if (progress < 1) {
                counter.innerText = Math.floor(Math.random() * 999) + (i === 0 ? '%' : 'K')
                requestAnimationFrame(step)
            } else {
                counter.innerText = finalValues[i]
            }
        }
        requestAnimationFrame(step)
    })
}

window.vote = vote
checkAuth()
loadSuggestions()
