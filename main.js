// 노피 AI 챗봇 - main.js (안정화 버전)
// 즉시 window 객체에 등록
window.NofeeAI = window.NofeeAI || {};

// 디버깅용 로그
console.log('노피 AI 스크립트 실행 시작');

// 노피 AI 메인 객체
window.NofeeAI = {
    // 상태 관리
    state: {
        initialized: false,
        currentStep: 'intro',
        chatContainer: null,
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
        TYPING_SPEED: 30,
        AI_THINKING_DELAY: 800
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
        
        // 컨테이너 찾기
        this.state.chatContainer = document.getElementById('nofeeChat');
        if (!this.state.chatContainer) {
            console.error('nofeeChat 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        console.log('채팅 컨테이너 찾음');
        
        try {
            // 로딩 숨기고 인트로 표시
            const loading = document.getElementById('nofeeLoading');
            const intro = document.getElementById('nofeeIntro');
            if (loading) loading.style.display = 'none';
            if (intro) intro.style.display = 'block';
            
            // 데이터 로드
            await this.loadData();
            
            // 인사 메시지
            await this.delay(500);
            await this.showGreeting();
            
            this.state.initialized = true;
            console.log('노피 AI 초기화 완료');
            
        } catch (error) {
            console.error('초기화 중 오류:', error);
            this.showError('초기화 중 오류가 발생했습니다.');
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
            if (!base && base !== '') continue; // skip if undefined
            try {
                const itemRes = await fetch(base + 'item.json');
                const itemData = await itemRes.json();

                const regionRes = await fetch(base + 'regions.json');
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
    
    // 인사 메시지
    showGreeting: async function() {
        await this.addBotMessage('안녕하세요! 수수료 NO, 최저가 휴대폰 노피 AI입니다 ✨');
        await this.delay(300);
        await this.addBotMessage('고객님께 딱 맞는 휴대폰을 찾아드릴게요!');
        await this.delay(500);
        this.askDataUsage();
    },
    
    // 데이터 사용량 질문
    askDataUsage: async function() {
        this.state.currentStep = 'dataUsage';
        await this.addBotMessage('먼저 데이터 사용량이 궁금해요! 평소 유튜브나 게임을 많이 하시나요?');
        
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
            message = '무제한 요금제가 필요하시군요! 데이터 걱정 없는 플랜으로 추천드릴게요 🚀';
        } else if (selected.includes('보통')) {
            message = '적절한 데이터 요금제로 추천드릴게요! 균형잡힌 선택이네요 👍';
        } else {
            message = '알뜰한 요금제로 추천드릴게요! 스마트한 선택이에요 💰';
        }
        
        await this.addBotMessage(message);
        await this.delay(500);
        this.askPriceRange();
    },
    
    // 가격대 질문
    askPriceRange: async function() {
        this.state.currentStep = 'price';
        await this.addBotMessage('선호하시는 월 납부 요금대를 골라주세요 💳');
        
        this.showButtons([
            '3~5만원',
            '5~7만원', 
            '7~9만원',
            '9~10만원',
            '10만원 이상'
        ], (selected) => {
            const ranges = {
                '3~5만원': '30000-50000',
                '5~7만원': '50000-70000',
                '7~9만원': '70000-90000',
                '9~10만원': '90000-100000',
                '10만원 이상': '100000-9999999'
            };
            this.state.filters.priceRange = ranges[selected];
            this.handlePrice(selected);
        });
    },
    
    // 가격 선택 처리
    handlePrice: async function(selected) {
        await this.addUserMessage(selected);
        await this.addBotMessage('어느 브랜드를 원하시나요? 🏢');
        this.askBrand();
    },
    
    // 브랜드 질문
    askBrand: function() {
        this.state.currentStep = 'brand';
        this.showButtons(['삼성', '애플', '기타'], (selected) => {
            this.state.filters.brand = selected;
            this.handleBrand(selected);
        });
    },
    
    // 브랜드 선택 처리
    handleBrand: async function(selected) {
        await this.addUserMessage(selected);
        await this.addBotMessage('마지막으로, 가장 중요하게 생각하시는 건 무엇인가요? 🤔');
        this.askPreference();
    },
    
    // 선호도 질문
    askPreference: function() {
        this.state.currentStep = 'preference';
        this.showButtons([
            '📸 카메라 (사진/영상)',
            '🎮 성능 (게임/앱)',
            '🔋 배터리 (오래 사용)',
            '💰 가격 (가성비)'
        ], (selected) => {
            const pref = selected.includes('카메라') ? 'camera' :
                        selected.includes('성능') ? 'game' :
                        selected.includes('배터리') ? 'battery' : 'price';
            this.state.userData.preference = pref;
            this.handlePreference(selected);
        });
    },
    
    // 선호도 처리
    handlePreference: async function(selected) {
        await this.addUserMessage(selected);
        await this.showAIThinking('AI가 최적의 상품을 찾고 있어요');
        await this.delay(1500);
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
            await this.addBotMessage('조건에 맞는 상품이 없어요 😢 다시 검색해볼까요?');
            this.showButtons(['🔄 다시 검색하기'], () => this.resetChat());
            return;
        }
        
        await this.addBotMessage('추천드릴 수 있는 상품입니다!');
        
        // 전역 변수 저장
        window.NofeeDisplayedPhones = displayPhones;
        
        // 상품 카드 HTML
        const cards = displayPhones.map((phone, index) => `
            <div style="background: white; border: 1px solid #eee; border-radius: 15px; padding: 20px; margin: 10px 0; cursor: pointer;" onclick="window.NofeeAI.selectPhone(${index})">
                <h4 style="margin: 0 0 10px 0;">${phone.model}</h4>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">${phone.activation} · ${phone.carrier} · ${phone.contract} · ${phone.storage}</p>
                <p style="margin: 10px 0; color: #5C5CFF; font-size: 20px; font-weight: bold;">월 ₩${this.formatPrice(phone.total)}</p>
                ${phone.hasExtraDiscount ? `<p style="color: #FF4444; font-size: 12px;">(-${this.formatPrice(phone.extraDiscountAmount)}원 추가 할인)</p>` : ''}
            </div>
        `).join('');
        
        const wrapper = document.createElement('div');
        wrapper.innerHTML = cards;
        this.state.chatContainer.appendChild(wrapper);
        this.scrollToBottom();
    },
    
    // 휴대폰 선택
    selectPhone: async function(index) {
        const phone = window.NofeeDisplayedPhones[index];
        this.state.selectedProduct = phone;
        
        await this.addUserMessage(`${phone.model} 선택`);
        
        let msg = `📱 ${phone.model} (${phone.storage})\n`;
        msg += `📝 ${phone.activation} · ${phone.carrier} · ${phone.contract}\n`;
        msg += `💰 월 ${this.formatPrice(phone.total)}원`;
        if (phone.hasExtraDiscount) {
            msg += ` (-${this.formatPrice(phone.extraDiscountAmount)}원 추가 할인)`;
        }
        msg += '\n\n신청을 진행할까요?';
        
        await this.addBotMessage(msg);
        
        this.showButtons(['예', '아니요'], (selected) => {
            if (selected === '예') {
                this.startPurchase();
            } else {
                this.resetChat();
            }
        });
    },
    
    // 구매 시작
    startPurchase: async function() {
        await this.addUserMessage('예');
        await this.addBotMessage('좋은 선택이세요! 👍\n성함을 입력해주세요.');
        
        this.showInput('text', '홍길동', (value) => {
            this.state.userData.name = value;
            this.askPhone();
        });
    },
    
    // 전화번호 입력
    askPhone: async function() {
        await this.addUserMessage(this.state.userData.name);
        await this.addBotMessage('전화번호를 입력해주세요. (\'-\' 없이)');
        
        this.showInput('tel', '01012345678', (value) => {
            if (!/^01[0-9]{8,9}$/.test(value)) {
                alert('올바른 전화번호를 입력해주세요');
                return false;
            }
            this.state.userData.phone = value;
            this.askRegion();
        });
    },
    
    // 지역 선택
    askRegion: async function() {
        await this.addUserMessage(this.state.userData.phone);
        await this.addBotMessage('거주 중이신 시(도)를 선택해주세요.');
        
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
        
        await this.addBotMessage('군/구를 선택해주세요.');
        this.showSelect(districts, (value) => {
            this.state.userData.district = value;
            this.askConsent();
        });
    },
    
    // 개인정보 동의
    askConsent: async function() {
        await this.addUserMessage(this.state.userData.district);
        await this.addBotMessage('개인정보 수집·이용에 동의하십니까?');
        
        const consentDiv = document.createElement('div');
        consentDiv.innerHTML = `
            <div style="background: #f8f8f8; padding: 15px; border-radius: 10px; margin: 10px 0;">
                <a href="https://nofee.team/policy" target="_blank" style="color: #5C5CFF; text-decoration: underline;">개인정보 처리방침 보기</a>
                <p style="font-size: 12px; margin: 10px 0; line-height: 1.5;">
                    노피(nofee)가 수집하는 정보: 성명, 휴대폰 번호, 지역<br>
                    수집 목적: 휴대폰 구매 상담<br>
                    보유기간: 1년
                </p>
            </div>
        `;
        this.state.chatContainer.appendChild(consentDiv);
        
        this.showButtons(['동의', '비동의'], (selected) => {
            this.handleConsent(selected === '동의');
        });
    },
    
    // 동의 처리
    handleConsent: async function(agreed) {
        await this.addUserMessage(agreed ? '동의' : '비동의');
        
        if (agreed) {
            this.state.userData.consent = true;
            await this.addBotMessage('감사합니다. 신청을 접수 중입니다! 🎉');
            
            // 폼 데이터 채우기
            this.fillFormData();
            
            // 폼 제출
            this.submitForm();
            
            await this.delay(1000);
            await this.addBotMessage('담당 매니저가 곧 연락드릴 예정입니다.\n노피를 선택해주셔서 감사합니다! 💙');
            
        } else {
            await this.addBotMessage('개인정보 동의 없이는 진행할 수 없습니다.');
            this.showButtons(['처음으로'], () => this.resetChat());
        }
    },
    
    // 폼 데이터 채우기
    fillFormData: function() {
        const fields = {
            customer_name: this.state.userData.name,
            customer_phone: this.state.userData.phone,
            customer_region: this.state.userData.region,
            customer_district: this.state.userData.district,
            privacy_consent: '동의함',
            phone_model: this.state.selectedProduct.model,
            phone_carrier: this.state.selectedProduct.carrier,
            phone_price: this.state.selectedProduct.devicePrice,
            monthly_payment: this.state.selectedProduct.total
        };
        
        Object.entries(fields).forEach(([key, value]) => {
            const field = document.getElementById(key);
            if (field) field.value = value;
        });
    },
    
    // 폼 제출
    submitForm: function() {
        const form = document.getElementById('nofee-purchase-form');
        if (form) {
            const submitBtn = form.querySelector('input[type="submit"]');
            if (submitBtn) submitBtn.click();
        }
    },
    
    // 메시지 추가
    addBotMessage: async function(text) {
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = 'margin: 15px 0; display: flex; gap: 10px;';
        msgDiv.innerHTML = `
            <div style="width: 35px; height: 35px; background: linear-gradient(135deg, #5C5CFF, #4040FF); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">🤖</div>
            <div>
                <div style="font-size: 12px; color: #999; margin-bottom: 5px;">노피 AI (bot)</div>
                <div style="background: #f8f8f8; padding: 15px 20px; border-radius: 20px; border-top-left-radius: 4px; display: inline-block; white-space: pre-wrap;" id="msg-${Date.now()}"></div>
            </div>
        `;
        this.state.chatContainer.appendChild(msgDiv);
        
        // 타이핑 효과
        const bubble = msgDiv.querySelector('[id^="msg-"]');
        for (let i = 0; i < text.length; i++) {
            bubble.textContent += text[i];
            await this.delay(this.config.TYPING_SPEED);
        }
        
        this.scrollToBottom();
    },
    
    addUserMessage: async function(text) {
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = 'margin: 15px 0; text-align: right;';
        msgDiv.innerHTML = `
            <div style="background: #5C5CFF; color: white; padding: 15px 20px; border-radius: 20px; border-top-right-radius: 4px; display: inline-block; max-width: 70%;">${text}</div>
        `;
        this.state.chatContainer.appendChild(msgDiv);
        this.scrollToBottom();
        await this.delay(300);
    },
    
    // 버튼 표시
    showButtons: function(options, callback) {
        const btnDiv = document.createElement('div');
        btnDiv.style.cssText = 'margin: 15px 0; display: flex; flex-wrap: wrap; gap: 10px;';
        
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.textContent = option;
            btn.style.cssText = 'padding: 12px 24px; border: 2px solid #5C5CFF; background: white; color: #5C5CFF; border-radius: 25px; font-size: 15px; cursor: pointer; transition: all 0.3s;';
            btn.onmouseover = () => btn.style.background = '#5C5CFF';
            btn.onmouseout = () => btn.style.background = 'white';
            btn.onclick = () => {
                btnDiv.remove();
                callback(option);
            };
            btnDiv.appendChild(btn);
        });
        
        this.state.chatContainer.appendChild(btnDiv);
        this.scrollToBottom();
    },
    
    // 입력 필드
    showInput: function(type, placeholder, callback) {
        const inputDiv = document.createElement('div');
        inputDiv.style.cssText = 'margin: 15px 0;';
        
        const input = document.createElement('input');
        input.type = type;
        input.placeholder = placeholder;
        input.style.cssText = 'width: calc(100% - 100px); padding: 12px 15px; border: 2px solid #eee; border-radius: 25px; font-size: 15px;';
        
        const btn = document.createElement('button');
        btn.textContent = '입력';
        btn.style.cssText = 'width: 80px; margin-left: 10px; padding: 12px; background: #5C5CFF; color: white; border: none; border-radius: 25px; font-size: 15px; cursor: pointer;';
        
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
        this.state.chatContainer.appendChild(inputDiv);
        
        input.focus();
        this.scrollToBottom();
    },
    
    // 선택 필드
    showSelect: function(options, callback) {
        const selectDiv = document.createElement('div');
        selectDiv.style.cssText = 'margin: 15px 0;';
        
        const select = document.createElement('select');
        select.style.cssText = 'width: 100%; padding: 12px 15px; border: 2px solid #eee; border-radius: 10px; font-size: 15px;';
        select.innerHTML = '<option value="">선택해주세요</option>' + 
                          options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
        
        select.onchange = () => {
            if (select.value) {
                selectDiv.remove();
                callback(select.value);
            }
        };
        
        selectDiv.appendChild(select);
        this.state.chatContainer.appendChild(selectDiv);
        this.scrollToBottom();
    },
    
    // AI 생각중
    showAIThinking: async function(text) {
        const thinking = document.getElementById('aiThinking');
        if (thinking) {
            thinking.querySelector('.nofee-ai-thinking-text').textContent = text + '...';
            thinking.style.display = 'block';
            this.state.chatContainer.appendChild(thinking);
            await this.delay(this.config.AI_THINKING_DELAY);
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
        this.state.currentStep = 'dataUsage';
        this.state.filters = { priceRange: null, carrier: null, brand: null };
        this.state.userData = { dataUsage: null, preference: null, name: '', phone: '', region: '', district: '', consent: false };
        this.state.selectedProduct = null;
        
        this.state.chatContainer.innerHTML = `
            <div class="nofee-intro-section" id="nofeeIntro">
                <div class="nofee-intro-avatar">
                    <span>💙</span>
                </div>
                <h2>노피 AI 매니저에 문의하기</h2>
                <div class="nofee-time-badge" onclick="toggleOperatingHours()">
                    운영시간 보기 ›
                </div>
            </div>
            <div class="nofee-operating-hours" id="operatingHours" style="display: none;">
                <p>평일: 오전 10:00 - 오후 7:00</p>
                <p>주말: 오전 11:00 - 오후 6:00</p>
                <p>공휴일: 휴무</p>
            </div>
        `;
        
        this.showGreeting();
    },
    
    // 휴대폰 목록
    showPhoneList: function() {
        this.resetChat();
    },
    
    // 배송 정보
    showDeliveryInfo: async function() {
        await this.addBotMessage('전국 무료배송! 🚚\n주문 후 1-2일 내 수령 가능합니다.');
    },
    
    // 에러 표시
    showError: function(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'margin: 15px 0; padding: 15px; background: #fee; color: #c00; border-radius: 10px;';
        errorDiv.textContent = message;
        this.state.chatContainer.appendChild(errorDiv);
    },
    
    // 유틸리티
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    formatPrice: function(value) {
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    scrollToBottom: function() {
        if (this.state.chatContainer) {
            this.state.chatContainer.scrollTop = this.state.chatContainer.scrollHeight;
        }
    }
};

// 전역 등록 확인
console.log('노피 AI 객체 생성 완료:', window.NofeeAI);

// DOM 준비 시 자동 초기화 (옵션)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM 로드 완료 - 자동 초기화는 HTML에서 처리');
    });
}
