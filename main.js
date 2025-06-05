// main.js
// 노피 AI 챗봇 - main.js
console.log('Nofee AI main.js 실행 시작');

// ────────── 1. 전역 상태(state) 정의 ──────────
const state = {
  chatContainer: null,
  states: [
    'askPrice',
    'askBrand',
    'askProduct',
    'askName',
    'askPhone',
    'askRegion',
    'askCity',
    'complete',
    'askConsent'
  ],
  stateIndex: 0,
  consentGiven: false,
  hasPreSelectedProduct: false,

  // 사용자 데이터
  userData: {
    name: '',
    phone: '',
    region: '',
    city: '',
    consent: ''
  },

  // 상품/지역 데이터
  products: [],
  regionToCity: {},
  regions: [],

  // 선택된 필터/상품
  selectedPriceRange: {},
  filteredProducts: [],
  selectedBrand: '',
  selectedProduct: {}
};

// ────────── 설정(config) ──────────
const config = {
  GITHUB_RAW: 'https://raw.githubusercontent.com/Jacob-PO/nofee_chat/main/',
  GITHUB_CDN: 'https://gitcdn.link/repo/Jacob-PO/nofee_chat/main/'
};

// ────────── 2. 유틸리티(utils) ──────────
const utils = {
  // 가격 숫자를 콤마 찍어주는 함수
  formatPrice: (value) => {
    return Number(value).toLocaleString('ko-KR');
  },

  // 상품 객체를 원하는 형태로 변환
  transformProduct: (item) => {
    // 모델명 맵핑 예시 (필요에 따라 확장)
    const modelMap = {
      'S25-256': '갤럭시 S25 256GB',
      'S25플러스-256': '갤럭시 S25 플러스 256GB',
      'S25울트라-256': '갤럭시 S25 울트라 256GB',
      'S24FE': '갤럭시 S24 FE',
      '플립6-256': '갤럭시 Z 플립6 256GB',
      '플립5-256': '갤럭시 Z 플립5 256GB',
      '폴드6-256': '갤럭시 Z 폴드6 256GB',
      '와이드7': '갤럭시 와이드7',
      'A16': '갤럭시 A16',
      '아이폰16-128': '아이폰 16 128GB',
      '아이폰16-256': '아이폰 16 256GB',
      '아이폰16프로-128': '아이폰 16 Pro 128GB',
      '아이폰16프로-256': '아이폰 16 Pro 256GB',
      '아이폰16프로맥스-256': '아이폰 16 Pro Max 256GB',
      '아이폰15-128': '아이폰 15 128GB',
      '아이폰15프로-128': '아이폰 15 Pro 128GB',
      '시나모롤 키즈폰': '시나모롤 키즈폰',
      '키즈폰 무너': '키즈폰 무너'
    };

    const carrierMap = { SK: 'SKT', KT: 'KT', LG: 'LGU' };
    const typeMap = { '이동': '번호이동', '기변': '기기변경' };
    const supportMap = { '공시': '공시지원', '선약': '선택약정' };

    const transformed = { ...item };
    transformed.carrier = carrierMap[item.carrier] || item.carrier;
    transformed.type = typeMap[item.contract_type] || item.contract_type;
    transformed.support = supportMap[item.subsidy_type] || item.subsidy_type;
    transformed.model = modelMap[item.model_name] || item.model_name;
    transformed.principal = item.device_principal || 0;
    transformed.plan_name = item.plan_monthly_payment || 0;
    transformed.change_plan = item.post_plan_monthly_payment || 0;
    transformed.contract_period = item.contract_months || 0;
    transformed.plan_period = item.plan_required_months || 0;
    transformed.plan = item.plan_effective_monthly_payment || 0;
    transformed.installment = item.device_monthly_payment || 0;
    transformed.total = item.total_monthly_payment || 0;
    transformed.brand = item.brand || '';
    transformed.storage = item.storage || '';

    return transformed;
  },

  // 배열 전체를 변환
  transformProducts: (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(utils.transformProduct);
  }
};

