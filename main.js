// Nofee AI Chatbot

const state = {
  chatContainer: null,
  states: [
    'askPrice','askBrand','askProduct','askName','askPhone','askRegion','askCity','complete','askConsent'
  ],
  stateIndex: 0,
  consentGiven: false,
  hasPreSelectedProduct: false,
  userData: { name:'', phone:'', region:'', city:'', consent:'' },
  selectedProduct: {},
  filteredProducts: [],
  selectedPriceRange: {},
  selectedBrand: '',
  products: [],
  regionToCity: {},
  regions: []
};

const utils = {
  formatPrice(num){
    return Number(num).toLocaleString();
  },
  transformProduct(item){
    const modelMap = {};
    const carrierMap = { SK: 'SKT', KT: 'KT', LG: 'LGU' };
    const typeMap = { '\uC774\uB3D9': '\uBC88\uD638\uC774\uB3D9', '\uAE30\uBCC0': '\uAE30\uAE30\uBCC0\uACBD' };
    const supportMap = { '\uACF5\uC2DC': '\uACF5\uC2DC\uC9C0\uC6D0', '\uC120\uC57D': '\uC120\uD0DD\uC57D\uC815' };
    const t = {...item};
    t.carrier = carrierMap[item.carrier] || item.carrier;
    t.type = typeMap[item.contract_type] || item.contract_type;
    t.support = supportMap[item.subsidy_type] || item.subsidy_type;
    t.model = modelMap[item.model_name] || item.model_name;
    t.principal = item.device_principal || 0;
    t.plan_name = item.plan_monthly_payment || 0;
    t.change_plan = item.post_plan_monthly_payment || 0;
    t.contract_period = item.contract_months || 0;
    t.plan_period = item.plan_required_months || 0;
    t.plan = item.plan_effective_monthly_payment || 0;
    t.installment = item.device_monthly_payment || 0;
    t.total = item.total_monthly_payment || 0;
    return t;
  },
  transformProducts(data){
    if(!Array.isArray(data)) return [];
    return data.map(utils.transformProduct);
  }
};

const animations = {
  showAIThinking(msg){
    return new Promise(resolve=>{
      this.showLoader(()=>{
        chatUI.addBotMessage(msg);
        resolve();
      });
    });
  },
  showLoader(callback){
    setTimeout(callback,800);
  }
};

const chatUI = {
  addBotMessage(msg,delay=0){
    setTimeout(()=>{
      const div=document.createElement('div');
      div.className='message bot';
      div.textContent=msg;
      state.chatContainer.appendChild(div);
      state.chatContainer.scrollTop=state.chatContainer.scrollHeight;
    },delay);
  },
  addUserMessage(msg){
    const div=document.createElement('div');
    div.className='message user';
    div.textContent=msg;
    state.chatContainer.appendChild(div);
    state.chatContainer.scrollTop=state.chatContainer.scrollHeight;
  },
  createBackButton(){
    const btn=document.createElement('button');
    btn.textContent='뒤로';
    btn.className='chat-back';
    btn.onclick=()=>{
      if(state.stateIndex>0){
        state.stateIndex--; chatFlow.nextStep();
      }
    };
    return btn;
  },
  showButtons(labels,cb,showBack=true){
    const wrap=document.createElement('div');
    wrap.className='chat-input';
    labels.forEach(l=>{
      const b=document.createElement('button');
      b.textContent=l;
      b.onclick=()=>{wrap.remove(); cb(l);};
      wrap.appendChild(b);
    });
    if(showBack) wrap.appendChild(this.createBackButton());
    state.chatContainer.appendChild(wrap);
    state.chatContainer.scrollTop=state.chatContainer.scrollHeight;
  },
  showInput(type,options=[],showBack=true){
    const wrap=document.createElement('div');
    wrap.className='chat-input';
    let input;
    if(type==='select'){
      input=document.createElement('select');
      options.forEach(o=>{
        const op=document.createElement('option');
        op.value=op.textContent=o;
        input.appendChild(op);
      });
    }else{
      input=document.createElement('input');
      input.type=type==='phone'?'tel':'text';
    }
    const btn=document.createElement('button');
    btn.textContent='확인';
    btn.onclick=()=>{if(input.value){wrap.remove(); chatFlow.proceed(input.value);}};
    wrap.appendChild(input); wrap.appendChild(btn);
    if(showBack) wrap.appendChild(this.createBackButton());
    state.chatContainer.appendChild(wrap);
    state.chatContainer.scrollTop=state.chatContainer.scrollHeight;
    input.focus();
  }
};

