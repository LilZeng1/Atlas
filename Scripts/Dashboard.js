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

closePopupBtn.onclick = () => {
    customPopup.classList.remove('popup-visible')
}

async function checkAuth() {
    const token = getToken()
    if (!token) return window.location.href = 'index.html'
    try {
        const res = await fetch(`${BACKEND_URL}/api/user`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data.logged && data.isStaff) {
            loader.style.display = 'none'
            mainContent.style.display = 'block'
        } else {
            window.location.href = 'index.html'
        }
    } catch {
        window.location.href = 'index.html'
    }
}

async function searchMembers() {
    const q = searchInput.value.trim()
    if (!q) return
    const token = getToken()
    searchBtn.innerText = "..."
    searchBtn.disabled = true
    try {
        const res = await fetch(`${BACKEND_URL}/api/guild/search?q=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        resultsContainer.innerHTML = ''
        if (data.error) throw new Error(data.error)
        if (data.length === 0) {
            resultsContainer.innerHTML = '<p class="text-center opacity-30 tracking-widest text-xs py-10 uppercase font-mono">No target found</p>'
            return
        }
        data.forEach(m => {
            if (!m.user) return
            const avatar = m.user.avatar
                ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/0.png`
            const card = document.createElement('div')
            card.className = 'member-card'
            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <img src="${avatar}" class="w-10 h-10 rounded-full border border-white/10 shadow-lg">
                    <div class="flex flex-col">
                        <span class="font-bold tracking-wider text-sm">${m.user.username}</span>
                        <span class="text-[9px] opacity-40 font-mono tracking-widest">ID: ${m.user.id}</span>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="action-btn-danger kick" onclick="executeAction('${m.user.id}', 'kick', '${m.user.username}')">KICK</button>
                    <button class="action-btn-danger ban" onclick="executeAction('${m.user.id}', 'ban', '${m.user.username}')">BAN</button>
                </div>
            `
            resultsContainer.appendChild(card)
        })
    } catch (e) {
        showPopup('Search Error', 'Failed to retrieve database records.')
    } finally {
        searchBtn.innerText = "SEARCH"
        searchBtn.disabled = false
    }
}

async function executeAction(targetId, action, username) {
    const confirmAction = confirm(`WARNING: Are you sure you want to ${action.toUpperCase()} ${username}?`)
    if (!confirmAction) return
    const token = getToken()
    try {
        const res = await fetch(`${BACKEND_URL}/api/guild/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ targetId, action })
        })
        if (res.ok) {
            showPopup('Command Executed', `Target ${username} has been ${action}ned from ATLAS.`)
            searchMembers()
        } else {
            showPopup('Execution Failed', 'Insufficient permissions or hierarchy block.')
        }
    } catch {
        showPopup('System Error', 'Cannot reach command center.')
    }
}

searchBtn.onclick = searchMembers
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMembers()
})

checkAuth()
