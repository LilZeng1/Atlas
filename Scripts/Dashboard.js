const BACKEND_URL = 'https://atlas-5gev.onrender.com'
const loader = document.getElementById('loader')
const mainContent = document.getElementById('mainContent')
const searchInput = document.getElementById('searchInput')
const searchBtn = document.getElementById('searchBtn')
const resultsContainer = document.getElementById('resultsContainer')
const customPopup = document.getElementById('customPopup')
const popupTitle = document.getElementById('popupTitle')
const popupMessage = document.getElementById('popupMessage')
const closePopupBtn = document.getElementById('closePopupBtn')

const getToken = () => localStorage.getItem('atlas_token')

function showPopup(title, message) {
    popupTitle.innerText = title
    popupMessage.innerText = message
    customPopup.classList.add('popup-visible')
}

closePopupBtn.onclick = () => customPopup.classList.remove('popup-visible')

async function checkAuth() {
    const token = getToken()
    if (!token) return window.location.href = 'index.html'

    try {
        const res = await fetch(`${BACKEND_URL}/api/user`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!res.ok) throw new Error('AUTH_FAILED')

        const data = await res.json()
        if (data.logged && data.isStaff) {
            // Success: Remove loader and fade in content
            loader.style.opacity = '0'
            setTimeout(() => {
                loader.style.display = 'none'
                mainContent.classList.remove('opacity-0')
                mainContent.style.opacity = '1'
            }, 700)
        } else {
            window.location.href = 'index.html'
        }
    } catch (err) {
        console.error('Security Breach:', err)
        window.location.href = 'index.html'
    }
}

async function searchMembers() {
    const q = searchInput.value.trim()
    if (!q) return showPopup('ERROR', 'SUBJECT_IDENTIFIER_REQUIRED')

    const token = getToken()
    searchBtn.disabled = true
    searchBtn.innerText = "LINKING..."
    resultsContainer.style.opacity = '0.5'

    try {
        const res = await fetch(`${BACKEND_URL}/api/guild/search?q=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        resultsContainer.innerHTML = ''
        resultsContainer.style.opacity = '1'

        if (data.error) throw new Error()
        if (data.length === 0) {
            resultsContainer.innerHTML = `
                <div class="py-20 text-center opacity-20">
                    <p class="text-[10px] tracking-[0.8em] font-black uppercase">ZERO_RESULTS_FOUND_IN_MAINFRAME</p>
                </div>`
            return
        }

        data.forEach((m, index) => {
            const avatar = m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`
            const div = document.createElement('div')
            div.className = 'member-card'
            div.style.animation = `heroFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`
            div.style.animationDelay = `${index * 0.1}s`
            div.innerHTML = `
                <div class="flex items-center gap-5 flex-1">
                    <div class="relative">
                        <img src="${avatar}" class="w-12 h-12 rounded-2xl border border-white/10 shadow-2xl relative z-10">
                        <div class="absolute inset-0 bg-red-600/20 blur-xl rounded-full"></div>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-sm font-black tracking-widest text-white uppercase">${m.user.username}</span>
                        <span class="text-[9px] font-mono text-white/20 tracking-tighter mt-1">UUID: ${m.user.id}</span>
                    </div>
                </div>
                <div class="action-group">
                    <button class="btn-act btn-kick" onclick="executeAction('${m.user.id}', 'kick', '${m.user.username}')">Terminate Session</button>
                    <button class="btn-act btn-ban" onclick="executeAction('${m.user.id}', 'ban', '${m.user.username}')">Banish User</button>
                </div>`
            resultsContainer.appendChild(div)
        })
    } catch {
        showPopup('SYSTEM_ERROR', 'Neural link disconnected from database.')
    } finally {
        searchBtn.disabled = false
        searchBtn.innerText = "EXECUTE"
    }
}

async function executeAction(targetId, action, username) {
    if (!confirm(`CONFIRM PROTOCOL: ${action.toUpperCase()} ${username}?`)) return

    const token = getToken()
    try {
        const res = await fetch(`${BACKEND_URL}/api/guild/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ targetId, action })
        })

        if (res.ok) {
            showPopup('PROTOCOL_COMPLETE', `${username} has been purged from the systems.`)
            searchMembers()
        } else {
            showPopup('ACCESS_DENIED', 'Target hierarchy is superior or clearance level insufficient.')
        }
    } catch {
        showPopup('SIGNAL_LOST', 'Command transmission failed mid-stream.')
    }
}

// Global Events
searchBtn.onclick = searchMembers
searchInput.onkeypress = (e) => e.key === 'Enter' && searchMembers()

// Bootstrap
document.addEventListener('DOMContentLoaded', checkAuth)
