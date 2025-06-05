// 노피 AI 챗봇 - main.js (새로운 디자인 버전)
// 즉시 window 객체에 등록

console.log('노피 AI 스크립트 실행 시작');

// 노피 AI 메인 객체
window.NofeeAI = {
    // 상태 관리
    state: {
        initialized: false,
        currentStep: 'intro',
        chatContainer: null,
        messagesContainer: null,
        phoneData: [],
        regionData: [],
        filters: {
            priceRange: null,
            carrier: null,
            brand: null
        },
        userData: {
            dataUsage: null,
            preference: null,
            name: '',
            phone: '',
            region: '',
            district: '',
            consent: false
        },
        selectedProduct: null,
        sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        messageHistory: [],
        recommendationScore: {}
    },
    
    // 설정
    config: {
        GITHUB_CDN_URL: 'https://cdn.jsdelivr.net/gh/Jacob-PO/nofee_chat@main/',
        BACKUP_URL: 'https://raw.githubusercontent.com/Jacob-PO/nofee_chat/main/',
        LOCAL_URL: '',
        TYPING_SPEED: 20,
        AI_THINKING_DELAY: 600
    },
    
    // 모델명 매핑
    modelKoMap: {
        'Samsung Galaxy S25 256GB': '갤럭시 S25 256GB',
        'Samsung Galaxy S25 Plus 256GB': '갤럭시 S25 플러스 256GB',
        'Samsung Galaxy S25 Ultra 256GB': '갤럭시 S25 울트라 256GB',
        'Samsung Galaxy S24 FE': '갤럭시 S24 FE',
        'Samsung Galaxy Z Flip6 256GB': '갤럭시 Z 플립6 256GB',
        'Samsung Galaxy Z Fold6 256GB': '갤럭시 Z 폴드6 256GB',
        'Samsung Galaxy A35 128GB': '갤럭시 A35 128GB',
        'Samsung Galaxy A16': '갤럭시 A16',
        'iPhone 16 128GB': '아이폰 16 128GB',
        'iPhone 16 256GB': '아이폰 16 256GB',
        'iPhone 16 Pro 128GB': '아이폰 16 Pro 128GB',
        'iPhone 16 Pro 256GB': '아이폰 16 Pro 256GB',
        'iPhone 16 Pro Max 256GB': '아이폰 16 Pro Max 256GB',
        'iPhone 15 128GB': '아이폰 15 128GB',
        'iPhone 15 Pro 128GB': '아이폰 15 Pro 128GB'
    },
    
    // 초기화
    init: async function() {
        console.log('노피 AI init 함수 호출됨');
        
        if (this.state.initialized) {
            console.log('이미 초기화됨');
            return;
        }
        
        // DOM 요소 찾기
        this.state.chatContainer = document.getElementById('nofeeChat');
        
        if (!this.state.chatContainer) {
            console.error('nofeeChat 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        console.log('채팅 컨테이너 찾음');
        
        try {
            // 데이터 로드
            await this.loadData();
            
            // 로딩 숨기고 인트로 표시
            const loading = document.getElementById('nofeeLoading');
            const intro = document.getElementById('nofeeIntro');
            if (loading) loading.style.display = 'none';
            if (intro) intro.style.display = 'flex';
            
            this.state.initialized = true;
            console.log('노피 AI 초기화 완료');
            
        } catch (error) {
            console.error('초기화 중 오류:', error);
            this.showError('초기화 중 오류가 발생했습니다.');
        }
    },
    
    // 이벤트 리스너 설정
    setupEventListeners: function() {
        // 홈 버튼
        const homeBtn = document.getElementById('nofeeHomeBtn');
        if (homeBtn) {
            homeBtn.onclick = () => this.resetChat();
        }
        
        // 상품보기 버튼
        const phoneBtn = document.getElementById('nofeePhoneBtn');
        if (phoneBtn) {
            phoneBtn.onclick = () => this.showPhoneList();
        }
        
        // AI 상담 시작 버튼
        const startBtn = document.getElementById('nofeeStartBtn');
        if (startBtn) {
            startBtn.onclick = () => this.startConsultation();
        }
    },
    
    // 데이터 로드
    loadData: async function() {
        console.log('데이터 로드 시작');
        
        const sources = [
            this.config.GITHUB_CDN_URL,
            this.config.BACKUP_URL,
            this.config.LOCAL_URL
        ];

        let lastError = null;

        for (const base of sources) {
            if (!base && base !== '') continue;
            try {
                const itemRes = await fetch(base + 'item.json');
                if (!itemRes.ok) throw new Error('item.json load failed');
                const itemData = await itemRes.json();

                const regionRes = await fetch(base + 'regions.json');
                if (!regionRes.ok) throw new Error('regions.json load failed');
                const regionData = await regionRes.json();

                this.state.phoneData = this.transformProducts(itemData);
                this.state.regionData = regionData;

                console.log('데이터 로드 성공 via', base || 'local');
                lastError = null;
                break;
            } catch (err) {
                lastError = err;
                console.warn('데이터 로드 실패', base || 'local', err);
            }
        }

        if (lastError) {
            throw new Error('데이터를 불러올 수 없습니다');
        }
    },
    
    // 상품 데이터 변환
    transformProducts: function(rawData) {
        return rawData.map(item => ({
            ...item,
            model: this.modelKoMap[item.Model] || item.Model,
            storage: item.Storage || '128GB',
            activation: item['Activation Type'] || '신규',
            contract: item['Contract Type'] || '공시',
            carrier: item.Carrier || 'SKT',
            total: item['Total Monthly Payment'] || 0,
            deviceDiscount: item['Monthly Device Fee'] || 0,
            planFee: item['Monthly Plan Fee'] || 0,
            devicePrice: item['Retail Price'] || 0,
            hasExtraDiscount: (item['Monthly Device Fee'] || 0) < 0,
            extraDiscountAmount: Math.abs(Math.min(0, item['Monthly Device Fee'] || 0))
        }));
    },
    
    // 상담 시작
    startConsultation: async function() {
        // 인트로 화면 숨기기
        const intro = document.getElementById('nofeeIntro');
        if (intro) intro.style.display = 'none';
        
        // 메시지 컨테이너 생성
        if (!this.state.messagesContainer) {
            this.state.messagesContainer = document.createElement('div');
            this.state.messagesContainer.className = 'nofee-messages-inner';
            this.state.chatContainer.appendChild(this.state.messagesContainer);
        }
        
        // 인사 메시지
        await this.showGreeting();
    },
    
    // 인사 메시지
    showGreeting: async function() {
        await this.addBotMessage('안녕하세요! 휴대폰 전문 AI 어드바이저입니다 🙌');
        await this.delay(300);
        await this.addBotMessage('몇 가지 질문을 통해 고객님께 딱 맞는 휴대폰을 찾아드릴게요!');
        await this.delay(500);
        this.askDataUsage();
    },
    
    // 데이터 사용량 질문
    askDataUsage: async function() {
        this.state.currentStep = 'dataUsage';
        await this.addBotMessage('먼저 데이터 사용량을 알려주세요. 평소 어떻게 사용하시나요?');
        
        this.showButtons([
            '📺 많이 써요 (무제한 필요)',
            '📱 보통이에요',
            '💬 적게 써요 (SNS 정도)'
        ], (selected) => {
            const usage = selected.includes('많이') ? 'high' : 
                         selected.includes('보통') ? 'medium' : 'low';
            this.state.userData.dataUsage = usage;
            this.handleDataUsage(selected);
        });
    },
    
    // 데이터 사용량 처리
    handleDataUsage: async function(selected) {
        await this.addUserMessage(selected);
        
        let message = '';
        if (selected.includes('많이')) {
            message = '무제한 요금제가 필요하시군요! 마음껏 사용할 수 있는 플랜으로 추천드릴게요 🚀';
        } else if (selected.includes('보통')) {
            message = '적절한 데이터 요금제로 추천드릴게요! 가장 인기 있는 선택이에요 👍';
        } else {
            message = '알뜰한 요금제로 추천드릴게요! 현명한 선택이에요 💰';
        }
        
        await this.addBotMessage(message);
        await this.delay(500);
        this.askPriceRange();
    },
    
    // 가격대 질문
    askPriceRange: async function() {
        this.state.currentStep = 'price';
        await this.addBotMessage('희망하시는 월 납부 금액대를 선택해주세요');
        
        this.showButtons([
            '💵 3~5만원',
            '💵 5~7만원', 
            '💵 7~9만원',
            '💵 9~10만원',
            '💵 10만원 이상'
        ], (selected) => {
            const ranges = {
                '💵 3~5만원': '30000-50000',
                '💵 5~7만원': '50000-70000',
                '💵 7~9만원': '70000-90000',
                '💵 9~10만원': '90000-100000',
                '💵 10만원 이상': '100000-9999999'
            };
            this.state.filters.priceRange = ranges[selected];
            this.handlePrice(selected);
        });
    },
    
    // 가격 선택 처리
    handlePrice: async function(selected) {
        await this.addUserMessage(selected);
        await this.addBotMessage('선호하시는 브랜드가 있으신가요?');
        this.askBrand();
    },
    
    // 브랜드 질문
    askBrand: function() {
        this.state.currentStep = 'brand';
        this.showButtons(['🍎 애플', '🤖 삼성', '🌟 기타'], (selected) => {
            const brand = selected.includes('애플') ? '애플' : 
                         selected.includes('삼성') ? '삼성' : '기타';
            this.state.filters.brand = brand;
            this.handleBrand(selected);
        });
    },
    
    // 브랜드 선택 처리
    handleBrand: async function(selected) {
        await this.addUserMessage(selected);
        await this.addBotMessage('마지막으로, 가장 중요하게 생각하시는 기능은 무엇인가요?');
        this.askPreference();
    },
    
    // 선호도 질문
    askPreference: function() {
        this.state.currentStep = 'preference';
        this.showButtons([
            '📸 카메라 성능',
            '🎮 처리 속도',
            '🔋 배터리 수명',
            '💰 가성비'
        ], (selected) => {
            const pref = selected.includes('카메라') ? 'camera' :
                        selected.includes('처리') ? 'game' :
                        selected.includes('배터리') ? 'battery' : 'price';
            this.state.userData.preference = pref;
            this.handlePreference(selected);
        });
    },
    
    // 선호도 처리
    handlePreference: async function(selected) {
        await this.addUserMessage(selected);
        await this.showAIThinking();
        await this.delay(1200);
        this.hideAIThinking();
        this.showFilteredPhones();
    },
    
    // 필터링된 휴대폰 표시
    showFilteredPhones: async function() {
        let filtered = [...this.state.phoneData];
        
        // 가격 필터
        if (this.state.filters.priceRange) {
            const [min, max] = this.state.filters.priceRange.split('-').map(Number);
            filtered = filtered.filter(p => p.total >= min && p.total <= max);
        }
        
        // 브랜드 필터
        if (this.state.filters.brand !== '기타') {
            filtered = filtered.filter(p => p.Brand === this.state.filters.brand);
        }
        
        // 중복 제거
        const seen = new Set();
        filtered = filtered.filter(p => {
            const key = `${p.model}-${p.carrier}-${p.storage}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        
        // 랭킹
        filtered.sort((a, b) => {
            let scoreA = 100 - (a.total / 1000);
            let scoreB = 100 - (b.total / 1000);
            
            if (a.hasExtraDiscount) scoreA += a.extraDiscountAmount / 500;
            if (b.hasExtraDiscount) scoreB += b.extraDiscountAmount / 500;
            
            return scoreB - scoreA;
        });
        
        const displayPhones = filtered.slice(0, 5);
        
        if (displayPhones.length === 0) {
            await this.addBotMessage('조건에 맞는 상품이 없어요 😢 다른 조건으로 다시 찾아볼까요?');
            this.showButtons(['🔄 다시 검색하기'], () => this.resetChat());
            return;
        }
        
        await this.addBotMessage('고객님께 추천드리는 상품입니다! ✨');
        
        // 전역 변수 저장
        window.NofeeDisplayedPhones = displayPhones;
        
        // 상품 카드 HTML
        const cards = displayPhones.map((phone, index) => `
            <div class="nofee-product-card" onclick="window.NofeeAI.selectPhone(${index})">
                <h4 class="nofee-product-title">${phone.model}</h4>
                <p class="nofee-product-details">${phone.activation} · ${phone.carrier} · ${phone.contract}</p>
                <p class="nofee-product-price">월 ${this.formatPrice(phone.total)}원</p>
                ${phone.hasExtraDiscount ? `<p class="nofee-product-discount">🎉 ${this.formatPrice(phone.extraDiscountAmount)}원 추가 할인!</p>` : ''}
            </div>
        `).join('');
        
        const wrapper = document.createElement('div');
        wrapper.innerHTML = cards;
        wrapper.style.animation = 'nofee-fade-in 0.4s ease-out';
        
        // 상품 카드를 맨 위에 추가 (prepend)
        this.state.messagesContainer.prepend(wrapper);
        this.scrollToTop();
    },
    
    // 휴대폰 선택
    selectPhone: async function(index) {
        const phone = window.NofeeDisplayedPhones[index];
        this.state.selectedProduct = phone;
        
        await this.addUserMessage(`${phone.model} 선택`);
        
        let msg = `좋은 선택이세요! 👍\n\n`;
        msg += `📱 ${phone.model} (${phone.storage})\n`;
        msg += `📝 ${phone.activation} · ${phone.carrier} · ${phone.contract}\n`;
        msg += `💰 월 ${this.formatPrice(phone.total)}원`;
        if (phone.hasExtraDiscount) {
            msg += ` (추가 할인 ${this.formatPrice(phone.extraDiscountAmount)}원 적용)`;
        }
        msg += '\n\n지금 바로 신청하시겠어요?';
        
        await this.addBotMessage(msg);
        
        this.showButtons(['네, 신청할게요', '다시 선택할게요'], (selected) => {
            if (selected === '네, 신청할게요') {
                this.startPurchase();
            } else {
                this.resetChat();
            }
        });
    },
    
    // 구매 시작
    startPurchase: async function() {
        await this.addUserMessage('네, 신청할게요');
        await this.addBotMessage('좋습니다! 신청을 위해 몇 가지 정보가 필요해요.\n먼저 성함을 알려주세요.');
        
        this.showInput('text', '홍길동', (value) => {
            this.state.userData.name = value;
            this.askPhone();
        });
    },
    
    // 전화번호 입력
    askPhone: async function() {
        await this.addUserMessage(this.state.userData.name);
        await this.addBotMessage('연락 가능한 휴대폰 번호를 입력해주세요.\n(\'-\' 없이 숫자만)');
        
        this.showInput('tel', '01012345678', (value) => {
            if (!/^01[0-9]{8,9}$/.test(value)) {
                alert('올바른 전화번호 형식이 아니에요');
                return false;
            }
            this.state.userData.phone = value;
            this.askRegion();
        });
    },
    
    // 지역 선택
    askRegion: async function() {
        await this.addUserMessage(this.state.userData.phone);
        await this.addBotMessage('거주하시는 지역(시/도)을 선택해주세요.');
        
        const regions = this.state.regionData.map(r => r.name);
        this.showSelect(regions, (value) => {
            this.state.userData.region = value;
            this.askDistrict();
        });
    },
    
    // 구/군 선택
    askDistrict: async function() {
        await this.addUserMessage(this.state.userData.region);
        
        const region = this.state.regionData.find(r => r.name === this.state.userData.region);
        const districts = region ? region.districts : [];
        
        if (districts.length === 0) {
            this.state.userData.district = this.state.userData.region;
            this.askConsent();
            return;
        }
        
        await this.addBotMessage('세부 지역(구/군)을 선택해주세요.');
        this.showSelect(districts, (value) => {
            this.state.userData.district = value;
            this.askConsent();
        });
    },
    
    // 개인정보 동의
    askConsent: async function() {
        await this.addUserMessage(this.state.userData.district);
        await this.addBotMessage('마지막으로 개인정보 수집·이용에 동의해주세요.');
        
        const consentDiv = document.createElement('div');
        consentDiv.className = 'nofee-consent-box';
        consentDiv.innerHTML = `
            <a href="https://nofee.team/policy" target="_blank">📄 개인정보 처리방침 확인하기</a>
            <div class="nofee-consent-details">
                <strong>수집 항목:</strong> 성명, 휴대폰 번호, 지역<br>
                <strong>수집 목적:</strong> 휴대폰 구매 상담 및 계약 진행<br>
                <strong>보유기간:</strong> 서비스 제공 완료 후 1년
            </div>
        `;
        
        // 동의 박스를 맨 위에 추가 (prepend)
        this.state.messagesContainer.prepend(consentDiv);
        
        this.showButtons(['동의합니다', '동의하지 않습니다'], (selected) => {
            this.handleConsent(selected === '동의합니다');
        });
    },
    
    // 동의 처리
    handleConsent: async function(agreed) {
        await this.addUserMessage(agreed ? '동의합니다' : '동의하지 않습니다');
        
        if (agreed) {
            this.state.userData.consent = true;
            
            // 개인정보 동의값 설정 (필수!)
            const consentField = document.getElementById('privacy_consent');
            if (consentField) {
                consentField.value = '동의함';
            }
            
            await this.addBotMessage('감사합니다! 신청이 접수되었습니다 🎉');
            
            // 폼 데이터 채우기
            this.fillFormData();
            
            // 폼 자동 제출
            setTimeout(() => {
                this.submitForm();
            }, 500);
            
            await this.delay(1000);
            await this.addBotMessage('곧 전문 상담사가 연락드릴 예정이에요.\n노피를 이용해주셔서 감사합니다! 💙');
            
        } else {
            // 동의하지 않은 경우 동의값 초기화
            const consentField = document.getElementById('privacy_consent');
            if (consentField) {
                consentField.value = '';
            }
            
            await this.addBotMessage('개인정보 동의 없이는 진행이 어려워요.\n다음에 다시 이용해주세요!');
            this.showButtons(['처음으로 돌아가기'], () => this.resetChat());
        }
    },
    
    // 폼 데이터 채우기
    fillFormData: function() {
        const fields = {
            customer_name: this.state.userData.name,
            customer_phone: this.state.userData.phone,
            customer_region: this.state.userData.region,
            customer_district: this.state.userData.district,
            phone_model: this.state.selectedProduct.model,
            phone_carrier: this.state.selectedProduct.carrier,
            phone_price: this.state.selectedProduct.devicePrice,
            monthly_payment: this.state.selectedProduct.total,
            contract_type: this.state.selectedProduct.contract,
            activation_type: this.state.selectedProduct.activation,
            timestamp: new Date().toISOString(),
            session_id: this.state.sessionId
        };
        
        Object.entries(fields).forEach(([key, value]) => {
            const field = document.getElementById(key);
            if (field) field.value = value || '';
        });
    },
    
    // 폼 제출
    submitForm: function() {
        const form = document.getElementById('nofee-purchase-form');
        const consentField = document.getElementById('privacy_consent');
        
        if (form && consentField && consentField.value === '동의함') {
            console.log('폼 제출 시작');
            const submitBtn = form.querySelector('input[type="submit"]');
            if (submitBtn) {
                submitBtn.click();
            } else {
                // submit 버튼이 없으면 form.submit() 사용
                form.submit();
            }
        } else {
            console.error('개인정보 동의가 필요합니다.');
        }
    },
    
    // 메시지 추가
    addBotMessage: async function(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-bot';
        msgDiv.innerHTML = `
            <div class="avatar-bot">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                    <path d="M2 17L12 22L22 17"/>
                    <path d="M2 12L12 17L22 12"/>
                </svg>
            </div>
            <div class="bubble" id="msg-${Date.now()}"></div>
        `;
        
        // 메시지를 맨 위에 추가 (prepend)
        this.state.messagesContainer.prepend(msgDiv);
        
        // 타이핑 효과
        const bubble = msgDiv.querySelector('[id^="msg-"]');
        for (let i = 0; i < text.length; i++) {
            bubble.textContent += text[i];
            await this.delay(this.config.TYPING_SPEED);
        }
        
        this.scrollToTop();
    },
    
    addUserMessage: async function(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-user';
        msgDiv.innerHTML = `<div class="bubble">${text}</div>`;
        
        // 메시지를 맨 위에 추가 (prepend)
        this.state.messagesContainer.prepend(msgDiv);
        this.scrollToTop();
        await this.delay(300);
    },
    
    // 버튼 표시
    showButtons: function(options, callback) {
        const btnDiv = document.createElement('div');
        btnDiv.className = 'nofee-button-group';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.textContent = option;
            btn.className = 'nofee-option-btn';
            btn.onclick = () => {
                btnDiv.remove();
                callback(option);
            };
            btnDiv.appendChild(btn);
        });
        
        // 버튼을 맨 위에 추가 (prepend)
        this.state.messagesContainer.prepend(btnDiv);
        this.scrollToTop();
    },
    
    // 입력 필드
    showInput: function(type, placeholder, callback) {
        const inputDiv = document.createElement('div');
        inputDiv.className = 'nofee-input-group';
        
        const input = document.createElement('input');
        input.type = type;
        input.placeholder = placeholder;
        input.className = 'nofee-input';
        
        const btn = document.createElement('button');
        btn.textContent = '입력완료';
        btn.className = 'nofee-input-btn';
        
        btn.onclick = () => {
            const value = input.value.trim();
            if (value) {
                const result = callback(value);
                if (result !== false) {
                    inputDiv.remove();
                }
            }
        };
        
        input.onkeypress = (e) => {
            if (e.key === 'Enter') btn.click();
        };
        
        inputDiv.appendChild(input);
        inputDiv.appendChild(btn);
        
        // 입력 필드를 맨 위에 추가 (prepend)
        this.state.messagesContainer.prepend(inputDiv);
        
        input.focus();
        this.scrollToTop();
    },
    
    // 선택 필드
    showSelect: function(options, callback) {
        const selectDiv = document.createElement('div');
        selectDiv.style.animation = 'nofee-fade-in 0.4s ease-out';
        
        const select = document.createElement('select');
        select.className = 'nofee-select';
        select.innerHTML = '<option value="">선택해주세요</option>' + 
                          options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
        
        select.onchange = () => {
            if (select.value) {
                selectDiv.remove();
                callback(select.value);
            }
        };
        
        selectDiv.appendChild(select);
        
        // 선택 필드를 맨 위에 추가 (prepend)
        this.state.messagesContainer.prepend(selectDiv);
        this.scrollToTop();
    },
    
    // AI 생각중
    showAIThinking: async function() {
        const thinking = document.getElementById('aiThinking');
        if (thinking) {
            thinking.style.display = 'block';
        }
    },
    
    hideAIThinking: function() {
        const thinking = document.getElementById('aiThinking');
        if (thinking) {
            thinking.style.display = 'none';
        }
    },
    
    // 리셋
    resetChat: function() {
        this.state.currentStep = 'intro';
        this.state.filters = { priceRange: null, carrier: null, brand: null };
        this.state.userData = { dataUsage: null, preference: null, name: '', phone: '', region: '', district: '', consent: false };
        this.state.selectedProduct = null;
        
        // 개인정보 동의 필드 초기화
        const consentField = document.getElementById('privacy_consent');
        if (consentField) {
            consentField.value = '';
        }
        
        // 메시지 컨테이너 초기화
        if (this.state.messagesContainer) {
            this.state.messagesContainer.remove();
            this.state.messagesContainer = null;
        }
        
        // 인트로 화면 표시
        const intro = document.getElementById('nofeeIntro');
        if (intro) intro.style.display = 'flex';
    },
    
    // 휴대폰 목록 표시
    showPhoneList: async function() {
        this.resetChat();
        this.startConsultation();
    },
    
    // 배송 정보
    showDeliveryInfo: async function() {
        await this.addBotMessage('📦 전국 무료배송!\n\n✅ 주문 후 1-2일 내 수령\n✅ 안전 포장 배송\n✅ 실시간 배송 추적 가능');
    },
    
    // 에러 표시
    showError: function(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'margin: 1rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 12px; text-align: center;';
        errorDiv.textContent = message;
        
        if (this.state.messagesContainer) {
            this.state.messagesContainer.prepend(errorDiv);
        } else if (this.state.chatContainer) {
            this.state.chatContainer.appendChild(errorDiv);
        }
    },
    
    // 유틸리티
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    formatPrice: function(value) {
        return Number(value).toLocaleString();
    },
    
    scrollToTop: function() {
        if (this.state.chatContainer) {
            this.state.chatContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }
};

// 전역 등록 확인
console.log('노피 AI 객체 생성 완료:', window.NofeeAI);
