// Simple SPA PDF viewer + index lookup
const START_PDF_URL = 'assets/shuowenjiezizhu-1.pdf';
const INDEX_URL = 'index.json';
// const INDEX_SAMPLES_URL = 'index_samples.json'
var CURRENT_PDF_URL = START_PDF_URL;
const MIN_FILE_NUMBER = 1;
const MAX_FILE_NUMBER = 94;

// pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.js';

const pdfContainer = document.getElementById('pdf-container');
const pageInfo = document.getElementById('page-info');
// const indexPreview = document.getElementById('index-preview');
const charInput = document.getElementById('char-input');
const searchBtn = document.getElementById('search-btn');
const resultBox = document.getElementById('result');
const gotoPageInput = document.getElementById('goto-page-input');
const gotoPageBtn = document.getElementById('goto-page-btn');
const gotoPageResult = document.getElementById('goto-page-result');

let pdfDoc = null;
let indexMap = {};
// let indexSamplesMap = {};
async function loadIndex() {
    try {
        const r = await fetch(INDEX_URL);
        indexMap = await r.json();
        // const index_samples = await fetch(INDEX_SAMPLES_URL);
        // indexSamplesMap = await index_samples.json();
        // indexPreview.textContent = JSON.stringify(indexSamplesMap, null, 2);
    } catch (e) {
        // indexPreview.textContent = '无法加载索引';
        console.error(e);
    }
}

async function loadPdf(file_url) {
    try {
        pdfDoc = await pdfjsLib.getDocument(file_url).promise;
        pageInfo.textContent = `共 ${pdfDoc.numPages} 页`;
        await renderAllPages();
    } catch (e) {
        pageInfo.textContent = '无法加载 PDF';
        console.error(e);
    }
}

async function renderAllPages() {
    pdfContainer.innerHTML = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        const renderContext = {
            canvasContext: context,
            viewport
        };
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'page';
        pageWrapper.id = `page-${i}`;
        pageWrapper.appendChild(canvas);
        pdfContainer.appendChild(pageWrapper);
        await page.render(renderContext).promise;
    }
}

function findPageForChar(ch) {
    if (!ch) return null;
    const val = indexMap[ch];
    if (val === undefined) return null;
    return val;
}

function scrollToPage(pageNum) {
    const el = document.getElementById(`page-${pageNum}`);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
}

function doSearch() {
    const ch = charInput.value.trim();
    if (!ch) {
        resultBox.textContent = '请输入汉字';
        return;
    }
    const page_index_number = findPageForChar(ch);
    if (!page_index_number) {
        resultBox.textContent = `未在索引中找到 “${ch}”`;
        return;
    }
    resultBox.textContent = `找到 ${ch} 在pdf页: ${page_index_number}，影印页码: ${page_index_number - 14}`;
    let target_page = page_index_number % 10
    let file_number = Math.floor(page_index_number / 10);
    file_number = target_page == 0 ? file_number : file_number + 1;
    const target_file = `assets/shuowenjiezizhu-${file_number}.pdf`;
    target_page = target_page == 0 ? 10 : target_page;

    if (target_file != CURRENT_PDF_URL) {
        CURRENT_PDF_URL = target_file;
        loadPdf(CURRENT_PDF_URL).then((_) => {
            const ok = scrollToPage(target_page);
            if (!ok) resultBox.textContent += '（页面未渲染或编号超出范围）';
        });
    }
    const ok = scrollToPage(target_page);
    if (!ok) resultBox.textContent += '（页面未渲染或编号超出范围）';
}

// Insert new entry
const newCharInput = document.getElementById('new-char');
const newPageInput = document.getElementById('new-page');
const insertBtn = document.getElementById('insert-btn');
const insertResult = document.getElementById('insert-result');