// ────────── 3. AI 애니메이션(animations) ──────────
const animations = {
  // 챗봇이 “생각 중” 애니메이션 (800ms)
  showAIThinking: (text = "AI가 맞춤 상품을 분석 중입니다") => {
    const thinking = document.createElement('div');
    thinking.className = 'ai-thinking';
    thinking.innerHTML = `
      <div class="ai-dots">
        <div class="ai-dot"></div>
        <div class="ai-dot"></div>
        <div class="ai-dot"></div>
      </div>
      <div class="ai-thinking-text">${text}...</div>
    `;
    state.chatContainer.appendChild(thinking);
    state.chatContainer.scrollTop = state.chatContainer.scrollHeight;

    return new Promise(resolve => {
      setTimeout(() => {
        thinking.remove();
        resolve();
      }, 800);
    });
  },

  // 간단한 딜레이 콜백 실행 (loader 역할)
  showLoader: (callback) => {
    setTimeout(callback, 100);
  }
};

// ────────── 4. 채팅 UI (chatUI) ──────────
const chatUI = {
  // 봇 메시지 추가 (타이핑 딜레이 포함)
  addBotMessage: (msg, delay = 5) => {
    const div = document.createElement('div');
    div.className = 'nofee-message-group';
    const bubble = document.createElement('div');
    bubble.className = 'nofee-message bot';
    const avatar = document.createElement('div');
    avatar.className = 'nofee-message-avatar';
    avatar.innerText = 'AI';
    const content = document.createElement('div');
    content.className = 'nofee-message-bubble';
    div.appendChild(bubble);
    bubble.appendChild(avatar);
    bubble.appendChild(content);

    state.chatContainer.appendChild(div);
    state.chatContainer.scrollTop = state.chatContainer.scrollHeight;

    let i = 0;
    function typeChar() {
      if (i <= msg.length) {
        content.innerText = msg.slice(0, i++);
        setTimeout(typeChar, delay);
      } else {
        state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
      }
    }
    typeChar();
  },

  // 사용자 메시지 추가
  addUserMessage: (msg) => {
    const div = document.createElement('div');
    div.className = 'nofee-message-group';
    const bubble = document.createElement('div');
    bubble.className = 'nofee-message user';
    const avatar = document.createElement('div');
    avatar.className = 'nofee-message-avatar';
    avatar.style.background = '#E8E8ED';
    avatar.style.color = '#666';
    avatar.innerText = '나';
    const content = document.createElement('div');
    content.className = 'nofee-message-bubble';
    content.innerText = msg;

    div.appendChild(bubble);
    bubble.appendChild(avatar);
    bubble.appendChild(content);

    state.chatContainer.appendChild(div);
    state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
  },

  // “이전으로 돌아가기” 버튼 생성
  createBackButton: () => {
    const back = document.createElement('button');
    back.className = 'chat-back';
    back.textContent = '← 이전으로 돌아가기';
    back.onclick = () => {
      if (state.stateIndex > 0) {
        state.stateIndex--;
        // 마지막으로 추가된 사용자 입력 or select 요소 제거
        const inputs = state.chatContainer.querySelectorAll('.chat-input, .nofee-message.user');
        if (inputs.length) {
          inputs[inputs.length - 1].remove();
        }
        chatFlow.nextStep();
      }
    };
    return back;
  },

  // 여러 개 버튼 보여주기
  showButtons: (labels, callback, showBack = true) => {
    animations.showLoader(() => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-input';

      labels.forEach(label => {
        const btn = document.createElement('button');
        btn.className = 'nofee-option-btn';
        btn.innerText = label;
        btn.onclick = () => {
          wrapper.remove();
          chatUI.addUserMessage(label);
          callback(label);
        };
        wrapper.appendChild(btn);
      });

      if (showBack && !state.hasPreSelectedProduct) {
        const backBtn = chatUI.createBackButton();
        wrapper.appendChild(backBtn);
      }

      state.chatContainer.appendChild(wrapper);
      state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
    });
  },

  // select 또는 text/phone 입력창 보여주기
  showInput: (type, options = [], showBack = true) => {
    animations.showLoader(() => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-input';

      if (type === 'select') {
        const select = document.createElement('select');
        select.innerHTML = '<option value="">선택해주세요</option>' +
          options.map(opt => `<option value="${opt}">${opt}</option>`).join('');

        select.onchange = () => {
          if (select.value) {
            wrapper.remove();
            chatUI.addUserMessage(select.value);
            chatFlow.proceed(select.value);
          }
        };
        wrapper.appendChild(select);

      } else {
        const input = document.createElement('input');
        input.placeholder = type === 'phone' ? '01012345678' : '입력해주세요';
        if (type === 'phone') {
          input.type = 'tel';
          input.maxLength = 11;
        }
        wrapper.appendChild(input);

        const btn = document.createElement('button');
        btn.textContent = '입력';
        btn.onclick = () => {
          const value = input.value.trim();
          if (type === 'phone') {
            const phoneRegex = /^01[0-9]{8,9}$/;
            if (!phoneRegex.test(value)) {
              input.style.borderColor = '#ff4444';
              input.placeholder = '올바른 전화번호를 입력해주세요';
              return;
            }
          }
          if (value) {
            wrapper.remove();
            chatFlow.proceed(value);
          }
        };
        wrapper.appendChild(btn);

        // Enter 키 입력 시 버튼 클릭
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            btn.click();
          }
        });
      }

      if (showBack && !state.hasPreSelectedProduct) {
        wrapper.appendChild(chatUI.createBackButton());
      }

      state.chatContainer.appendChild(wrapper);
      state.chatContainer.scrollTop = state.chatContainer.scrollHeight;

      // 자동 포커스
      const focusEl = wrapper.querySelector('input, select');
      if (focusEl) setTimeout(() => focusEl.focus(), 100);
    });
  }
};