const dataManager = {
  fillWebflowFields(){
    const map={
      model_name:'model',carrier:'carrier',date:'date',contract_type:'type',subsidy_type:'support',contract_months:'contract_period',plan_monthly_payment:'plan_name',post_plan_monthly_payment:'change_plan',device_principal:'principal',device_price_input:'principal',brand:'brand',plan_name:'plan_name',plan_required_months:'plan_period',plan_effective_monthly_payment:'plan',device_monthly_payment:'installment',optional_discount_ratio:'optional_discount_ratio',total_monthly_payment:'total',storage:'storage'};
    for(const id in map){
      const el=document.getElementById(id);
      if(el){
        el.value=state.selectedProduct[map[id]]||'';
      }
    }
    const userFields=['name','phone','region','city','consent'];
    userFields.forEach(f=>{
      const el=document.getElementById(f);
      if(el) el.value=state.userData[f]||'';
    });
  },
  updateUrlParams(){
    const params=new URLSearchParams();
    if(state.selectedBrand) params.set('brand',state.selectedBrand);
    if(state.selectedPriceRange.label) params.set('price',state.selectedPriceRange.label);
    if(state.selectedProduct.model) params.set('product',state.selectedProduct.model);
    history.replaceState(null,'',`?${params.toString()}`);
  },
  saveViewedProduct(product){
    try{
      const arr=JSON.parse(localStorage.getItem('viewedProducts')||'[]');
      arr.push({model:product.model,time:Date.now()});
      localStorage.setItem('viewedProducts',JSON.stringify(arr));
    }catch(e){console.error(e);}
  }
};

const formSubmit={
  submitForm(){
    const form=document.querySelector('form');
    if(form) form.submit();
  }
};

const chatFlow={
  async askPrice(){
    await animations.showAIThinking('요금대 분석 중');
    chatUI.addBotMessage('선호하시는 월 요금대를 선택해주세요.');
    const ranges=[
      {label:'3~5만 원',min:30000,max:50000},
      {label:'5~7만 원',min:50000,max:70000},
      {label:'7~9만 원',min:70000,max:90000},
      {label:'9~10만 원',min:90000,max:100000},
      {label:'10만 원 이상',min:100000,max:Infinity}
    ];
    chatUI.showButtons(ranges.map(r=>r.label),label=>{
      const range=ranges.find(r=>r.label===label);
      state.selectedPriceRange=range;
      state.filteredProducts=state.products.filter(p=>+p.total>=range.min && +p.total<range.max);
      dataManager.updateUrlParams();
      state.stateIndex++; chatFlow.nextStep();
    },false);
  },

  async askBrand(){
    await animations.showAIThinking('브랜드 매칭 중');
    if(state.filteredProducts.length===0){
      chatUI.addBotMessage('선택하신 가격대에 맞는 상품이 없습니다. 다시 선택해주세요.');
      state.stateIndex=0; return chatFlow.nextStep();
    }
    chatUI.addBotMessage('원하시는 브랜드를 선택해주세요.');
    const brands=[...new Set(state.filteredProducts.map(p=>p.brand))];
    chatUI.showButtons(brands,brand=>{
      state.selectedBrand=brand;
      state.filteredProducts=state.filteredProducts.filter(p=>p.brand===brand);
      dataManager.updateUrlParams();
      state.stateIndex++; chatFlow.nextStep();
    });
  },

  async askProduct(){
    await animations.showAIThinking('최적 상품 추천 중');
    if(state.filteredProducts.length===0){
      chatUI.addBotMessage('조건에 맞는 상품이 없습니다. 처음부터 다시 선택해주세요.');
      state.stateIndex=0; state.filteredProducts=[]; return chatFlow.nextStep();
    }
    chatUI.addBotMessage('다음 상품 중에서 선택해주세요.');
    animations.showLoader(()=>{
      const wrap=document.createElement('div');
      wrap.className='chat-input';
      state.filteredProducts.slice(0,5).forEach(p=>{
        const btn=document.createElement('button');
        btn.innerHTML=`<strong>${p.model}</strong><br/><span style="font-size:13px;opacity:0.7;">${p.carrier} · ${p.type} · ${p.support}</span><br/><span style="color:#00ff88;font-weight:700;">월 ₩${utils.formatPrice(p.total)}</span>`;
        btn.onclick=()=>{
          wrap.remove();
          state.selectedProduct={...p};
          chatUI.addUserMessage(`${p.model} 선택`);
          dataManager.saveViewedProduct(p);
          dataManager.updateUrlParams();
          state.stateIndex++; chatFlow.nextStep();
        };
        wrap.appendChild(btn);
      });
      if(!state.hasPreSelectedProduct) wrap.appendChild(chatUI.createBackButton());
      state.chatContainer.appendChild(wrap);
      state.chatContainer.scrollTop=state.chatContainer.scrollHeight;
    });
  },

  async askName(){
    await animations.showAIThinking('정보 입력 준비');
    chatUI.addBotMessage('성함을 입력해주세요.');
    chatUI.showInput('text');
  },

  async askPhone(){
    await animations.showAIThinking('연락처 입력 준비');
    chatUI.addBotMessage("연락 가능한 전화번호를 남겨주세요.('-' 없이 숫자만 입력)");
    chatUI.showInput('phone');
  },

  async askRegion(){
    await animations.showAIThinking('지역 정보 확인');
    chatUI.addBotMessage('거주 중이신 시(도)를 선택해주세요.');
    chatUI.showInput('select',state.regions);
  },

  async askCity(){
    await animations.showAIThinking('세부 지역 확인');
    const districts=state.regionToCity[state.userData.region]||[];
    if(districts.length===0){
      state.userData.city=state.userData.region;
      dataManager.updateUrlParams();
      state.stateIndex++; return chatFlow.nextStep();
    }
    chatUI.addBotMessage('군/구를 선택해주세요.');
    chatUI.showInput('select',districts);
  },

  async complete(){
    await animations.showAIThinking('정보 검증 중');
    chatUI.addBotMessage('입력해주신 정보를 확인했습니다.');
    dataManager.fillWebflowFields();
    state.stateIndex++; setTimeout(chatFlow.nextStep,200);
  },

  askConsent(){
    chatFlow.showConsent();
  },

  proceed(input){
    const current=state.states[state.stateIndex];
    chatUI.addUserMessage(input);
    if(current==='askName') state.userData.name=input;
    if(current==='askPhone') state.userData.phone=input;
    if(current==='askRegion') state.userData.region=input;
    if(current==='askCity') state.userData.city=input;
    dataManager.updateUrlParams();
    state.stateIndex++; chatFlow.nextStep();
  },

  async nextStep(){
    const current=state.states[state.stateIndex];
    if(typeof chatFlow[current]==='function'){
      try{ await chatFlow[current](); }catch(e){ handleError(e,'Flow'); }
    }
  },

  showConsent(){
    chatUI.addBotMessage('개인정보 수집 및 이용에 동의하십니까?');
    setTimeout(()=>{
      const wrap=document.createElement('div');
      wrap.className='chat-input';
      const link=document.createElement('a');
      link.href='/policy';
      link.textContent='개인정보 처리방침 보기';
      link.style.cssText='color:#00ff88;font-size:14px;display:block;margin-bottom:8px;text-decoration:underline;';
      link.onclick=e=>{e.preventDefault(); window.open('/policy','_blank');};
      wrap.appendChild(link);
      const agree=document.createElement('button');
      agree.textContent='동의';
      agree.onclick=async()=>{
        wrap.remove();
        state.consentGiven=true;
        state.userData.consent='동의함';
        chatUI.addUserMessage('동의');
        await animations.showAIThinking('신청 접수 중');
        chatUI.addBotMessage('감사합니다. 신청을 접수 중입니다.');
        dataManager.fillWebflowFields();
        formSubmit.submitForm();
      };
      wrap.appendChild(agree);
      const dis=document.createElement('button');
      dis.textContent='비동의';
      dis.onclick=()=>{
        wrap.remove();
        chatUI.addUserMessage('비동의');
        chatUI.addBotMessage('이 페이지를 나가시겠어요?');
        chatUI.showButtons(['네','아니요'],ans=>{
          if(ans==='네') window.location.href='/';
          else chatFlow.showConsent();
        },false);
      };
      wrap.appendChild(dis);
      if(!state.hasPreSelectedProduct) wrap.appendChild(chatUI.createBackButton());
      state.chatContainer.appendChild(wrap);
      state.chatContainer.scrollTop=state.chatContainer.scrollHeight;
    },150);
  },

  showProductInfo(product){
    const msg=`${product.model} (${product.carrier}) - 월 ₩${utils.formatPrice(product.total)}`;
    chatUI.addBotMessage(msg);
  }
};