async function insertEntry() {
    const chars = newCharInput.value.trim();
    const page = parseInt(newPageInput.value.trim());

    if (!chars) {
        insertResult.textContent = '请输入汉字';
        return;
    }
    if (!page || page < 1) {
        insertResult.textContent = '请输入有效页码';
        return;
    }

    try {
        const r = await fetch('/api/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chars: chars, page })
        });
        const data = await r.json();
        if (data.success) {
            insertResult.textContent = `✓ 已添加 "${chars}" → 页 ${page}`;
            newCharInput.value = '';
            newPageInput.value = '';
            indexMap = data.index;
        } else {
            insertResult.textContent = data.error;
        }
    } catch (e) {
        insertResult.textContent = '保存失败: ' + e.message;
        console.error(e);
    }
}

const prevBtn = document.getElementById('pdf-prev');
const nextBtn = document.getElementById('pdf-next');
prevBtn.disabled = true;
nextBtn.disabled = false;


function getIndexFromCurrentPdfUrl() {
    const m = CURRENT_PDF_URL.match(/shuowenjiezizhu-(\d+)\.pdf(\?.*)?$/);
    return m ? parseInt(m[1], 10) : null;
}

function updateButtons(pdf_idx) {
    const idx = pdf_idx || getIndexFromCurrentPdfUrl();
    if (!idx) {
        prevBtn.disabled = true;
        nextBtn.disabled = true; // guess next
        return;
    }
    prevBtn.disabled = idx <= MIN_FILE_NUMBER;
    nextBtn.disabled = idx >= MAX_FILE_NUMBER;
}

prevBtn.addEventListener('click', () => {
    let idx = getIndexFromCurrentPdfUrl();
    if (idx - 1 >= MIN_FILE_NUMBER && idx - 1 <= MAX_FILE_NUMBER) {
        loadPdf(`assets/shuowenjiezizhu-${idx - 1}.pdf`).then((_) => {
            updateButtons(idx - 1);
            CURRENT_PDF_URL = `assets/shuowenjiezizhu-${idx - 1}.pdf`;
            // scrollToPage(10);
        });
    }
});
nextBtn.addEventListener('click', () => {
    let idx = getIndexFromCurrentPdfUrl();
    if (idx + 1 >= MIN_FILE_NUMBER && idx + 1 <= MAX_FILE_NUMBER) {
        loadPdf(`assets/shuowenjiezizhu-${idx + 1}.pdf`).then((_) => {
            updateButtons(idx + 1);
            CURRENT_PDF_URL = `assets/shuowenjiezizhu-${idx + 1}.pdf`;
        });
    }
});

insertBtn.addEventListener('click', insertEntry);
newCharInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') insertEntry();
});
newPageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') insertEntry();
});

searchBtn.addEventListener('click', doSearch);
charInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
});

function calculateAndScrollToPage(pageNum) {
    if (!pageNum || pageNum < 1 || pageNum > 942) {
        gotoPageResult.textContent = '请输入1到942之间的有效页码';
        return;
    }
    gotoPageResult.textContent = '';
    let cal_page_num = pageNum % 10;
    cal_page_num = cal_page_num == 0 ? 10 : cal_page_num;
    let file_idx = Math.floor((pageNum - 1) / 10) + 1;
    const target_file = `assets/shuowenjiezizhu-${file_idx}.pdf`;
    if (target_file != CURRENT_PDF_URL) {
        loadPdf(target_file).then((_) => {
            updateButtons(file_idx);
            scrollToPage(cal_page_num);
            CURRENT_PDF_URL = target_file;
        });
    } else {
        scrollToPage(cal_page_num);
    }
}

gotoPageBtn.addEventListener('click', () => {
    const pageNum = parseInt(gotoPageInput.value.trim());
    calculateAndScrollToPage(pageNum);
});

gotoPageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const pageNum = parseInt(gotoPageInput.value.trim());
        calculateAndScrollToPage(pageNum);
    }
});

(async function init() {
    await loadIndex();
    await loadPdf(START_PDF_URL);
})();