
class MealInfoApp {
    constructor() {
        this.apiUrl = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
        this.schoolCode = {
            ATPT_OFCDC_SC_CODE: 'J10',
            SD_SCHUL_CODE: '7530183'
        };
        
        this.init();
    }

    init() {
        const searchBtn = document.getElementById('search-btn');
        const mealDate = document.getElementById('meal-date');
        
        // 오늘 날짜를 기본값으로 설정
        mealDate.value = this.getTodayDate();
        
        searchBtn.addEventListener('click', () => this.searchMealInfo());
        mealDate.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchMealInfo();
        });
        
        // 페이지 로드 시 오늘 급식 정보 자동 조회
        this.searchMealInfo();
    }

    getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDateForAPI(dateString) {
        return dateString.replace(/-/g, '');
    }

    formatDateForDisplay(dateString) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}년 ${month}월 ${day}일`;
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('meal-info').style.display = 'none';
        document.getElementById('error-message').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError() {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('meal-info').style.display = 'none';
    }

    showMealInfo() {
        document.getElementById('meal-info').style.display = 'block';
        document.getElementById('error-message').style.display = 'none';
    }

    async searchMealInfo() {
        const dateInput = document.getElementById('meal-date');
        const selectedDate = dateInput.value;

        if (!selectedDate) {
            alert('날짜를 선택해주세요.');
            return;
        }

        this.showLoading();

        const apiDate = this.formatDateForAPI(selectedDate);
        const url = `${this.apiUrl}?ATPT_OFCDC_SC_CODE=${this.schoolCode.ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${this.schoolCode.SD_SCHUL_CODE}&MLSV_YMD=${apiDate}`;

        try {
            const response = await fetch(url);
            const xmlText = await response.text();
            
            if (!response.ok) {
                throw new Error('API 응답 오류');
            }

            const { meals, nutrition } = this.parseXMLResponse(xmlText);
            this.displayMealInfo(meals, nutrition, apiDate);
            
        } catch (error) {
            console.error('급식 정보 조회 오류:', error);
            this.hideLoading();
            this.showError();
        }
    }

    parseXMLResponse(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const meals = {
            breakfast: [],
            lunch: [],
            dinner: []
        };

        const nutrition = {
            carb: 0,
            protein: 0,
            fat: 0
        };

        const rows = xmlDoc.querySelectorAll('row');
        
        rows.forEach(row => {
            const mealType = row.querySelector('MMEAL_SC_NM')?.textContent;
            const dishName = row.querySelector('DDISH_NM')?.textContent;
            const carbInfo = row.querySelector('CAL_INFO')?.textContent; // 칼로리 정보
            const nutInfo = row.querySelector('NTR_INFO')?.textContent; // 영양 정보
            
            if (dishName) {
                const cleanedDish = dishName
                    .replace(/<br\/>/g, '\n')
                    .replace(/\([^)]*\)/g, '') // 알레르기 정보 제거
                    .split('\n')
                    .map(item => item.trim())
                    .filter(item => item.length > 0);

                switch (mealType) {
                    case '조식':
                        meals.breakfast.push(...cleanedDish);
                        break;
                    case '중식':
                        meals.lunch.push(...cleanedDish);
                        break;
                    case '석식':
                        meals.dinner.push(...cleanedDish);
                        break;
                }
            }

            // 영양 정보 파싱 (NTR_INFO 필드에서 추출)
            if (nutInfo) {
                const nutritionData = nutInfo.split('<br/>');
                nutritionData.forEach(item => {
                    if (item.includes('탄수화물')) {
                        const match = item.match(/(\d+\.?\d*)/);
                        if (match) nutrition.carb += parseFloat(match[1]);
                    } else if (item.includes('단백질')) {
                        const match = item.match(/(\d+\.?\d*)/);
                        if (match) nutrition.protein += parseFloat(match[1]);
                    } else if (item.includes('지방')) {
                        const match = item.match(/(\d+\.?\d*)/);
                        if (match) nutrition.fat += parseFloat(match[1]);
                    }
                });
            }
        });

        return { meals, nutrition };
    }

    displayMealInfo(meals, nutrition, apiDate) {
        this.hideLoading();
        this.showMealInfo();

        const displayDate = this.formatDateForDisplay(apiDate);
        document.getElementById('meal-date-title').textContent = `${displayDate} 급식 정보`;

        const mealTypes = ['breakfast', 'lunch', 'dinner'];
        const mealNames = { breakfast: '조식', lunch: '중식', dinner: '석식' };

        mealTypes.forEach(type => {
            const element = document.getElementById(type);
            const mealItems = meals[type];

            if (mealItems && mealItems.length > 0) {
                const ul = document.createElement('ul');
                mealItems.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    ul.appendChild(li);
                });
                element.innerHTML = '';
                element.appendChild(ul);
            } else {
                element.innerHTML = `${mealNames[type]} 정보가 없습니다.`;
            }
        });

        // 영양 정보 표시
        document.getElementById('carb-info').textContent = nutrition.carb > 0 ? `${nutrition.carb.toFixed(1)}g` : '정보 없음';
        document.getElementById('protein-info').textContent = nutrition.protein > 0 ? `${nutrition.protein.toFixed(1)}g` : '정보 없음';
        document.getElementById('fat-info').textContent = nutrition.fat > 0 ? `${nutrition.fat.toFixed(1)}g` : '정보 없음';
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MealInfoApp();
});
