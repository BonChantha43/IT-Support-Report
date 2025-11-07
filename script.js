// URLs នៃ CSV files របស់អ្នក
const dbkSheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQX5IErGt-WAufmBbFY8qT03CLrwqIaQZqznDC4gx47v4UEl3cnpy1rPsd1mJvC8ZGTwwsNW916FKh1/pub?gid=0&single=true&output=csv';
const ilistSheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRny6z0kXP2O7d1Yl4tUk0m9J-vo-Ebw72MZIm5Nq2veCqFu18F-0Wgj06XeKyhABjbG1jQmWyQd-Sa/pub?gid=1542294647&single=true&output=csv';

// ធាតុ DOM
const tableBody = document.getElementById('table-body');
const cardContainer = document.getElementById('card-view-container');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('searchInput');
const dateDropdown = document.getElementById('dateDropdown');
const noResultsDiv = document.getElementById('no-results');

// ### UPDATE ថ្មី៖ សម្រាប់ Swiper ###
const swiperWrapper = document.querySelector('#card-view-container .swiper-wrapper');
let cardSwiper = null; // ទុក Swiper instance

let combinedData = []; // ទុកទិន្នន័យដែលបានបូកសរុបទាំងអស់

// Function សម្រាប់ទាញ និងបំប្លែង CSV ទៅជា Array
async function fetchCSV(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const text = await response.text();
        return text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
    } catch (error) {
        console.error('Error fetching data:', error);
        loader.style.display = 'none';
        noResultsDiv.textContent = 'បរាជ័យក្នុងការទាញទិន្នន័យ។';
        noResultsDiv.style.display = 'block';
        return [];
    }
}

// Function សម្រាប់យកកាលបរិច្ឆេទថ្ងៃនេះ ជាទម្រង់ DD-MM-YY
function getTodayDateString() {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0'); 
    const y = String(today.getFullYear()).slice(-2); 
    return `${d}-${m}-${y}`; // ឧទាហរណ៍: 07-11-25
}

// Function សម្រាប់បង្កើតជម្រើសក្នុង Dropdown
function populateDateDropdown(dates) {
    dateDropdown.innerHTML = ''; 

    const allOption = document.createElement('option');
    allOption.value = "all";
    allOption.textContent = "បង្ហាញទិន្នន័យទាំងអស់ (All Dates)";
    dateDropdown.appendChild(allOption);

    const today = getTodayDateString();
    const todayOption = document.createElement('option');
    todayOption.value = today;
    todayOption.textContent = `ថ្ងៃនេះ (${today})`;
    dateDropdown.appendChild(todayOption);

    dates.forEach(date => {
        if (date !== today && date.trim() !== "") {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            dateDropdown.appendChild(option);
        }
    });
}

// Function សម្រាប់ដំណើរការ និងបញ្ចូលទិន្នន័យ
async function init() {
    loader.style.display = 'block';
    tableBody.innerHTML = '';
    swiperWrapper.innerHTML = ''; // ### UPDATE: សម្អាត Swiper Wrapper
    noResultsDiv.style.display = 'none';
    noResultsDiv.textContent = 'មិនមានទិន្នន័យត្រូវគ្នានឹងការស្វែងរកទេ។'; // Reset error message

    const [dbkData, ilistData] = await Promise.all([
        fetchCSV(dbkSheetURL),
        fetchCSV(ilistSheetURL)
    ]);

    if (dbkData.length === 0 || ilistData.length === 0) {
        loader.style.display = 'none';
        return; // បញ្ឈប់ប្រសិនបើទាញទិន្នន័យបរាជ័យ
    }

    const allDates = new Set();
    const dbkRowsForDates = dbkData.slice(1);
    dbkRowsForDates.forEach(row => {
        if (row.length > 5 && row[5]) { 
            allDates.add(row[5]);
        }
    });
    
    const sortedDates = [...allDates].sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('-').map(Number);
        const [dayB, monthB, yearB] = b.split('-').map(Number);
        const dateA = new Date(2000 + yearA, monthA - 1, dayA);
        const dateB = new Date(2000 + yearB, monthB - 1, dayB);
        return dateB - dateA;
    });

    const itSupportMap = new Map();
    const ilistRows = ilistData.slice(8); 
    ilistRows.forEach(row => {
        if (row.length > 11) {
            const id = row[4];
            const department = row[6];
            const name = row[11];
            if (department === 'IT Support' && id) {
                itSupportMap.set(id, name);
            }
        }
    });

    combinedData = [];
    const dbkRows = dbkData.slice(1);
    dbkRows.forEach(row => {
        if (row.length > 5) {
            const id = row[0];
            if (itSupportMap.has(id)) {
                combinedData.push({
                    name: itSupportMap.get(id),
                    id: id,
                    checkIn: row[1],
                    checkOut: row[2],
                    scanDate: row[5]
                });
            }
        }
    });

    populateDateDropdown(sortedDates);
    
    const todayString = getTodayDateString();
    if (allDates.has(todayString)) {
        dateDropdown.value = todayString;
    } else {
        if (sortedDates.length > 0) {
             dateDropdown.value = sortedDates[0];
        } else {
             dateDropdown.value = "all";
        }
    }
    
    loader.style.display = 'none'; 
    applyFilters(); // បង្ហាញទិន្នន័យដំបូង
}

