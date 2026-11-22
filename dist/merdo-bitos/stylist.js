/* BitOS Personal Stylist and Perfect Fit — conceptual demo, no inventory or orders */
(function(){
"use strict";
const root=document.getElementById("stylist");
if(!root)return;
const $=(id)=>document.getElementById(id);
const initial={gender:"man",occasion:"formal",fit:"normal",pants:"straight",shoe:"needed",budget:15000,hem:true,sleeve:false,waist:false,source:null};
const state={...initial};
const demoPrices={hem:400,sleeve:650,waist:500}; // hypothetical TRY prices, NOT Merdo quotes
const names={
tr:{topTitle:"Kombini sana özel hazırlayalım",topText:"JamilCo'daki kişisel satış yaklaşımından ilham alan konsept: Önce ihtiyacı anla, sonra bütçene ve vücut yapına göre kombin oluştur, gerekirse ayrı ücretli terzi hizmetini değerlendir.",formTitle:"Önce sizi tanıyalım",resultTitle:"Önerilen görünüm",from:"İlham aldığınız görünüm",intro:"Bu örnek öneri, gerçek Merdo stoğu veya fiyatlandırması değildir.",gender:"Stil yönü",man:"Erkek",woman:"Kadın",occasion:"Nereye giyeceksiniz?",formal:"Resmî toplantı",partners:"Müşteri / iş ortağı",creative:"Yaratıcı / IT ortamı",fit:"Ceket omuzda nasıl oturuyor?",normal:"Rahat",tight:"Dar",loose:"Bol",pants:"Pantolon kalıbı",straight:"Düz",tapered:"Daralan",relaxed:"Rahat",shoe:"Ayakkabınız var mı?",needed:"Yeni ayakkabı gerekli",have:"Uygun ayakkabım var",budget:"Kıyafet bütçesi (₺)",budgetHelp:"Kategori tutarları hedef bütçe dağılımıdır, ürün fiyatı veya teklif değildir.",tailor:"Perfect Fit · Terzi hizmetleri",tailorText:"Ayrı ücretli, opsiyonel hizmet örnekleri. Mağazanın terzi hizmeti sunduğu doğrulanmadı.",hem:"Pantolon paçası kısaltma",sleeve:"Ceket kolu kısaltma",waist:"Pantolon beli ayarlama",budgetLabel:"Kıyafet bütçesi",tailorLabel:"Tahmini terzi hizmeti",total:"Toplam planlanan tutar",reserve:"Kalan pay",fitTitle:"Prova kontrolü",fitNormal:"Omuz dikişi doğru hizada mı? Ceketi ilikleyince çekme oluyor mu? Kollarınızı rahatça hareket ettirebiliyor musunuz?",fitTight:"Omuz ve sırt kalıbını kontrol edin. Dar ceket yalnızca bir beden büyütülerek her zaman düzeltilemez.",fitLoose:"Omuz çizgisi düşüyorsa farklı kalıp deneyin. Bel daraltması omuz kusurunu tek başına çözmez.",draftTitle:"Mağazaya soru taslağı",draftIntro:"Rezervasyon veya mesaj gönderilmez. Metni kopyalayıp mağazaya kendiniz iletebilirsiniz.",copy:"Mesajı kopyala",copied:"Metin kopyalandı",copyFailed:"Kopyalama mümkün değil; metni seçip kopyalayabilirsiniz.",reset:"Seçimi sıfırla",note:"Demo: fiyatlar örnektir, stok, terzi ve randevu entegrasyonu bulunmaz.",jacket:"Ceket",shirt:"Gömlek / üst",trousers:"Pantolon",shoes:"Ayakkabı",details:"Aksesuar",reservePiece:"Yedek bütçe",ownsShoes:"Mevcut ayakkabıyla uyum kontrolü",genders:{man:"erkek",woman:"kadın"}},
ru:{topTitle:"Соберём образ под вас",topText:"Методика премиальной консультации на основе опыта JamilCo: выясняем задачу, подбираем комплект по фигуре и бюджету, затем отдельно предлагаем возможную подгонку.",formTitle:"Сначала узнаем ваши задачи",resultTitle:"Рекомендуемый образ",from:"Образ из фотоленты",intro:"Это рекомендации-концепции, а не подтверждённые товары и цены Merdo.",gender:"Направление образа",man:"Мужской",woman:"Женский",occasion:"Для какого случая?",formal:"Официальная встреча",partners:"Встреча с клиентом",creative:"Творческая / IT-среда",fit:"Как пиджаки сидят в плечах?",normal:"Комфортно",tight:"Тесно",loose:"Свободно",pants:"Крой брюк",straight:"Прямые",tapered:"Зауженные",relaxed:"Свободные",shoe:"Есть подходящая обувь?",needed:"Нужна новая",have:"Да, есть своя",budget:"Бюджет на одежду (₺)",budgetHelp:"Суммы по категориям — план распределения бюджета, не цены и не оферта.",tailor:"Perfect Fit · Портной",tailorText:"Дополнительные услуги за отдельную плату. Наличие портного в Merdo не подтверждено.",hem:"Укоротить брюки",sleeve:"Укоротить рукава пиджака",waist:"Подогнать брюки в талии",budgetLabel:"Бюджет на одежду",tailorLabel:"Условная стоимость портного",total:"Планируемый итог",reserve:"Запас",fitTitle:"Проверка примерки",fitNormal:"Проверьте линию плеч, свободу движений и натяжение пиджака при застёгивании.",fitTight:"Проверьте ширину плеч и спину. Увеличение размера не всегда решает проблему конструкции.",fitLoose:"Проверьте линию плеч. Ушивание талии не исправляет сильно свисающие плечи.",draftTitle:"Черновик запроса в магазин",draftIntro:"Запрос не отправляется, примерка не бронируется. Текст можно скопировать.",copy:"Скопировать запрос",copied:"Текст скопирован",copyFailed:"Автоматически скопировать не удалось. Выделите текст вручную.",reset:"Сбросить подбор",note:"Демо: цены условные, наличие, услуги портного и бронирование не подключены.",jacket:"Пиджак",shirt:"Рубашка / верх",trousers:"Брюки",shoes:"Обувь",details:"Аксессуары",reservePiece:"Запас бюджета",ownsShoes:"Проверка сочетания с вашей обувью",genders:{man:"мужской",woman:"женский"}}
};
const styles={
man:{
formal:{ru:["Строгая деловая классика","Тёмно-синий или графитовый пиджак с чёткой линией плеч","Светло-голубая или белая рубашка","Брюки со стрелками в согласованном тоне","Классические кожаные туфли","Ремень и носки в тон брюк"],tr:["Klasik iş şıklığı","Lacivert veya antrasit, omzu belirgin ceket","Açık mavi veya beyaz gömlek","Uyumlu renkte ütü izli kumaş pantolon","Klasik deri ayakkabı","Pantolon rengine uygun kemer ve çorap"]},
partners:{ru:["Современный business casual","Тёмно-синий пиджак с мягкой конструкцией","Молочная или светло-голубая рубашка без галстука","Прямые серые или бежевые брюки","Кожаные дерби или лоферы","Минималистичный ремень"],tr:["Modern business casual","Yumuşak yapılı lacivert ceket","Krem veya açık mavi kravatsız gömlek","Düz kesim gri veya bej pantolon","Deri derby veya loafer","Sade kemer"]},
creative:{ru:["Интеллектуальный smart casual","Фактурный пиджак глубокого синего цвета","Однотонная оксфордская рубашка","Прямые удобные брюки","Кожаные лоферы","Ненавязчивые аксессуары"],tr:["Yaratıcı smart casual","Dokulu koyu mavi ceket","Tek renk Oxford gömlek","Düz ve rahat pantolon","Deri loafer","Sade aksesuarlar"]}
},woman:{
formal:{ru:["Современная деловая классика","Структурный жакет графитового или тёмно-синего цвета","Шёлковистая непрозрачная блуза или качественная рубашка","Прямые костюмные брюки","Закрытые кожаные туфли на удобном каблуке","Лаконичный ремень и небольшая сумка"],tr:["Modern iş klasiği","Antrasit veya lacivert yapılandırılmış blazer","Opak, şık bluz veya gömlek","Düz kesim kumaş pantolon","Rahat topuklu kapalı deri ayakkabı","Sade kemer ve küçük çanta"]},
partners:{ru:["Элегантный business casual","Блейзер мягкой конструкции","Светлая рубашка или тонкий трикотаж","Прямые или слегка зауженные брюки","Лоферы или туфли на устойчивом каблуке","Неброская сумка"],tr:["Zarif business casual","Yumuşak kalıplı blazer","Açık ton gömlek veya ince triko","Düz veya hafif dar pantolon","Loafer veya rahat topuklu ayakkabı","Sade çanta"]},
creative:{ru:["Выразительный smart casual","Лаконичный жакет с фактурой","Однотонный топ или тонкий трикотаж","Брюки свободного современного кроя","Кожаные лоферы","Графичные аксессуары"],tr:["Yaratıcı smart casual","Dokulu ve sade blazer","Tek renk üst veya ince triko","Rahat modern kesim pantolon","Deri loafer","Geometrik aksesuarlar"]}
}};
function lang(){return document.documentElement.lang==="ru"?"ru":"tr"}
function t(k){return names[lang()][k]}
function currency(n){return new Intl.NumberFormat(lang()==="ru"?"ru-RU":"tr-TR",{maximumFractionDigits:0}).format(n)+" ₺"}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function opts(name,items){return items.map(k=>'<label><input type="radio" name="'+name+'" value="'+k+'" '+(state[name]===k?"checked":"")+'> <span>'+esc(t(k))+'</span></label>').join("")}
function section(){
root.innerHTML='<div class="styleTop"><div><div class="kicker">03 / PERSONAL STYLIST × PERFECT FIT</div><h2>'+t("topTitle")+'</h2><p>'+t("topText")+'</p></div></div>'+
'<div class="stylist"><div class="styleForm"><h3>'+t("formTitle")+'</h3>'+
'<p class="lookFrom" id="lookSource" hidden></p>'+
'<div class="styleField"><fieldset><legend>'+t("gender")+'</legend><div class="styleChoices">'+opts("gender",["man","woman"])+'</div></fieldset></div>'+
'<div class="styleField"><fieldset><legend>'+t("occasion")+'</legend><div class="styleChoices">'+opts("occasion",["formal","partners","creative"])+'</div></fieldset></div>'+
'<div class="styleField"><fieldset><legend>'+t("fit")+'</legend><div class="styleChoices">'+opts("fit",["normal","tight","loose"])+'</div></fieldset></div>'+
'<div class="styleField"><fieldset><legend>'+t("pants")+'</legend><div class="styleChoices">'+opts("pants",["straight","tapered","relaxed"])+'</div></fieldset></div>'+
'<div class="styleField"><fieldset><legend>'+t("shoe")+'</legend><div class="styleChoices">'+opts("shoe",["needed","have"])+'</div></fieldset></div>'+
'<div class="styleField"><label for="styleBudget" style="display:block;font-weight:700;font-size:12px;margin-bottom:7px">'+t("budget")+'</label><input class="styleTextInput" type="number" min="1000" max="1000000" step="500" id="styleBudget" value="'+state.budget+'"><p class="styleNote">'+t("budgetHelp")+'</p></div>'+
'<div class="tailor"><div class="kicker">PERFECT FIT / TERZİ</div><h4>'+t("tailor")+'</h4><p class="styleNote">'+t("tailorText")+'</p>'+
["hem","sleeve","waist"].map(k=>'<div class="tailorRow"><label><input type="checkbox" name="'+k+'" '+(state[k]?"checked":"")+'> <span>'+t(k)+'</span></label><span class="tailorPrice">'+currency(demoPrices[k])+'</span></div>').join("")+'</div>'+
'<button type="button" class="pill" id="resetStyle">'+t("reset")+'</button></div>'+
'<div class="styleResult" aria-live="polite"><span class="smallTag">BitOS / DEMO</span><h3>'+t("resultTitle")+'</h3><div id="styleDynamic"></div></div></div>';
$("lookSource").hidden=!state.source;
if(state.source){const p=document.querySelector('[data-post="'+state.source+'"] h3');$("lookSource").textContent=t("from")+": "+(p?.textContent||state.source)}
const form=root.querySelector(".styleForm");
form.addEventListener("change",e=>{
const el=e.target;
if(el.name in state){state[el.name]=el.type==="checkbox"?el.checked:el.value;section()}else if(el.id==="styleBudget"){const n=Math.trunc(Number(el.value));state.budget=Math.min(1000000,Math.max(1000,Number.isFinite(n)?n:15000));section()}
});
$("resetStyle").addEventListener("click",()=>{Object.assign(state,initial);section()});
renderOutput()
}
function allocation(){
const p=state.shoe==="needed"?[.38,.19,.14,.23,.04,.02]:[.44,.23,.20,0,.08,.05];
const rounded=p.slice(0,5).map(x=>Math.round(state.budget*x/50)*50);
const reserve=state.budget-rounded.reduce((a,b)=>a+b,0);
return [...rounded,reserve]
}
function renderOutput(){
const keys=["jacket","trousers","shirt","shoes","details","reservePiece"];
const profile=styles[state.gender][state.occasion][lang()];
const values=[profile[1],profile[3],profile[2],state.shoe==="have"?t("ownsShoes"):profile[4],profile[5],t("reserve")];
const prices=allocation(),tailorTotal=["hem","sleeve","waist"].reduce((sum,k)=>sum+(state[k]?demoPrices[k]:0),0);
const cells=keys.filter((k,i)=>i!==3||state.shoe==="needed").map(k=>{
const i=keys.indexOf(k);return '<div class="stylePiece"><div><strong>'+t(k)+'</strong><p>'+esc(values[i])+'</p></div><strong>'+currency(prices[i])+'</strong></div>'
}).join("");
const shoeOwn=state.shoe==="have"?'<div class="fitTip">'+t("ownsShoes")+'</div>':"";
$("styleDynamic").innerHTML='<p class="styleNote">'+t("intro")+'</p><h3>'+esc(profile[0])+'</h3><div class="stylePieces">'+cells+'</div>'+shoeOwn+
'<div class="fitTip"><strong>'+t("fitTitle")+'</strong><p>'+t("fit"+state.fit[0].toUpperCase()+state.fit.slice(1))+'</p></div>'+
'<div class="styleTotals"><div class="stylePiece"><span>'+t("budgetLabel")+'</span><b>'+currency(state.budget)+'</b></div><div class="stylePiece"><span>'+t("tailorLabel")+'</span><b>'+currency(tailorTotal)+'</b></div><div class="stylePiece total"><span>'+t("total")+'</span><b>'+currency(state.budget+tailorTotal)+'</b></div></div>'+
'<p class="styleNote">'+t("note")+'</p><h3>'+t("draftTitle")+'</h3><p class="styleNote">'+t("draftIntro")+'</p><div class="fitDraft" id="styleDraft"></div>'+
'<div class="flowActions"><button type="button" class="primary" id="copyStyle">'+t("copy")+'</button></div>';
const occasion=t(state.occasion);
const service=["hem","sleeve","waist"].filter(k=>state[k]).map(k=>t(k));
const text=lang()==="tr"?
"Merhaba! BitOS konsept demosu üzerinden "+occasion.toLowerCase()+" için "+names.tr.genders[state.gender]+" kombin önerilerini gördüm. Bütçem "+currency(state.budget)+". "+(state.source?"İlham aldığım görünüm: "+state.source+". ":"")+"Güncel ürün, fiyat ve beden bilgisi alabilir miyim? "+(service.length?"Ayrı ücretli terzi işlemleri hakkında da bilgi rica ederim: "+service.join(", ")+". ":"")+"Bu yalnızca bilgi talebi taslağıdır; rezervasyon değildir.":
"Здравствуйте! Я посмотрел(а) концепт BitOS для Merdo. Нужен "+names.ru.genders[state.gender]+" образ для события «"+occasion+"», бюджет на одежду "+currency(state.budget)+". "+(state.source?"Заинтересовал образ из фотоленты "+state.source+". ":"")+"Подскажите реальные товары, размеры, цены и наличие. "+(service.length?"Интересуют также отдельные услуги портного: "+service.join(", ")+". ":"")+"Это черновик запроса, а не оформленная бронь.";
$("styleDraft").textContent=text;
$("copyStyle").addEventListener("click",async()=>{
const value=$("styleDraft").textContent;
try{await navigator.clipboard.writeText(value);$("copyStyle").textContent=t("copied")}catch(e){$("copyStyle").textContent=t("copyFailed");$("styleDraft").setAttribute("tabindex","0");$("styleDraft").focus()}
});
}
window.addEventListener("bitos:compose",e=>{const id=e.detail&&e.detail.lookId;if(id){state.source=id;state.gender=(id==="look1"||id==="look4")?"woman":"man";section()}root.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})});
$("language").addEventListener("click",section);
section()
})();