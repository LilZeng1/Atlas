// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => { mobileMenu.classList.toggle('hidden') });
let arabicMode = false;
const langToggle = document.getElementById('langToggle');

// Toggle Arabic mode
langToggle.addEventListener('click', () => {
    arabicMode = !arabicMode;
    document.body.dir = arabicMode ? 'rtl' : 'ltr';
    document.body.lang = arabicMode ? 'ar' : 'en';
    document.querySelectorAll('h2,h3,p,button,a,span').forEach(el => {
        if (arabicMode) { el.style.fontFamily = "'Gloock', serif"; } else { el.style.fontFamily = "'Cinzel', serif"; }
    });
});

document.getElementById('loginBtn').addEventListener('click', () => {
    window.location.href = "https://discord.com/oauth2/authorize?client_id=1473775947298902243&response_type=code&redirect_uri=https%3A%2F%2Fatlas-5gev.onrender.com%2Fapi%2Fauth%2Fdiscord%2Fredirect&scope=identify+guilds+guilds.join";
});

document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => { btn.classList.toggle('bg-white'); btn.classList.toggle('text-black'); });
});

// Modal logic
const modal = document.getElementById('modalBackdrop');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');
document.querySelectorAll('.modal-trigger').forEach((card, i) => {
    card.addEventListener('click', () => {
        modalContent.textContent = card.querySelector('p').textContent;
        modal.classList.add('active');
    });
});

closeModal.addEventListener('click', () => { modal.classList.remove('active'); });
const sparkleContainer = document.getElementById('sparkleContainer');
for (let i = 0; i < 100; i++) {
    const s = document.createElement('div');
    s.className = 'absolute w-1.5 h-1.5 bg-white rounded-full animate-sparkle';
    s.style.top = Math.random() * window.innerHeight + 'px';
    s.style.left = Math.random() * window.innerWidth + 'px';
    s.style.setProperty('--rand', Math.random());
    sparkleContainer.appendChild(s);
}
