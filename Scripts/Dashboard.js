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
    searchBtn.disabled = true
    searchBtn.innerText = "QUERYING..."

    try {
        const res = await fetch(`${BACKEND_URL}/api/guild/search?q=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        resultsContainer.innerHTML = ''

        if (data.error) throw new Error()
        if (data.length === 0) {
            resultsContainer.innerHTML = '<div class="py-20 text-center opacity-20 text-[10px] tracking-[0.5em]">ZERO_RESULTS_FOUND</div>'
            return
        }

        data.forEach(m => {
            const avatar = m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`
            const div = document.createElement('div')
            div.className = 'member-card'
            div.innerHTML = `
                <div class="flex items-center gap-4 flex-1">
                    <img src="${avatar}" class="w-10 h-10 rounded-lg border border-white/10 shadow-xl">
                    <div class="flex flex-col">
                        <span class="text-sm font-bold tracking-tight">${m.user.username}</span>
                        <span class="text-[9px] font-mono opacity-30">${m.user.id}</span>
                    </div>
                </div>
                <div class="action-group">
                    <button class="btn-act btn-kick" onclick="executeAction('${m.user.id}', 'kick', '${m.user.username}')">Kick</button>
                    <button class="btn-act btn-ban" onclick="executeAction('${m.user.id}', 'ban', '${m.user.username}')">Ban</button>
                </div>
            `
            resultsContainer.appendChild(div)
        })
    } catch {
        showPopup('System Error', 'Database connection interrupted.')
    } finally {
        searchBtn.disabled = false
        searchBtn.innerText = "Execute Search"
    }
}

async function executeAction(targetId, action, username) {
    if (!confirm(`Confirm Protocol: ${action.toUpperCase()} user ${username}?`)) return
    const token = getToken()
    try {
        const res = await fetch(`${BACKEND_URL}/api/guild/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ targetId, action })
        })
        if (res.ok) {
            showPopup('Success', `Operation completed: ${username} has been ${action}ed.`)
            searchMembers()
        } else {
            showPopup('Denied', 'Hierarchy block or insufficient clearance.')
        }
    } catch {
        showPopup('Error', 'Command signal lost.')
    }
}

searchBtn.onclick = searchMembers
searchInput.onkeypress = (e) => e.key === 'Enter' && searchMembers()
checkAuth()
