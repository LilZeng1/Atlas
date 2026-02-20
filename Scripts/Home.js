const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const langToggle = document.getElementById('langToggle');
const langToggleMobile = document.getElementById('langToggleMobile');
const loginButtons = document.querySelectorAll('button:textContent(Login)');

hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

let arabicMode = false;
function toggleLanguage() {
    arabicMode = !arabicMode;
    document.body.dir = arabicMode ? 'rtl' : 'ltr';
    document.body.lang = arabicMode ? 'ar' : 'en';
}
langToggle.addEventListener('click', toggleLanguage);
langToggleMobile.addEventListener('click', toggleLanguage);

const loginURL = "https://discord.com/oauth2/authorize?client_id=1473775947298902243&response_type=code&redirect_uri=https%3A%2F%2Fatlas-5gev.onrender.com%2Fapi%2Fauth%2Fdiscord%2Fredirect&scope=identify+guilds+guilds.join";

document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent === "Login") {
        btn.addEventListener('click', () => {
            window.location.href = loginURL;
        });
    }
});

function createSparkles() {
    const count = 80;
    for (let i = 0; i < count; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'absolute w-1 h-1 bg-white rounded-full opacity-70 animate-fade-slow';
        sparkle.style.top = Math.random() * window.innerHeight + 'px';
        sparkle.style.left = Math.random() * window.innerWidth + 'px';
        sparkle.style.animationDuration = (2 + Math.random() * 3) + 's';
        document.body.appendChild(sparkle);
    }
}
createSparkles();

const style = document.createElement('style');
style.innerHTML = `
@keyframes fade-slow {
    0% { opacity: 0; transform: scale(0.5) translateY(0); }
    50% { opacity: 1; transform: scale(1) translateY(-5px); }
    100% { opacity: 0; transform: scale(0.5) translateY(0); }
}
.animate-fade-slow {
    animation: fade-slow 4s infinite;
}`;
document.head.appendChild(style);

document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.classList.toggle('bg-white');
        btn.classList.toggle('text-black');
    });
});