async function loadData(){
  try{
    const scriptUrl=new URL(document.currentScript.src);
    const basePath=scriptUrl.pathname.split('/').slice(0,-2).join('/');
    const base=scriptUrl.origin+basePath;
    const productsUrl=`${base}/data/products.json`;
    const regionsUrl=`${base}/data/regions.json`;
    const [pRes,rRes]=await Promise.all([fetch(productsUrl),fetch(regionsUrl)]);
    const products=await pRes.json();
    const regions=await rRes.json();
    state.products=utils.transformProducts(products);
    regions.forEach(r=>{state.regionToCity[r.name]=r.districts; state.regions.push(r.name);});
  }catch(e){ handleError(e,'loadData'); }
}

function initAIChat(){
  state.chatContainer=document.getElementById('chatbot');
  if(!state.chatContainer){ console.error('chat container not found'); return; }
  loadData().then(()=>{
    chatFlow.nextStep();
  });
}

function improveAccessibility(){
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const back=document.querySelector('.chat-back');
      if(back) back.click();
    }
  });
  const observer=new MutationObserver(()=>{
    const newInput=state.chatContainer.querySelector('.chat-input input:last-child, .chat-input select:last-child');
    if(newInput) setTimeout(()=>newInput.focus(),100);
  });
  if(state.chatContainer){
    observer.observe(state.chatContainer,{childList:true,subtree:true});
  }
}

function handleError(error,context){
  console.error('['+context+']',error);
  chatUI.addBotMessage('오류가 발생했습니다. 새로고침 후 다시 시도해주세요.');
}

window.addEventListener('error',e=>{handleError(e.error,'Global');});
window.addEventListener('unhandledrejection',e=>{handleError(e.reason,'Promise'); e.preventDefault();});

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{initAIChat(); improveAccessibility();});
}else{
  initAIChat(); improveAccessibility();
}
