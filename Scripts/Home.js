document.addEventListener("DOMContentLoaded", function () {

    let lang = "en"
    const toggle = document.getElementById("langToggle")
    const elements = document.querySelectorAll("[data-en]")

    toggle.addEventListener("click", function () {
        lang = lang === "en" ? "ar" : "en"
        document.documentElement.lang = lang
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
        elements.forEach(el => {
            el.textContent = el.getAttribute("data-" + lang)
        })
        toggle.textContent = lang === "en" ? "AR" : "EN"
    })

    const feed = document.getElementById("activityFeed")

    function addActivity(text) {
        const div = document.createElement("div")
        div.className = "activity-item"
        div.textContent = text
        feed.prepend(div)
    }

    addActivity("User joined #philosophy")
    addActivity("Debate started in #islam-discussion")
    addActivity("New blog memory published")
})