// ────────── 5. 채팅 흐름(chatFlow) ──────────
const chatFlow = {
  // 1단계: 요금대 선택
  askPrice: async () => {
    await animations.showAIThinking("요금대 분석 중");
    chatUI.addBotMessage(
      "노피에서 월 요금대를 기준으로 상품을 추천드릴게요.\n" +
      "선호하시는 요금대를 선택해주세요."
    );

    const ranges = [
      { label: '3~5만 원', min: 30000, max: 50000 },
      { label: '5~7만 원', min: 50000, max: 70000 },
      { label: '7~9만 원', min: 70000, max: 90000 },
      { label: '9~10만 원', min: 90000, max: 100000 },
      { label: '10만 원 이상', min: 100000, max: Infinity }
    ];

    chatUI.showButtons(
      ranges.map(r => r.label),
      (label) => {
        const range = ranges.find(r => r.label === label);
        state.selectedPriceRange = range;
        state.filteredProducts = state.products.filter(p =>
          +p.total >= range.min && +p.total < range.max
        );
        dataManager.updateUrlParams();
        state.stateIndex++;
        chatFlow.nextStep();
      },
      false
    );
  },

  // 2단계: 브랜드 선택
  askBrand: async () => {
    await animations.showAIThinking("브랜드 매칭 중");

    if (state.filteredProducts.length === 0) {
      chatUI.addBotMessage(
        "선택하신 가격대에 맞는 상품이 없습니다.\n" +
        "다른 가격대를 선택해주세요."
      );
      state.stateIndex = 0; // askPrice 로 돌아가기
      return chatFlow.nextStep();
    }

    chatUI.addBotMessage("어느 브랜드를 원하시나요?\n고객님의 선택을 기다리고 있어요.");
    const brands = [...new Set(state.filteredProducts.map(p => p.brand))];

    chatUI.showButtons(brands, (brand) => {
      state.selectedBrand = brand;
      state.filteredProducts = state.filteredProducts.filter(p => p.brand === brand);
      dataManager.updateUrlParams();
      state.stateIndex++;
      chatFlow.nextStep();
    });
  },

  // 3단계: 상품 선택
  askProduct: async () => {
    await animations.showAIThinking("최적 상품 추천 중");

    if (state.filteredProducts.length === 0) {
      chatUI.addBotMessage(
        "조건에 맞는 상품이 없습니다.\n" +
        "처음부터 다시 선택해주세요."
      );
      state.stateIndex = 0; // askPrice 로 리셋
      state.filteredProducts = [];
      return chatFlow.nextStep();
    }

    chatUI.addBotMessage("추천드릴 수 있는 상품 목록이에요.\n원하시는 모델을 골라주세요.");
    animations.showLoader(() => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-input';

      state.filteredProducts.slice(0, 5).forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'nofee-option-btn';
        btn.innerHTML = `
          <strong style="font-size:16px;">${p.model}</strong><br/>
          <span style="font-size:13px; opacity:0.7;">${p.carrier} · ${p.type} · ${p.support}</span><br/>
          <span style="color:#00ff88;font-weight:700;">월 ₩${utils.formatPrice(p.total)}</span>
        `;
        btn.onclick = () => {
          wrapper.remove();
          state.selectedProduct = { ...p };
          chatUI.addUserMessage(`${p.model} 선택`);
          dataManager.saveViewedProduct(p);
          dataManager.updateUrlParams();
          state.stateIndex++;
          chatFlow.nextStep();
        };
        wrapper.appendChild(btn);
      });

      if (!state.hasPreSelectedProduct) {
        wrapper.appendChild(chatUI.createBackButton());
      }

      state.chatContainer.appendChild(wrapper);
      state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
    });
  },

  // 4단계: 이름 입력
  askName: async () => {
    await animations.showAIThinking("정보 입력 준비");
    chatUI.addBotMessage("성함을 입력해주실 수 있을까요?");
    chatUI.showInput('text');
  },

  // 5단계: 전화번호 입력
  askPhone: async () => {
    await animations.showAIThinking("연락처 입력 준비");
    chatUI.addBotMessage("연락 가능한 전화번호를 남겨주세요.\n('-' 없이 숫자만 입력)");
    chatUI.showInput('phone');
  },

  // 6단계: 시/도 선택
  askRegion: async () => {
    await animations.showAIThinking("지역 정보 확인");
    chatUI.addBotMessage("거주 중이신 시(도)를 선택해주세요.");
    chatUI.showInput('select', state.regions);
  },

  // 7단계: 군/구 선택
  askCity: async () => {
    await animations.showAIThinking("세부 지역 확인");
    const districts = state.regionToCity[state.userData.region] || [];
    if (districts.length === 0) {
      state.userData.city = state.userData.region;
      dataManager.updateUrlParams();
      state.stateIndex++;
      return chatFlow.nextStep();
    }
    chatUI.addBotMessage("군/구를 선택해주세요.");
    chatUI.showInput('select', districts);
  },

  // 8단계: 정보 확인 및 Webflow 필드 채움
  complete: async () => {
    await animations.showAIThinking("정보 검증 중");
    chatUI.addBotMessage("입력해주신 정보를 확인했습니다.\n아래 안내를 마지막으로 확인해주세요.");
    dataManager.fillWebflowFields();
    state.stateIndex++;
    setTimeout(chatFlow.nextStep, 200);
  },

  // 9단계: 동의 화면
  askConsent: () => {
    chatFlow.showConsent();
  },

  // 사용자 입력을 받아 state.userData에 저장 후 다음 단계로
  proceed: (input) => {
    const currentName = state.states[state.stateIndex];
    switch (currentName) {
      case 'askName':
        state.userData.name = input;
        break;
      case 'askPhone':
        state.userData.phone = input;
        break;
      case 'askRegion':
        state.userData.region = input;
        break;
      case 'askCity':
        state.userData.city = input;
        break;
    }
    dataManager.updateUrlParams();
    state.stateIndex++;
    chatFlow.nextStep();
  },

  // 다음 단계 호출
  nextStep: async () => {
    const currentName = state.states[state.stateIndex];
    try {
      if (typeof chatFlow[currentName] === 'function') {
        await chatFlow[currentName]();
      }
    } catch (error) {
      console.error('챗봇 플로우 오류:', error);
      chatUI.addBotMessage("오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
    }
  },

  // 동의 화면 그리기
  showConsent: () => {
    chatUI.addBotMessage("개인정보 수집 및 이용에 동의하십니까?");
    setTimeout(() => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-input';

      const link = document.createElement('a');
      link.href = "/policy";
      link.textContent = "개인정보 처리방침 보기";
      link.style.cssText = "color: #5D5FEF; font-size: 14px; display:block; margin-bottom:8px; text-decoration: underline;";
      link.onclick = (e) => { e.preventDefault(); window.open("/policy", '_blank'); };
      wrapper.appendChild(link);

      const agree = document.createElement('button');
      agree.className = 'nofee-option-btn';
      agree.textContent = "동의";
      agree.onclick = async () => {
        wrapper.remove();
        state.consentGiven = true;
        state.userData.consent = "동의함";
        chatUI.addUserMessage("동의");

        await animations.showAIThinking("신청 접수 중");
        chatUI.addBotMessage("감사합니다. 신청을 접수 중입니다.");
        dataManager.fillWebflowFields();
        formSubmit.submitForm();
      };
      wrapper.appendChild(agree);

      const disagree = document.createElement('button');
      disagree.className = 'nofee-option-btn';
      disagree.textContent = "비동의";
      disagree.onclick = () => {
        wrapper.remove();
        chatUI.addUserMessage("비동의");
        chatUI.addBotMessage("이 페이지를 나가시겠어요?");
        chatUI.showButtons(
          ["네", "아니요"],
          (ans) => {
            if (ans === "네") {
              window.location.href = "/";
            } else {
              chatFlow.showConsent();
            }
          },
          false
        );
      };
      wrapper.appendChild(disagree);

      if (!state.hasPreSelectedProduct) {
        wrapper.appendChild(chatUI.createBackButton());
      }

      state.chatContainer.appendChild(wrapper);
      state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
    }, 150);
  }
};

