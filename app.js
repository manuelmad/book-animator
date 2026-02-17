// Configure pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const animateBtn = document.getElementById('animate-btn');
const resetBtn = document.getElementById('reset-btn');
const viewer = document.getElementById('viewer');
const bookContainer = document.getElementById('book-container');

const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

let pdfDoc = null;
let isAnimating = false;

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--vellum)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--mahogany)';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
});

animateBtn.addEventListener('click', startAnimation);
resetBtn.addEventListener('click', resetApp);

async function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
}

async function handleFile(file) {
    if (file.type !== 'application/pdf') {
        alert('Por ahora solo soportamos archivos PDF. ¡Pronto más formatos!');
        return;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;

        dropZone.style.display = 'none';
        viewer.style.display = 'flex';
        progressContainer.style.display = 'block';

        // Ensure buttons are in correct state
        animateBtn.disabled = true;
        resetBtn.style.display = 'inline-block';

        await renderBook();

        // Only enable after loop finishes
        animateBtn.disabled = false;
        progressContainer.style.display = 'none'; // Optional: hide when done
    } catch (error) {
        console.error('Error cargando PDF:', error);
        alert('Hubo un error al leer el archivo.');
        resetApp();
    }
}

async function renderBook() {
    bookContainer.innerHTML = '';
    const numPages = pdfDoc.numPages;

    // Target dimensions from CSS (.book)
    const targetWidth = 400;
    const targetHeight = 550;

    // We process pages in pairs (front and back for each sheet)
    const totalSheets = Math.ceil(numPages / 2);

    for (let i = 0; i < totalSheets; i++) {
        const sheetIndex = i;
        const frontPageIndex = i * 2 + 1;
        const backPageIndex = i * 2 + 2;

        // Update Progress
        const percent = Math.round((i / totalSheets) * 100);
        progressFill.style.width = `${percent}%`;
        progressText.innerText = `Procesando hojas: ${percent}% (${i + 1}/${totalSheets})`;

        const sheetDiv = document.createElement('div');
        sheetDiv.className = 'page';
        sheetDiv.style.zIndex = totalSheets - i;

        // Create Front Face
        const frontFace = document.createElement('div');
        frontFace.className = 'page-front';
        const frontContent = await renderPageToCanvas(frontPageIndex, targetWidth, targetHeight);
        frontFace.appendChild(frontContent);
        sheetDiv.appendChild(frontFace);

        // Create Back Face
        const backFace = document.createElement('div');
        backFace.className = 'page-back';
        if (backPageIndex <= numPages) {
            const backContent = await renderPageToCanvas(backPageIndex, targetWidth, targetHeight);
            backFace.appendChild(backContent);
        } else {
            // Blank page if it's an odd number of pages
            const blank = document.createElement('div');
            blank.className = 'page-content';
            blank.style.background = 'white';
            backFace.appendChild(blank);
        }
        sheetDiv.appendChild(backFace);

        bookContainer.appendChild(sheetDiv);

        if (i % 3 === 0) await new Promise(r => setTimeout(r, 10));
    }

    progressFill.style.width = '100%';
    progressText.innerText = `¡Procesado completo! (${totalSheets} hojas)`;
}

async function renderPageToCanvas(pageIndex, targetWidth, targetHeight) {
    const page = await pdfDoc.getPage(pageIndex);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scaleX = targetWidth / unscaledViewport.width;
    const scaleY = targetHeight / unscaledViewport.height;
    const viewport = page.getViewport({ scale: Math.max(scaleX, scaleY) * 2 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'page-content';
    contentDiv.appendChild(canvas);
    return contentDiv;
}

async function startAnimation() {
    if (isAnimating) return;
    isAnimating = true;
    animateBtn.disabled = true;

    const sheets = document.querySelectorAll('.page');
    let currentSheet = 0;

    const interval = setInterval(() => {
        if (currentSheet < sheets.length) {
            const sheet = sheets[currentSheet];
            sheet.classList.add('flipped');

            // Adjust z-index after flip to ensure correct stacking
            setTimeout(() => {
                sheet.style.zIndex = currentSheet;
            }, 750);

            currentSheet++;
        } else {
            clearInterval(interval);
            isAnimating = false;
        }
    }, 2000);
}


function resetApp() {
    pdfDoc = null;
    isAnimating = false;
    dropZone.style.display = 'block';
    viewer.style.display = 'none';
    progressContainer.style.display = 'none';
    progressFill.style.width = '0%';
    animateBtn.disabled = true;
    resetBtn.style.display = 'none';
    bookContainer.innerHTML = '';
}