// ### UPDATE ធំ: កែប្រែ Function នេះទាំងស្រុង ###
// Function សម្រាប់បង្ហាញទិន្នន័យ (ទាំង Table និង Card Swiper)
function renderData(data) {
    // 1. សម្អាតទិន្នន័យចាស់
    tableBody.innerHTML = ''; 
    swiperWrapper.innerHTML = '';
    
    // 2. បំផ្លាញ Swiper instance ចាស់ (បើមាន)
    if (cardSwiper) {
        cardSwiper.destroy(true, true);
        cardSwiper = null;
    }

    // 3. ពិនិត្យមើលបើគ្មានទិន្នន័យ
    if (data.length === 0) {
        noResultsDiv.style.display = 'block';
        return;
    }
    noResultsDiv.style.display = 'none';

    // 4. ចាប់ផ្ដើមបង្កើត Slides (១ Slide សម្រាប់ ៦ Card)
    const itemsPerSlide = 6;
    let currentSlide = null;

    data.forEach((item, i) => {
        
        // --- ក. បង្កើតជួរតារាង (សម្រាប់ Desktop) ---
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${item.name}</td>
            <td>${item.id}</td>
            <td>${item.checkIn}</td>
            <td>${item.checkOut}</td>
            <td>${item.scanDate}</td>
        `;
        tableBody.appendChild(row);

        // --- ខ. បង្កើត Card សម្រាប់ Swiper (សម្រាប់ Mobile) ---
        
        // បង្កើត Slide ថ្មីរាល់ពេលចាប់ផ្ដើម (i=0) ឬ ពេលគ្រប់ ៦ (i % 6 === 0)
        if (i % itemsPerSlide === 0) {
            currentSlide = document.createElement('div');
            currentSlide.className = 'swiper-slide';
            swiperWrapper.appendChild(currentSlide);
        }

        // បង្កើត Card
        const card = document.createElement('div');
        card.className = 'data-card'; // សម្រាប់ CSS
        card.innerHTML = `
            <div class="card-header">
                <span class="card-name">${i + 1}. ${item.name}</span>
                <span class="card-id">ID: ${item.id}</span>
            </div>
            <div class="card-body">
                <p><strong>ស្កេនចូល:</strong> <span>${item.checkIn || 'N/A'}</span></p>
                <p><strong>ស្កេនចេញ:</strong> <span>${item.checkOut || 'N/A'}</span></p>
                <p><strong>កាលបរិច្ឆេទ:</strong> <span>${item.scanDate}</span></p>
            </div>
        `;
        
        // បញ្ចូល Card ទៅក្នុង Slide បច្ចុប្បន្ន
        if (currentSlide) {
            currentSlide.appendChild(card);
        }
    });
    
    // 5. ចាប់ផ្ដើមដំណើរការ Swiper
    cardSwiper = new Swiper('.card-swiper', {
        loop: false, // មិនបាច់វិលជុំទេ
        pagination: {
            el: '.swiper-pagination',
            clickable: true, // ឱ្យចុចលើ Dot បាន
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });
}

// Function: សម្រាប់ត្រងទិន្នន័យ
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedDate = dateDropdown.value;

    let filteredData = combinedData;

    if (selectedDate !== "all") {
        filteredData = filteredData.filter(item => 
            item.scanDate === selectedDate
        );
    }

    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.id.toLowerCase().includes(searchTerm)
        );
    }

    renderData(filteredData); // ហៅ Function ថ្មី
}

// បន្ថែម Event Listeners
searchInput.addEventListener('input', applyFilters);
dateDropdown.addEventListener('change', applyFilters);

// ចាប់ផ្ដើម
init();