//grab html elements
const dashboardImg = document.getElementById("dashboard-img")
const previousBtn = document.getElementById("dashboard-results")
const dashboardResult = document.getElementById("previous-results")

previousBtn.addEventListener("click",()=>{
    if (dashboardResult.classList.contains("hide")) {
        dashboardResult.classList.remove("hide");
        dashboardResult.classList.add("show");
    } else {
        dashboardResult.classList.remove("show");
        dashboardResult.classList.add("hide");
    }

    if (dashboardImg.classList.contains("hide")) {
        dashboardImg.classList.remove("hide");
        dashboardImg.classList.add("show");
    } else {
        dashboardImg.classList.remove("show");
        dashboardImg.classList.add("hide");
    } 
})