// ────────── 6. 데이터 관리(dataManager) ──────────
const dataManager = {
  // URL 파라미터에 현재 선택값 반영
  updateUrlParams: () => {
    const params = new URLSearchParams();

    if (state.selectedPriceRange.min !== undefined) {
      params.set("price_range", `${state.selectedPriceRange.min}-${state.selectedPriceRange.max}`);
    }
    if (state.selectedBrand) params.set("brand", state.selectedBrand);

    if (state.selectedProduct.model) params.set("model_name", state.selectedProduct.model || "");
    if (state.selectedProduct.carrier) params.set("carrier", state.selectedProduct.carrier || "");
    if (state.selectedProduct.type) params.set("contract_type", state.selectedProduct.type || "");
    if (state.selectedProduct.support) params.set("subsidy_type", state.selectedProduct.support || "");
    if (state.selectedProduct.total) params.set("total_monthly_payment", state.selectedProduct.total || "");
    if (state.selectedProduct.device_principal) params.set("device_principal", state.selectedProduct.device_principal || "");
    if (state.selectedProduct.plan_name) params.set("plan_name", state.selectedProduct.plan_name || "");
    if (state.selectedProduct.post_plan_monthly_payment) params.set("post_plan_monthly_payment", state.selectedProduct.post_plan_monthly_payment || "");
    if (state.selectedProduct.plan_effective_monthly_payment) params.set("plan_effective_monthly_payment", state.selectedProduct.plan_effective_monthly_payment || "");
    if (state.selectedProduct.device_monthly_payment) params.set("device_monthly_payment", state.selectedProduct.device_monthly_payment || "");
    if (state.selectedProduct.storage) params.set("storage", state.selectedProduct.storage || "");

    Object.entries(state.userData).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

    params.set("consent", state.consentGiven ? "yes" : "no");
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
  },

  // Webflow 숨김 필드에 실제 값을 채움
  fillWebflowFields: () => {
    try {
      // 고객 정보
      const f_name = document.getElementById('customer_name');
      const f_phone = document.getElementById('customer_phone');
      const f_region = document.getElementById('customer_region');
      const f_district = document.getElementById('customer_district');
      const f_consent = document.getElementById('privacy_consent');

      if (f_name) f_name.value = state.userData.name;
      if (f_phone) f_phone.value = state.userData.phone;
      if (f_region) f_region.value = state.userData.region;
      if (f_district) f_district.value = state.userData.city;
      if (f_consent) f_consent.value = state.consentGiven ? "동의함" : "비동의";

      // 상품 정보
      const p_model = document.getElementById('phone_model');
      const p_brand = document.getElementById('phone_brand');
      const p_storage = document.getElementById('phone_storage');
      const p_carrier = document.getElementById('phone_carrier');
      const p_activation = document.getElementById('activation_type');
      const p_contract = document.getElementById('contract_type');

      if (p_model) p_model.value = state.selectedProduct.model || '';
      if (p_brand) p_brand.value = state.selectedProduct.brand || '';
      if (p_storage) p_storage.value = state.selectedProduct.storage || '';
      if (p_carrier) p_carrier.value = state.selectedProduct.carrier || '';
      if (p_activation) p_activation.value = state.selectedProduct.type || '';
      if (p_contract) p_contract.value = state.selectedProduct.support || '';

      // 가격 정보
      const f_retail = document.getElementById('retail_price');
      const f_dev_fee = document.getElementById('monthly_device_fee');
      const f_plan_fee = document.getElementById('monthly_plan_fee');
      const f_total = document.getElementById('total_monthly_payment');
      const f_extra = document.getElementById('extra_discount');

      if (f_retail) f_retail.value = state.selectedProduct.principal || 0;
      if (f_dev_fee) f_dev_fee.value = state.selectedProduct.installment || 0;
      if (f_plan_fee) f_plan_fee.value = state.selectedProduct.plan || 0;
      if (f_total) f_total.value = state.selectedProduct.total || 0;
      if (f_extra) f_extra.value = state.selectedProduct.optional_discount_ratio || 0;

      // 메타 정보
      const f_timestamp = document.getElementById('timestamp');
      const f_session = document.getElementById('session_id');
      const f_json = document.getElementById('product_json');
      if (f_timestamp) f_timestamp.value = new Date().toISOString();
      if (f_session) f_session.value = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      if (f_json) f_json.value = JSON.stringify(state.selectedProduct || {});
    } catch (e) {
      console.error('fillWebflowFields 오류:', e);
    }
  },

  // URL 파라미터에 상품 정보가 들어있는지 체크 → 사전 선택된 상품으로 처리
  checkPreSelectedProduct: () => {
    const params = new URLSearchParams(window.location.search);
    const modelName = params.get('model_name');
    const carrier = params.get('carrier');
    const contractType = params.get('contract_type');

    if (modelName && carrier && contractType) {
      const rawProduct = {
        model_name: modelName,
        carrier,
        contract_type: contractType,
        subsidy_type: params.get('subsidy_type') || '',
        brand: params.get('brand') || '',
        device_principal: params.get('device_principal') || '',
        plan_monthly_payment: params.get('plan_name') || '',
        post_plan_monthly_payment: params.get('post_plan_monthly_payment') || '',
        plan_required_months: params.get('plan_required_months') || '',
        optional_discount_ratio: params.get('optional_discount_ratio') || '',
        device_monthly_payment: params.get('device_monthly_payment') || '',
        plan_effective_monthly_payment: params.get('plan_effective_monthly_payment') || '',
        total_monthly_payment: params.get('total_monthly_payment') || '',
        storage: params.get('storage') || ''
      };
      state.selectedProduct = utils.transformProduct(rawProduct);
      state.hasPreSelectedProduct = true;
      return true;
    }
    return false;
  },

  // 최근 본 상품을 localStorage에 저장 (최대 10개)
  saveViewedProduct: (product) => {
    try {
      const history = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
      history.unshift({ ...product, time: Date.now() });

      const unique = history.filter((v, i, arr) =>
        i === arr.findIndex(o =>
          o.model === v.model &&
          o.carrier === v.carrier &&
          o.type === v.type &&
          o.support === v.support
        )
      );
      localStorage.setItem('viewedProducts', JSON.stringify(unique.slice(0, 10)));
    } catch (e) {
      console.log('localStorage not available');
    }
  }
};

