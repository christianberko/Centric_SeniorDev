// IATA Code Validation
function validateIATACode (iataCode)
{
    return /^[A-Z]{3}$/.test(iataCode);
}

/**
 * Helper function for document.createTextNode()
 * 
 * @param {string} text 
 * @returns {Node} Text node with given text
 */
function $ctn (text)
{
    return document.createTextNode(text);
}

/**
 * Capitalizes all words in a string
 * 
 * @param {String} text 
 * @returns {String}
 */
function capitalizeWords (text) 
{
    return text.toLowerCase()
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join(' ')
    .split('/')
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join('/')
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1));
}

/**
 * Helper function for document.createElement()
 * 
 * @param {string} elementName 
 * @returns {Element} Elemenet of the given name
 */
function $ce (elementName)
{
    return document.createElement(elementName);
}

/** Format Money */
const moneyFormatter = new Intl.NumberFormat('en-us', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

/** SVGs */
function createTrashSVG ()
{
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", 18);
    svg.setAttribute("height", 18);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("class", "lucide lucide-trash-2");

    // Path One
    const pathOne = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathOne.setAttribute("d", "M3 6h18");
    svg.appendChild(pathOne);

    // Path Two
    const pathTwo = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathTwo.setAttribute("d", "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6");
    svg.appendChild(pathTwo);

    // Path Three
    const pathThree = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathThree.setAttribute("d", "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2");
    svg.appendChild(pathThree);

    // Line One
    const lineOne = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lineOne.setAttribute("x1", "10");
    lineOne.setAttribute("x2", "10");
    lineOne.setAttribute("y1", "11");
    lineOne.setAttribute("y2", "17");
    svg.appendChild(lineOne);

    // Line Two
    const lineTwo = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lineTwo.setAttribute("x1", "14");
    lineTwo.setAttribute("x2", "14");
    lineTwo.setAttribute("y1", "11");
    lineTwo.setAttribute("y2", "17");
    svg.appendChild(lineTwo);

    return svg;
}

function createPIPSVG ()
{
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", 24);
    svg.setAttribute("height", 24);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("class", "lucide lucide-picture-in-picture-2");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4");
    svg.appendChild(path);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", 10);
    rect.setAttribute("height", 7);
    rect.setAttribute("x", 12);
    rect.setAttribute("y", 13);
    rect.setAttribute("rx", 2);
    svg.appendChild(rect);

    return svg;
}

function createHazardSVG ()
{
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", 32);
    svg.setAttribute("height", 32);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "orange");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("class", "lucide lucide-triangle-alert");

    const pathOne = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathOne.setAttribute("d", "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3");
    svg.appendChild(pathOne);
    
    const pathTwo = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathTwo.setAttribute("d", "M12 9v4");
    svg.appendChild(pathTwo);

    const pathThree = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathThree.setAttribute("d", "M12 17h.01");
    svg.appendChild(pathThree);

    return svg;
}

function createBanSVG ()
{
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", 60);
    svg.setAttribute("height", 60);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("class", "lucide lucide-ban");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "10");
    svg.appendChild(circle);

    const pathOne = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathOne.setAttribute("d", "m4.9 4.9 14.2 14.2");
    svg.appendChild(pathOne);

    return svg;
}

function fullPageLoader (toggle)
{
    const fullPageLoader = document.getElementById("full-page-loader");

    if (toggle)
    {
        fullPageLoader.style.display = "flex";
        const fullLoader = document.createElement("div");
        fullLoader.className = "fullLoader";
        const loader = document.createElement("div");
        loader.className = "loader";
        fullLoader.appendChild(loader);
        const loaderText = document.createElement("div");
        loaderText.className = "loaderText";
        loaderText.style.color = "white";
        loaderText.textContent = "Loading...";
        fullLoader.appendChild(loaderText);
        fullPageLoader.appendChild(fullLoader);
    }
    else
    {
        if (fullPageLoader.lastElementChild)
        {
            fullPageLoader.style.display = "";
            fullPageLoader.removeChild(fullPageLoader.lastElementChild);
        }
    }
}