// ────────── 7. 폼 제출 관리(formSubmit) ──────────
const formSubmit = {
  submitForm: () => {
    setTimeout(() => {
      const summitButton = document.getElementById('summit');
      const applyForm = document.querySelector('form[name="apply"]') ||
                        document.querySelector('form#apply');
      if (summitButton) {
        console.log('Summit 버튼 클릭 시도');
        summitButton.click();
      } else if (applyForm) {
        console.log('Apply 폼 직접 제출 시도');
        const submitBtn = applyForm.querySelector('button[type="submit"]') ||
                          applyForm.querySelector('input[type="submit"]') ||
                          applyForm.querySelector('#summit');
        if (submitBtn) {
          submitBtn.click();
        } else {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          applyForm.dispatchEvent(submitEvent);
          if (!submitEvent.defaultPrevented) {
            applyForm.submit();
          }
        }
      } else {
        console.error('폼 또는 제출 버튼을 찾을 수 없습니다');
        chatUI.addBotMessage("죄송합니다. 제출 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
      }
    }, 300);
  }
};

// ────────── 8. 초기화 및 접근성 개선 ──────────
async function initAIChat() {
  try {
    console.log('노피 AI 상담 초기화 시작...');
    // 챗봇 컨테이너 찾기
    state.chatContainer = document.getElementById('nofee-chat-container');
    if (!state.chatContainer) {
      console.error('chatContainer 컨테이너를 찾을 수 없습니다');
      return;
    }

    // 인사 메시지 (첫 화면)
    animations.showAIThinking("AI 준비 중").then(() => {
      chatUI.addBotMessage("안녕하세요 고객님! 저는 AI 상담원입니다.");
    });

    // 상품/지역 데이터 fetch (GitHub RAW → CDN fallback)
    const fetchOpts = { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-cache' };

    let itemRes = await fetch(config.GITHUB_RAW + 'item.json', fetchOpts);
    let regionRes = await fetch(config.GITHUB_RAW + 'regions.json', fetchOpts);

    if (!itemRes.ok || !regionRes.ok) {
      itemRes = await fetch(config.GITHUB_CDN + 'item.json', fetchOpts);
      regionRes = await fetch(config.GITHUB_CDN + 'regions.json', fetchOpts);
    }

    const [productData, regionData] = await Promise.all([
      itemRes.json(),
      regionRes.json()
    ]);

    state.products = utils.transformProducts(productData);

    // 지역 데이터 맵으로 변환
    const regionMap = {};
    if (Array.isArray(regionData)) {
      regionData.forEach(r => {
        if (r && r.name && Array.isArray(r.districts)) {
          regionMap[r.name] = r.districts;
        }
      });
    }
    state.regionToCity = regionMap;
    state.regions = Object.keys(regionMap);

    console.log(`상품 데이터 로드 완료: ${productData.length}개`);
    console.log(`지역 데이터 로드 완료: ${state.regions.length}개 시/도`);

    // URL 파라미터에 사전 선택된 상품이 있는지 체크
    if (dataManager.checkPreSelectedProduct()) {
      console.log('사전 선택된 상품 발견:', state.selectedProduct);
      chatFlow.showProductInfo(state.selectedProduct);
    } else {
      chatFlow.nextStep(); // askPrice부터 시작
    }

    console.log('노피 AI 상담 초기화 완료');
  } catch (error) {
    console.error('데이터 로딩 실패:', error);
    chatUI.addBotMessage("죄송합니다. 서비스 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
}

// 접근성 기능 추가
function improveAccessibility() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const backBtn = document.querySelector('.chat-back');
      if (backBtn) backBtn.click();
    }
  });

  const observer = new MutationObserver(() => {
    const newInput = state.chatContainer.querySelector(
      '.chat-input input:last-child, .chat-input select:last-child'
    );
    if (newInput) {
      setTimeout(() => newInput.focus(), 100);
    }
  });

  if (state.chatContainer) {
    observer.observe(state.chatContainer, { childList: true, subtree: true });
  }
}

// 전역 에러/Promise 핸들러
function handleError(error, context = '') {
  console.error(`Error in ${context}:`, error);
  if (context === 'Global') {
    chatUI.addBotMessage("죄송합니다. 예기치 않은 오류가 발생했습니다.");
  }
}

window.addEventListener('error', (e) => {
  handleError(e.error, 'Global');
});
window.addEventListener('unhandledrejection', (e) => {
  handleError(e.reason, 'Promise');
  e.preventDefault();
});

// DOM 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAIChat();
    improveAccessibility();
  });
} else {
  initAIChat();
  improveAccessibility();
}
